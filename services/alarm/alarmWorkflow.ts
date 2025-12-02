import { cancelAlarm, computeNextTrigger, scheduleAlarm } from "./alarmService";
import type { AlarmDraft, AlarmItem } from "../../types/alarm.types";
import type { AlarmPolicyMode } from "../../types/alarm.types";
import {
  deleteAlarms as deleteAlarmsRows,
  insertAlarm,
  PersistableAlarm,
  setAlarmEnabled,
  updateAlarm,
} from "./alarmStorage";
import { generateAlarmId } from "./id";
import { syncAlarmGeofence, removeAlarmGeofence } from "../geofencing/alarmGeofencing";

const DEFAULT_POLICY_MODE: AlarmPolicyMode = "normal";

type AlarmBuildOptions = {
  nextTriggerAtOverride?: number | null;
};

const toPersistable = (alarm: AlarmItem): PersistableAlarm => ({
  id: alarm.id,
  label: alarm.label,
  hour: alarm.hour,
  minute: alarm.minute,
  repeatDays: alarm.repeatDays,
  skipHolidays: alarm.skipHolidays,
  sound: alarm.sound,
  vibrate: alarm.vibrate,
  enabled: alarm.enabled,
  alarmSetId: alarm.alarmSetId ?? null,
  ddayId: null,
  policyMode: alarm.policyMode ?? DEFAULT_POLICY_MODE,
  policyPayload: alarm.policyPayload ?? null,
  nextTriggerAt: alarm.nextTriggerAt ?? null,
  categoryId: alarm.categoryId ?? null,
});

const buildAlarmItemFromDraft = (
  draft: AlarmDraft,
  id: string,
  enabled: boolean,
  options?: AlarmBuildOptions,
): AlarmItem => {
  const nextTriggerAt =
    enabled && typeof options?.nextTriggerAtOverride === "number"
      ? options.nextTriggerAtOverride
      : enabled
        ? computeNextTrigger(draft).valueOf()
        : null;

  return {
    id,
    enabled,
    nextTriggerAt,
    hour: draft.hour,
    minute: draft.minute,
    label: draft.label,
    repeatDays: draft.repeatDays,
    skipHolidays: draft.skipHolidays,
    sound: draft.sound,
    vibrate: draft.vibrate,
    policyMode: draft.policyMode ?? DEFAULT_POLICY_MODE,
    policyPayload: draft.policyPayload ?? null,
    alarmSetId: draft.alarmSetId ?? null,
    geofenceLocation: draft.geofenceLocation ?? null,
    categoryId: draft.categoryId ?? null,
  };
};

export const createAlarmFromDraft = async (
  draft: AlarmDraft,
  options?: AlarmBuildOptions,
): Promise<AlarmItem> => {
  const id = draft.id ?? generateAlarmId();
  const alarm = buildAlarmItemFromDraft(draft, id, true, options);

  await insertAlarm(toPersistable(alarm));

  if (alarm.enabled) {
    const nextFireAt = await scheduleAlarm(alarm, alarm.nextTriggerAt ?? undefined);
    alarm.nextTriggerAt = nextFireAt;
  }
  alarm.geofenceLocation = draft.geofenceLocation ?? null;
  await syncAlarmGeofence(alarm.id, alarm.geofenceLocation, alarm.enabled);

  return alarm;
};

export const updateAlarmFromDraft = async (
  existing: AlarmItem,
  draft: AlarmDraft,
  options?: AlarmBuildOptions,
): Promise<AlarmItem> => {
  const updated = buildAlarmItemFromDraft(draft, existing.id, existing.enabled, options);

  await updateAlarm(toPersistable(updated));

  if (existing.enabled) {
    try {
      await cancelAlarm(existing.id);
    } catch (error) {
      console.warn("[AlarmWorkflow] Failed to cancel alarm before update", error);
    }
  }

  if (updated.enabled) {
    const nextFireAt = await scheduleAlarm(updated, updated.nextTriggerAt ?? undefined);
    updated.nextTriggerAt = nextFireAt;
  }
  updated.geofenceLocation = draft.geofenceLocation ?? null;
  await syncAlarmGeofence(updated.id, updated.geofenceLocation, updated.enabled);

  return updated;
};

export const toggleAlarmEnabled = async (
  alarm: AlarmItem,
  enabled: boolean,
): Promise<AlarmItem> => {
  if (enabled) {
    const target: AlarmItem = {
      ...alarm,
      enabled: true,
      nextTriggerAt: computeNextTrigger(alarm).valueOf(),
      alarmSetId: alarm.alarmSetId ?? null,
      categoryId: alarm.categoryId ?? null,
    };

    await setAlarmEnabled(alarm.id, true);
    const nextFireAt = await scheduleAlarm(target, target.nextTriggerAt ?? undefined);
    target.nextTriggerAt = nextFireAt;
    await syncAlarmGeofence(target.id, target.geofenceLocation ?? null, true);
    return target;
  }

  try {
    await cancelAlarm(alarm.id);
  } catch (error) {
    console.warn("[AlarmWorkflow] Failed to cancel alarm during disable", error);
  }

  await setAlarmEnabled(alarm.id, false);
  await syncAlarmGeofence(alarm.id, null, false);

  return {
    ...alarm,
    enabled: false,
    nextTriggerAt: null,
    alarmSetId: alarm.alarmSetId ?? null,
    categoryId: alarm.categoryId ?? null,
  };
};

export const deleteAlarm = async (alarm: AlarmItem): Promise<void> => {
  await deleteAlarms([alarm]);
};

export const deleteAlarms = async (alarms: AlarmItem[]): Promise<void> => {
  if (alarms.length === 0) {
    return;
  }

  const uniqueAlarms = Array.from(new Map(alarms.map(alarm => [alarm.id, alarm])).values());

  await Promise.all(
    uniqueAlarms.map(async alarm => {
      try {
        await cancelAlarm(alarm.id);
      } catch (error) {
        console.warn("[AlarmWorkflow] Failed to cancel alarm before delete", error);
      }
      await removeAlarmGeofence(alarm.id);
    }),
  );

  await deleteAlarmsRows(uniqueAlarms.map(alarm => alarm.id));
};
