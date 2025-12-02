import { computeNextTrigger } from './alarmService';
import type {
  AlarmItem,
  AlarmPolicyMode,
  AlarmPolicyPayload,
  AlarmRepeatDay,
} from '../../types/alarm.types';
import { localDatabase, type AlarmNative, type AlarmPersistPayload, type GeoFenceZoneEntity } from '../db/localDatabase';
import { decodeWeekdays } from '../../utils/repeatMask';

const DEFAULT_POLICY_MODE: AlarmPolicyMode = 'normal';

const parsePolicyMode = (value: unknown): AlarmPolicyMode => {
  if (value === 'math' || value === 'shake' || value === 'puzzle' || value === 'normal') {
    return value;
  }
  return DEFAULT_POLICY_MODE;
};

const parsePolicyPayload = (value: string | null): AlarmPolicyPayload => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>;
    }
  } catch (error) {
    console.warn('[AlarmStorage] Failed to parse policy_payload', error);
  }
  return null;
};

const mapNativeToAlarm = (row: AlarmNative, zone?: GeoFenceZoneEntity): AlarmItem => {
  const repeatDays = decodeWeekdays(row.repeat_days);
  const base = {
    hour: row.hour,
    minute: row.minute,
    label: row.label,
    repeatDays: repeatDays as AlarmRepeatDay[],
    skipHolidays: row.skip_holidays,
    sound: row.sound,
    vibrate: row.vibrate,
    policyMode: parsePolicyMode(row.policy_mode),
    policyPayload: parsePolicyPayload(row.policy_payload),
  } as const;

  const enabled = row.enabled;
  const nextTriggerAt = enabled
    ? row.next_trigger_at ?? computeNextTrigger(base).valueOf()
    : null;

  const alarm: AlarmItem = {
    id: row.id,
    enabled,
    nextTriggerAt,
    alarmSetId: row.alarm_set_id ?? null,
    ...base,
  };
  if (zone) {
    alarm.geofenceLocation = {
      latitude: zone.latitude,
      longitude: zone.longitude,
      radius: zone.radius,
      placeName: zone.name ?? undefined,
      address: zone.name ?? undefined,
    };
  } else {
    alarm.geofenceLocation = null;
  }

  return alarm;
};

const serializePolicyPayload = (payload: AlarmPolicyPayload): string | null => {
  if (!payload) return null;
  try {
    return JSON.stringify(payload);
  } catch (error) {
    console.warn('[AlarmStorage] Failed to stringify policy payload', error);
    return null;
  }
};

const nextTriggerForPersist = (alarm: PersistableAlarm): number | null => {
  if (!alarm.enabled) {
    return null;
  }
  if (typeof alarm.nextTriggerAt === 'number') {
    return alarm.nextTriggerAt;
  }
  return computeNextTrigger({
    hour: alarm.hour,
    minute: alarm.minute,
    label: alarm.label,
    repeatDays: alarm.repeatDays,
    skipHolidays: alarm.skipHolidays,
    sound: alarm.sound,
    vibrate: alarm.vibrate,
    policyMode: alarm.policyMode ?? DEFAULT_POLICY_MODE,
    policyPayload: alarm.policyPayload ?? null,
  }).valueOf();
};

export const fetchAlarms = async (): Promise<AlarmItem[]> => {
  const [rows, zones] = await Promise.all([
    localDatabase.fetchAlarms(),
    localDatabase.fetchGeoFenceZones(),
  ]);
  const zoneMap = new Map<string, GeoFenceZoneEntity>();
  zones.forEach(zone => {
    if (zone.alarm_id) {
      zoneMap.set(zone.alarm_id, zone);
    }
  });
  return rows.map(row => mapNativeToAlarm(row, zoneMap.get(row.id)));
};

export type PersistableAlarm = {
  id: string;
  label: string;
  hour: number;
  minute: number;
  repeatDays: AlarmRepeatDay[];
  skipHolidays: boolean;
  sound: string;
  vibrate: boolean;
  enabled: boolean;
  alarmSetId?: string | null;
  ddayId?: number | null;
  policyMode?: AlarmPolicyMode;
  policyPayload?: AlarmPolicyPayload;
  nextTriggerAt?: number | null;
};

const toPersistPayload = (alarm: PersistableAlarm): AlarmPersistPayload => ({
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
  ddayId: alarm.ddayId ?? null,
  policyMode: alarm.policyMode ?? DEFAULT_POLICY_MODE,
  policyPayload: serializePolicyPayload(alarm.policyPayload ?? null),
  nextTriggerAt: nextTriggerForPersist(alarm),
});

export const insertAlarm = async (alarm: PersistableAlarm): Promise<void> => {
  const payload = toPersistPayload(alarm);
  await localDatabase.insertAlarm(payload);
};

export const updateAlarm = async (alarm: PersistableAlarm): Promise<void> => {
  const payload = toPersistPayload(alarm);
  await localDatabase.updateAlarm(payload);
};

export const deleteAlarm = async (id: string): Promise<void> => {
  await localDatabase.deleteAlarm(id);
};

export const deleteAlarms = async (ids: string[]): Promise<void> => {
  if (ids.length === 0) {
    return;
  }
  await localDatabase.deleteAlarms(ids);
};

export const setAlarmEnabled = async (id: string, enabled: boolean): Promise<void> => {
  await localDatabase.setAlarmEnabled(id, enabled);
};

export const getAlarmById = async (id: string): Promise<AlarmItem | null> => {
  const row = await localDatabase.getAlarmById(id);
  if (!row) return null;
  return mapNativeToAlarm(row);
};
