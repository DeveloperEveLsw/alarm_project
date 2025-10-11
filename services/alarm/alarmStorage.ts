import { computeNextTrigger } from "./alarmService";
import type {
  AlarmItem,
  AlarmPolicyMode,
  AlarmPolicyPayload,
  AlarmRepeatDay,
} from "../../types/alarm.types";
import { DBManager } from "../db/db";

const DEFAULT_POLICY_MODE: AlarmPolicyMode = "normal";

const parseRepeatDays = (value: unknown): AlarmRepeatDay[] => {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(item => Number(item))
      .filter(item => Number.isInteger(item) && item >= 0 && item <= 6) as AlarmRepeatDay[];
  } catch (error) {
    console.warn("[AlarmStorage] Failed to parse repeat_days", value, error);
    return [];
  }
};

const parsePolicyMode = (value: unknown): AlarmPolicyMode => {
  if (value === "math" || value === "shake" || value === "normal") {
    return value;
  }
  return DEFAULT_POLICY_MODE;
};

const parsePolicyPayload = (value: unknown): AlarmPolicyPayload => {
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch (error) {
    console.warn("[AlarmStorage] Failed to parse policy_payload", error);
    return null;
  }
};

type AlarmRow = Record<string, any>;

const readNextTriggerAt = (row: AlarmRow): number | null => {
  if (row.next_trigger_at === null || row.next_trigger_at === undefined) {
    return null;
  }
  const value = Number(row.next_trigger_at);
  if (!Number.isFinite(value)) {
    return null;
  }
  if (value <= Date.now()) {
    return null;
  }
  return value;
};

const mapRowToAlarm = (row: AlarmRow): AlarmItem => {
  const repeatDays = parseRepeatDays(row.repeat_days);
  const base = {
    hour: Number(row.hour) || 0,
    minute: Number(row.minute) || 0,
    label: typeof row.label === "string" ? row.label : "",
    repeatDays,
    skipHolidays: Number(row.skip_holidays) === 1,
    sound: typeof row.sound === "string" ? row.sound : "",
    vibrate: Number(row.vibrate) !== 0,
    policyMode: parsePolicyMode(row.policy_mode),
    policyPayload: parsePolicyPayload(row.policy_payload),
  } as const;

  const enabled = Number(row.enabled) === 1;
  const nextTriggerAt = enabled ? readNextTriggerAt(row) ?? computeNextTrigger(base).valueOf() : null;

  return {
    id: String(row.id),
    enabled,
    nextTriggerAt,
    ...base,
  };
};

export const fetchAlarms = async (): Promise<AlarmItem[]> => {
  await DBManager.initializeTables();
  const db = await DBManager.getDB();
  const [result] = await db.executeSql(
    `SELECT * FROM Alarm ORDER BY hour ASC, minute ASC, id ASC;`,
  );

  const items: AlarmItem[] = [];
  for (let index = 0; index < result.rows.length; index += 1) {
    items.push(mapRowToAlarm(result.rows.item(index)));
  }

  return items;
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
};

const serializeRepeatDays = (repeatDays: AlarmRepeatDay[]): string =>
  JSON.stringify(repeatDays);

const serializePolicyPayload = (payload: AlarmPolicyPayload): string | null => {
  if (!payload) return null;
  try {
    return JSON.stringify(payload);
  } catch (error) {
    console.warn("[AlarmStorage] Failed to stringify policy payload", error);
    return null;
  }
};

const nextTriggerForPersist = (alarm: PersistableAlarm): number | null => {
  if (!alarm.enabled) {
    return null;
  }
  return computeNextTrigger(alarm).valueOf();
};

export const insertAlarm = async (alarm: PersistableAlarm): Promise<void> => {
  await DBManager.initializeTables();
  const db = await DBManager.getDB();
  await db.executeSql(
    `INSERT INTO Alarm (
      id,
      alarm_set_id,
      dday_id,
      label,
      hour,
      minute,
      repeat_days,
      skip_holidays,
      sound,
      vibrate,
      enabled,
      next_trigger_at,
      policy_mode,
      policy_payload
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      alarm.id,
      alarm.alarmSetId ?? null,
      alarm.ddayId ?? null,
      alarm.label,
      alarm.hour,
      alarm.minute,
      serializeRepeatDays(alarm.repeatDays),
      alarm.skipHolidays ? 1 : 0,
      alarm.sound,
      alarm.vibrate ? 1 : 0,
      alarm.enabled ? 1 : 0,
      nextTriggerForPersist(alarm),
      alarm.policyMode ?? DEFAULT_POLICY_MODE,
      serializePolicyPayload(alarm.policyPayload),
    ],
  );
};

export const updateAlarm = async (alarm: PersistableAlarm): Promise<void> => {
  await DBManager.initializeTables();
  const db = await DBManager.getDB();
  await db.executeSql(
    `UPDATE Alarm SET
      alarm_set_id = ?,
      dday_id = ?,
      label = ?,
      hour = ?,
      minute = ?,
      repeat_days = ?,
      skip_holidays = ?,
      sound = ?,
      vibrate = ?,
      enabled = ?,
      next_trigger_at = ?,
      policy_mode = ?,
      policy_payload = ?
    WHERE id = ?;`,
    [
      alarm.alarmSetId ?? null,
      alarm.ddayId ?? null,
      alarm.label,
      alarm.hour,
      alarm.minute,
      serializeRepeatDays(alarm.repeatDays),
      alarm.skipHolidays ? 1 : 0,
      alarm.sound,
      alarm.vibrate ? 1 : 0,
      alarm.enabled ? 1 : 0,
      nextTriggerForPersist(alarm),
      alarm.policyMode ?? DEFAULT_POLICY_MODE,
      serializePolicyPayload(alarm.policyPayload),
      alarm.id,
    ],
  );
};

export const deleteAlarm = async (id: string): Promise<void> => {
  await DBManager.initializeTables();
  const db = await DBManager.getDB();
  await db.executeSql(`DELETE FROM Alarm WHERE id = ?;`, [id]);
};

export const deleteAlarms = async (ids: string[]): Promise<void> => {
  if (ids.length === 0) {
    return;
  }
  await DBManager.initializeTables();
  const db = await DBManager.getDB();
  const placeholders = ids.map(() => "?").join(", ");
  await db.executeSql(`DELETE FROM Alarm WHERE id IN (${placeholders});`, ids);
};

export const setAlarmEnabled = async (id: string, enabled: boolean): Promise<void> => {
  await DBManager.initializeTables();
  const db = await DBManager.getDB();
  await db.executeSql(
    `UPDATE Alarm SET enabled = ?, next_trigger_at = ${enabled ? "next_trigger_at" : "NULL"} WHERE id = ?;`,
    [enabled ? 1 : 0, id],
  );
};

export const getAlarmById = async (id: string): Promise<AlarmItem | null> => {
  await DBManager.initializeTables();
  const db = await DBManager.getDB();
  const [result] = await db.executeSql(`SELECT * FROM Alarm WHERE id = ? LIMIT 1;`, [id]);
  if (result.rows.length === 0) return null;
  return mapRowToAlarm(result.rows.item(0));
};
