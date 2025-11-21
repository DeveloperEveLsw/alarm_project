import dayjs from 'dayjs';

import type {
  ScheduleTodo,
  ScheduleTodoAlarmRelation,
  ScheduleTodoFormData,
} from '../types/todo.types';
import type { AlarmDraft, AlarmItem, AlarmPolicyMode, AlarmRepeatDay } from '../types/alarm.types';
import { todoService } from './todoService';
import {
  createAlarmFromDraft,
  deleteAlarm as deleteAlarmWorkflow,
  updateAlarmFromDraft,
} from './alarm/alarmWorkflow';
import {
  deleteAlarm as deleteAlarmStorage,
  getAlarmById,
} from './alarm/alarmStorage';
import { localDatabase } from './db/localDatabase';
import { decodeWeekdays } from '../utils/repeatMask';

const DEFAULT_SOUND = 'Arcade';
const DEFAULT_POLICY_MODE: AlarmPolicyMode = 'normal';
const MAX_OFFSET_MINUTES = 1440;

type AlarmTemplateEntry = {
  label: string;
  offsetMinutes: number;
  repeatDays: AlarmRepeatDay[];
  skipHolidays: boolean;
  sound: string;
  vibrate: boolean;
  policyMode: AlarmPolicyMode;
  policyPayload: Record<string, unknown> | null;
};

const parsePolicyPayload = (raw: string | null): Record<string, unknown> | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>;
    }
  } catch (error) {
    console.warn('[ScheduleAlarm] Failed to parse template policy payload', error);
  }
  return null;
};

type SyncArgs = {
  todo: ScheduleTodo;
  formData: ScheduleTodoFormData;
};

const normalizeOffsets = (offsets: number[]): number[] => {
  const bucket = new Set<number>();
  offsets.forEach(offset => {
    if (!Number.isFinite(offset)) return;
    const clamped = Math.min(MAX_OFFSET_MINUTES, Math.max(0, Math.round(offset)));
    bucket.add(clamped);
  });
  return Array.from(bucket).sort((a, b) => a - b);
};

const buildAlarmDraft = (
  todo: ScheduleTodo,
  fireMoment: dayjs.Dayjs,
  existing?: AlarmItem | null,
): AlarmDraft => {
  const weeklyRepeatDays =
    todo.isRepeating && todo.repeatType === 'weekly'
      ? todo.repeatWeekdays.filter(
          day => Number.isInteger(day) && day >= 0 && day <= 6,
        )
      : [];

  const repeatDays = weeklyRepeatDays.length
    ? (weeklyRepeatDays as AlarmRepeatDay[])
    : existing?.repeatDays ?? [];

  return {
    id: existing?.id,
    label: todo.title || existing?.label || '일정 알람',
    hour: fireMoment.hour(),
    minute: fireMoment.minute(),
    repeatDays,
    skipHolidays: existing?.skipHolidays ?? false,
    sound: existing?.sound ?? DEFAULT_SOUND,
    vibrate: existing?.vibrate ?? true,
    policyMode: existing?.policyMode ?? 'normal',
    policyPayload: existing?.policyPayload ?? null,
  };
};

const removeStaleAlarms = async (relations: ScheduleTodoAlarmRelation[]): Promise<void> => {
  await Promise.all(
    relations.map(async relation => {
      const alarm = await getAlarmById(relation.alarmId);
      if (alarm) {
        await deleteAlarmWorkflow(alarm);
      } else {
        await deleteAlarmStorage(relation.alarmId);
      }
    }),
  );
};

export const syncTodoAlarms = async ({ todo, formData }: SyncArgs): Promise<ScheduleTodo> => {
  if (!todo.id) {
    return { ...todo, alarmRelations: [] };
  }

  let templateEntries: AlarmTemplateEntry[] | null = null;
  let desiredOffsets = formData.isAlarmEnabled ? normalizeOffsets(formData.alarmOffsets) : [];
  const existingRelations = await todoService.getTodoAlarmRelations(todo.id);

  if (
    formData.isAlarmEnabled &&
    desiredOffsets.length === 0 &&
    formData.alarmTemplateId
  ) {
    const rows = await localDatabase.fetchAlarmTemplates(formData.alarmTemplateId);
    if (rows.length > 0) {
      templateEntries = rows
        .map(entry => ({
          label: entry.label ?? '',
          offsetMinutes: entry.offset_minutes,
          repeatDays: decodeWeekdays(entry.repeat_days) as AlarmRepeatDay[],
          skipHolidays: entry.skip_holidays,
          sound: entry.sound,
          vibrate: entry.vibrate,
          policyMode: (entry.policy_mode ?? DEFAULT_POLICY_MODE) as AlarmPolicyMode,
          policyPayload: parsePolicyPayload(entry.policy_payload),
        }))
        .sort((a, b) => a.offsetMinutes - b.offsetMinutes);

      desiredOffsets = templateEntries.map(entry => entry.offsetMinutes);
    }
  }

  if (!todo.dueDate || !todo.dueTime || desiredOffsets.length === 0) {
    if (existingRelations.length > 0) {
      await removeStaleAlarms(existingRelations);
      await todoService.replaceTodoAlarmRelations(todo.id, []);
    }
    return {
      ...todo,
      alarmRelations: [],
      alarmId: null,
    };
  }

  const eventMoment = dayjs(`${todo.dueDate} ${todo.dueTime}`, 'YYYY-MM-DD HH:mm');
  if (!eventMoment.isValid()) {
    console.warn('[ScheduleAlarm] Invalid event datetime:', todo.dueDate, todo.dueTime);
    return { ...todo, alarmRelations: existingRelations };
  }

  const existingByOffset = new Map<number, ScheduleTodoAlarmRelation[]>();
  existingRelations.forEach(relation => {
    const list = existingByOffset.get(relation.offsetMinutes);
    if (list) {
      list.push(relation);
    } else {
      existingByOffset.set(relation.offsetMinutes, [relation]);
    }
  });
  const handledAlarmIds = new Set<string>();
  const relationPayload: Array<{ alarmId: string; offsetMinutes: number; orderIndex: number }> = [];

  for (const [index, offset] of desiredOffsets.entries()) {
    const targetMoment = eventMoment.subtract(offset, 'minute');
    if (!targetMoment.isValid()) {
      console.warn('[ScheduleAlarm] Skip invalid target moment', offset);
      continue;
    }
    if (targetMoment.isBefore(dayjs())) {
      console.warn('[ScheduleAlarm] Target moment is in the past, skipping alarm sync', {
        offset,
        target: targetMoment.toISOString(),
      });
      continue;
    }

    const relationList = existingByOffset.get(offset) ?? [];
    const relation = relationList.length > index ? relationList[index] : relationList[0];
    const existingAlarm = relation ? await getAlarmById(relation.alarmId) : null;
    let alarm: AlarmItem | null = null;

    const templateEntry = templateEntries?.[index] ?? null;
    const draft: AlarmDraft = {
      id: existingAlarm?.id,
      label: templateEntry?.label?.trim() ? templateEntry.label : todo.title,
      hour: targetMoment.hour(),
      minute: targetMoment.minute(),
      repeatDays:
        templateEntry?.repeatDays ??
        (todo.isRepeating && Array.isArray(todo.repeatWeekdays)
          ? (todo.repeatWeekdays as AlarmRepeatDay[])
          : []),
      skipHolidays: templateEntry?.skipHolidays ?? existingAlarm?.skipHolidays ?? false,
      sound: templateEntry?.sound ?? existingAlarm?.sound ?? DEFAULT_SOUND,
      vibrate: templateEntry?.vibrate ?? existingAlarm?.vibrate ?? true,
      policyMode: templateEntry?.policyMode ?? existingAlarm?.policyMode ?? DEFAULT_POLICY_MODE,
      policyPayload: templateEntry?.policyPayload ?? existingAlarm?.policyPayload ?? null,
      alarmSetId: formData.alarmTemplateId ?? existingAlarm?.alarmSetId ?? null,
    };

    if (existingAlarm) {
      alarm = await updateAlarmFromDraft(existingAlarm, draft, {
        nextTriggerAtOverride: targetMoment.valueOf(),
      });
    } else {
      alarm = await createAlarmFromDraft(draft, {
        nextTriggerAtOverride: targetMoment.valueOf(),
      });
    }

    if (!alarm) {
      continue;
    }

    handledAlarmIds.add(alarm.id);
    relationPayload.push({
      alarmId: alarm.id,
      offsetMinutes: offset,
      orderIndex: index,
    });
  }

  const staleRelations = existingRelations.filter(
    relation => !handledAlarmIds.has(relation.alarmId),
  );
  if (staleRelations.length > 0) {
    await removeStaleAlarms(staleRelations);
  }

  await todoService.replaceTodoAlarmRelations(todo.id, relationPayload);

  const updatedRelations = await todoService.getTodoAlarmRelations(todo.id);

  return {
    ...todo,
    alarmRelations: updatedRelations,
    alarmId: updatedRelations[0]?.alarmId ?? null,
  };
};
