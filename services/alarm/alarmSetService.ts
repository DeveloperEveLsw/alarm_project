import dayjs from 'dayjs';

import { generateAlarmSetId } from './id';
import type { AlarmDraft, AlarmItem, AlarmPolicyMode, AlarmRepeatDay } from '../../types/alarm.types';
import { localDatabase } from '../db/localDatabase';
import { createAlarmFromDraft } from './alarmWorkflow';
import { decodeWeekdays } from '../../utils/repeatMask';

export type AlarmTemplateDefinition = {
  id: string;
  label: string;
  defaultSound: string;
  defaultMode: AlarmPolicyMode;
};

export type AlarmSetTemplateSummary = AlarmTemplateDefinition & {
  createdAt: string | null;
};

export type AlarmTemplateEntryDetail = {
  id: number | null;
  templateId: string;
  label: string;
  offsetMinutes: number;
  repeatDays: AlarmRepeatDay[];
  skipHolidays: boolean;
  sound: string;
  vibrate: boolean;
  policyMode: AlarmPolicyMode;
  policyPayload: Record<string, unknown> | null;
};

const DEFAULT_MODE: AlarmPolicyMode = 'normal';

const normalizeMode = (value: string | null | undefined): AlarmPolicyMode => {
  if (value === 'math' || value === 'shake' || value === 'puzzle' || value === 'normal') {
    return value;
  }
  return DEFAULT_MODE;
};

const deriveDefaults = (alarms: AlarmItem[]): { sound: string; mode: AlarmPolicyMode } => {
  if (alarms.length === 0) {
    return { sound: 'Arcade', mode: DEFAULT_MODE };
  }
  const [first] = alarms;
  return {
    sound: first.sound,
    mode: normalizeMode(first.policyMode ?? null),
  };
};

const normalizeOffsets = (alarms: AlarmItem[]): Array<{ alarm: AlarmItem; offset: number }> => {
  if (alarms.length === 0) {
    return [];
  }
  const minutes = alarms.map(alarm => ({ alarm, minuteOfDay: alarm.hour * 60 + alarm.minute }));
  const base = Math.min(...minutes.map(entry => entry.minuteOfDay));
  return minutes
    .map(entry => ({ alarm: entry.alarm, offset: entry.minuteOfDay - base }))
    .sort((a, b) => a.offset - b.offset);
};

const normalizeRepeatDays = (days: number[]): number[] =>
  Array.from(new Set(days.filter(day => day >= 0 && day <= 6))).sort((a, b) => a - b);

const serializePolicyPayload = (payload: AlarmItem['policyPayload']): string | null => {
  if (!payload) return null;
  try {
    return JSON.stringify(payload);
  } catch (error) {
    console.warn('[AlarmTemplate] Failed to stringify policy payload', error);
    return null;
  }
};

export const createAlarmTemplateFromAlarms = async (
  label: string,
  alarms: AlarmItem[],
): Promise<AlarmTemplateDefinition> => {
  if (alarms.length === 0) {
    throw new Error('No alarms provided to create a template.');
  }

  const trimmedLabel = label.trim();
  if (!trimmedLabel) {
    throw new Error('알람 세트 이름을 입력해 주세요.');
  }

  const setId = generateAlarmSetId();
  const { sound, mode } = deriveDefaults(alarms);
  const offsets = normalizeOffsets(alarms);

  const entries = offsets.map(({ alarm, offset }) => ({
    label: alarm.label ?? '',
    offsetMinutes: offset,
    repeatDays: normalizeRepeatDays(alarm.repeatDays),
    skipHolidays: alarm.skipHolidays,
    sound: alarm.sound,
    vibrate: alarm.vibrate,
    policyMode: normalizeMode(alarm.policyMode ?? null),
    policyPayload: serializePolicyPayload(alarm.policyPayload ?? null),
  }));

  await localDatabase.createAlarmSetTemplate(
    {
      id: setId,
      label: trimmedLabel,
      defaultSound: sound,
      defaultMode: mode,
      createdAt: dayjs().toISOString(),
    },
    entries,
  );

  return {
    id: setId,
    label: trimmedLabel,
    defaultSound: sound,
    defaultMode: mode,
  };
};

export const getAlarmSetTemplates = async (): Promise<AlarmSetTemplateSummary[]> => {
  const rows = await localDatabase.fetchAlarmSetTemplates();
  return rows.map(row => ({
    id: row.id,
    label: row.label,
    defaultSound: row.default_sound,
    defaultMode: normalizeMode(row.default_mode),
    createdAt: row.created_at ?? null,
  }));
};

const parsePolicyPayload = (raw: string | null): Record<string, unknown> | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>;
    }
  } catch (error) {
    console.warn('[AlarmTemplate] Failed to parse policy payload', error);
  }
  return null;
};

export const getAlarmTemplateEntries = async (
  templateId: string,
): Promise<AlarmTemplateEntryDetail[]> => {
  const rows = await localDatabase.fetchAlarmTemplates(templateId);
  return rows.map(row => {
    const repeatDays = normalizeRepeatDays(decodeWeekdays(row.repeat_days)) as AlarmRepeatDay[];
    return {
      id: row.id ?? null,
      templateId: row.template_id,
      label: row.label ?? '',
      offsetMinutes: row.offset_minutes,
      repeatDays,
      skipHolidays: row.skip_holidays,
      sound: row.sound,
      vibrate: row.vibrate,
      policyMode: normalizeMode(row.policy_mode),
      policyPayload: parsePolicyPayload(row.policy_payload),
    };
  });
};

export const deleteAlarmTemplate = async (templateId: string): Promise<void> => {
  await localDatabase.deleteAlarmTemplate(templateId);
};

export const applyAlarmTemplate = async ({
  templateId,
  baseHour,
  baseMinute,
}: {
  templateId: string;
  baseHour: number;
  baseMinute: number;
}): Promise<AlarmItem[]> => {
  const [templates, entries] = await Promise.all([
    localDatabase.fetchAlarmSetTemplates(),
    getAlarmTemplateEntries(templateId),
  ]);

  const templateRow = templates.find(row => row.id === templateId);
  if (!templateRow) {
    throw new Error('선택한 템플릿을 찾을 수 없습니다.');
  }

  if (entries.length === 0) {
    throw new Error('템플릿에 저장된 알람이 없습니다.');
  }

  const baseMoment = dayjs()
    .hour(baseHour)
    .minute(baseMinute)
    .second(0)
    .millisecond(0);

  const actualSetId = generateAlarmSetId();
  await localDatabase.upsertAlarmSet({
    id: actualSetId,
    label: templateRow.label,
    defaultSound: templateRow.default_sound,
    defaultMode: templateRow.default_mode,
  });

  const createdAlarms: AlarmItem[] = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    let targetMoment = baseMoment.add(entry.offsetMinutes, 'minute');
    const now = dayjs();
    while (targetMoment.isBefore(now)) {
      targetMoment = targetMoment.add(1, 'day');
    }

    const entryLabel = entry.label.trim().length > 0
      ? entry.label
      : `${templateRow.label} #${index + 1}`;

    const draft: AlarmDraft = {
      label: entryLabel,
      hour: targetMoment.hour(),
      minute: targetMoment.minute(),
      repeatDays: entry.repeatDays as AlarmRepeatDay[],
      skipHolidays: entry.skipHolidays,
      sound: entry.sound || templateRow.default_sound,
      vibrate: entry.vibrate,
      policyMode: entry.policyMode ?? normalizeMode(templateRow.default_mode),
      policyPayload: entry.policyPayload ?? null,
      alarmSetId: actualSetId,
    };

    const alarm = await createAlarmFromDraft(draft, {
      nextTriggerAtOverride: targetMoment.valueOf(),
    });
    createdAlarms.push(alarm);
  }

  return createdAlarms;
};
