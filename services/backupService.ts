import { Platform } from "react-native";

import { supabase } from "./supabaseClient";
import { localDatabase } from "./db/localDatabase";
import type { Json } from "../types/generated/supabase";
import { decodeWeekdays } from "../utils/repeatMask";
import type { AlarmRepeatDay } from "../types/alarm.types";
import type { DDayEntity } from "../types/generated/roomEntities";

type DatabaseSnapshot = Awaited<ReturnType<typeof localDatabase.fetchSnapshot>>;
type CategorySnapshot = Awaited<ReturnType<typeof localDatabase.fetchCategories>>;

const BACKUP_TABLE = "device_backups";
const BACKUP_VERSION = 1;

type DeviceBackupInsert = {
  owner_id: string;
  exported_at: string;
  snapshot_json: Json;
  categories_json: Json;
  counts_json: Json;
  platform: string;
  version: number;
};

type DeviceBackupRow = DeviceBackupInsert & {
  id: string;
  created_at: string | null;
  updated_at: string | null;
};

type BackupRecord = {
  exportedAt: string;
  platform: typeof Platform.OS;
  version: number;
  snapshot: DatabaseSnapshot;
  categories: CategorySnapshot;
  counts: Record<string, number>;
};

export type BackupResult = {
  exportedAt: string;
  snapshotCounts: Record<string, number>;
};

export type RestoreResult = {
  restoredAt: string;
  snapshotCounts: Record<string, number>;
};

const ensureSupabase = () => {
  if (!supabase) {
    throw new Error("[Backup] Supabase가 설정되지 않아 백업을 진행할 수 없습니다.");
  }
  return supabase;
};

const summarizeSnapshot = (snapshot: DatabaseSnapshot, categories: CategorySnapshot): Record<string, number> => {
  const baseEntries = Object.entries(snapshot).map(([key, value]) => [key, Array.isArray(value) ? value.length : 0]);
  baseEntries.push(["Category", categories.length]);
  return Object.fromEntries(baseEntries);
};

const toJson = (value: unknown): Json => value as Json;

const parseBackupRow = (row: DeviceBackupRow): BackupRecord => {
  const snapshot = row.snapshot_json as DatabaseSnapshot | null;
  const categories = row.categories_json as CategorySnapshot | null;
  const counts = row.counts_json as Record<string, number> | null;
  return {
    exportedAt: row.exported_at,
    platform: (row.platform as typeof Platform.OS) ?? Platform.OS,
    version: row.version ?? BACKUP_VERSION,
    snapshot: snapshot ?? ({} as DatabaseSnapshot),
    categories: categories ?? ([] as CategorySnapshot),
    counts: counts ?? {},
  };
};

export const backupService = {
  backupNow: async ({ ownerId }: { ownerId: string }): Promise<BackupResult> => {
    if (!ownerId) {
      throw new Error("[Backup] 로그인 정보가 없어 백업을 수행할 수 없습니다.");
    }
    const client = ensureSupabase();
    const [snapshot, categories] = await Promise.all([
      localDatabase.fetchSnapshot(),
      localDatabase.fetchCategories(),
    ]);
    const exportedAt = new Date().toISOString();
    const snapshotCounts = summarizeSnapshot(snapshot, categories);

    const payload: DeviceBackupInsert = {
      owner_id: ownerId,
      exported_at: exportedAt,
      snapshot_json: toJson(snapshot),
      categories_json: toJson(categories),
      counts_json: toJson(snapshotCounts),
      platform: Platform.OS,
      version: BACKUP_VERSION,
    };

    const { error } = await client.from(BACKUP_TABLE).upsert(payload, { onConflict: "owner_id" });
    if (error) {
      throw new Error(`[Backup] 백업을 저장하지 못했습니다: ${error.message}`);
    }

    return {
      exportedAt,
      snapshotCounts,
    };
  },
  restoreLatest: async ({ ownerId }: { ownerId: string }): Promise<RestoreResult> => {
    if (!ownerId) {
      throw new Error("[Backup] 로그인 정보가 없어 백업을 복원할 수 없습니다.");
    }
    const client = ensureSupabase();
    const { data, error } = await client.from(BACKUP_TABLE).select("*").eq("owner_id", ownerId).maybeSingle();
    if (error) {
      throw new Error(`[Backup] 백업 정보를 불러오지 못했습니다: ${error.message}`);
    }
    if (!data) {
      throw new Error("[Backup] 저장된 백업이 없습니다. 먼저 백업을 생성해 주세요.");
    }
    const record = parseBackupRow(data);
    await applySnapshotToLocalDatabase(record);
    return {
      restoredAt: record.exportedAt,
      snapshotCounts: record.counts,
    };
  },
};

const applySnapshotToLocalDatabase = async (record: BackupRecord): Promise<void> => {
  const snapshot = record.snapshot ?? ({} as DatabaseSnapshot);
  await localDatabase.clearAllTables();
  const categoryMap = await restoreCategories(record.categories ?? []);
  const ddayLookup = buildDdayLookup(snapshot.Dday ?? []);
  await restoreAlarmSets(snapshot.AlarmSet ?? []);
  await restoreAlarms(snapshot.Alarm ?? [], { categoryMap });
  await restoreTodos(snapshot.Todo ?? [], { categoryMap, ddayLookup });
  await restoreTodoAlarmRelations(snapshot.TodoAlarmRelation ?? []);
  await restoreAlarmSetTemplates(snapshot.AlarmSetTemplate ?? [], snapshot.AlarmTemplate ?? []);
  await restoreGeoFenceZones(snapshot.GeoFenceZone ?? []);
};

const restoreCategories = async (categories: CategorySnapshot): Promise<Map<number, number>> => {
  const map = new Map<number, number>();
  const sorted = [...categories].sort((a, b) => {
    const aId = typeof a.id === "number" ? a.id : 0;
    const bId = typeof b.id === "number" ? b.id : 0;
    return aId - bId;
  });
  for (const category of sorted) {
    if (!category) continue;
    const name =
      typeof category.name === "string" && category.name.trim().length > 0
        ? category.name
        : "카테고리";
    const color = typeof category.color === "string" ? category.color : "#3B82F6";
    const created = await localDatabase.createCategory(name, color);
    if (typeof category.id === "number" && typeof created.id === "number") {
      map.set(category.id, created.id);
    }
  }
  return map;
};

const buildDdayLookup = (ddays: DatabaseSnapshot["Dday"]): Map<number, DDayEntity> => {
  const map = new Map<number, DDayEntity>();
  ddays.forEach(dday => {
    if (dday && typeof dday.todo_id === "number") {
      map.set(dday.todo_id, dday);
    }
  });
  return map;
};

const restoreAlarmSets = async (alarmSets: DatabaseSnapshot["AlarmSet"]) => {
  for (const set of alarmSets) {
    if (!set?.id) continue;
    await localDatabase.upsertAlarmSet({
      id: set.id,
      label: set.label ?? "",
      defaultSound: set.default_sound ?? "",
      defaultMode: set.default_mode ?? "normal",
    });
  }
};

const normalizePolicyMode = (value: unknown) => {
  if (value === "math" || value === "shake" || value === "puzzle" || value === "normal") {
    return value;
  }
  return "normal";
};

const remapCategoryId = (categoryId: number | null | undefined, map: Map<number, number>): number | null => {
  if (typeof categoryId !== "number") {
    return null;
  }
  return map.get(categoryId) ?? null;
};

const restoreAlarms = async (
  alarms: DatabaseSnapshot["Alarm"],
  helpers: { categoryMap: Map<number, number> },
) => {
  for (const alarm of alarms) {
    if (!alarm?.id) continue;
    const repeatDays = decodeWeekdays(Number(alarm.repeat_days) || 0) as AlarmRepeatDay[];
    await localDatabase.insertAlarm({
      id: alarm.id,
      label: alarm.label ?? "",
      hour: Number(alarm.hour) || 0,
      minute: Number(alarm.minute) || 0,
      repeatDays,
      skipHolidays: Boolean(alarm.skip_holidays),
      sound: alarm.sound ?? "",
      vibrate: Boolean(alarm.vibrate),
      enabled: Boolean(alarm.enabled),
      alarmSetId: alarm.alarm_set_id ?? null,
      ddayId: typeof alarm.dday_id === "number" ? alarm.dday_id : null,
      policyMode: normalizePolicyMode(alarm.policy_mode) ?? "normal",
      policyPayload: alarm.policy_payload ?? null,
      nextTriggerAt: typeof alarm.next_trigger_at === "number" ? alarm.next_trigger_at : null,
      categoryId: remapCategoryId(alarm.category_id, helpers.categoryMap),
    });
  }
};

const normalizeRepeatType = (value: unknown): "weekly" | "monthly" | null => {
  if (value === "weekly" || value === "monthly") {
    return value;
  }
  return null;
};

const restoreTodos = async (
  todos: DatabaseSnapshot["Todo"],
  helpers: { categoryMap: Map<number, number>; ddayLookup: Map<number, DDayEntity> },
) => {
  for (const todo of todos) {
    if (typeof todo?.id !== "number") continue;
    const repeatWeekdays = decodeWeekdays(Number(todo.repeat_weekday) || 0);
    const dday = helpers.ddayLookup.get(todo.id);
    const isDDay = Boolean(dday);
    await localDatabase.upsertTodo({
      id: todo.id,
      title: todo.title ?? "",
      dueDate: todo.due_date ?? null,
      dueTime: todo.due_time ?? null,
      isRepeating: Boolean(todo.is_repeating),
      repeatType: normalizeRepeatType(todo.repeat_type),
      repeatWeekdays,
      repeatDayOfMonth: typeof todo.repeat_day_of_month === "number" ? todo.repeat_day_of_month : null,
      alarmId: todo.alarm_id ?? null,
      alarmSetId: todo.alarm_set_id ?? null,
      ddayId: isDDay ? dday?.id ?? null : null,
      isDDay,
      categoryId: remapCategoryId(todo.category_id, helpers.categoryMap),
    });
  }
};

const restoreTodoAlarmRelations = async (relations: DatabaseSnapshot["TodoAlarmRelation"]) => {
  const relationMap = new Map<number, DatabaseSnapshot["TodoAlarmRelation"][number][]>();
  relations.forEach(relation => {
    if (!relation || typeof relation.todo_id !== "number") {
      return;
    }
    if (!relationMap.has(relation.todo_id)) {
      relationMap.set(relation.todo_id, []);
    }
    relationMap.get(relation.todo_id)?.push(relation);
  });

  for (const [todoId, items] of relationMap.entries()) {
    if (!Number.isFinite(todoId)) continue;
    const payload = items
      .filter(relation => typeof relation.alarm_id === "string")
      .map(relation => ({
        alarmId: relation.alarm_id as string,
        offsetMinutes: relation.offset_minutes,
        orderIndex: relation.order_index,
      }));
    if (payload.length === 0) continue;
    await localDatabase.replaceTodoAlarmRelations(todoId, payload);
  }
};

const restoreAlarmSetTemplates = async (
  templates: DatabaseSnapshot["AlarmSetTemplate"],
  entries: DatabaseSnapshot["AlarmTemplate"],
) => {
  const entryMap = new Map<string, DatabaseSnapshot["AlarmTemplate"][number][]>();
  entries.forEach(entry => {
    if (!entry?.template_id) return;
    if (!entryMap.has(entry.template_id)) {
      entryMap.set(entry.template_id, []);
    }
    entryMap.get(entry.template_id)?.push(entry);
  });

  for (const template of templates) {
    if (!template?.id) continue;
    const entryPayloads = (entryMap.get(template.id) ?? []).map(entry => ({
      label: entry.label ?? "",
      offsetMinutes: entry.offset_minutes,
      repeatDays: decodeWeekdays(Number(entry.repeat_days) || 0),
      skipHolidays: Boolean(entry.skip_holidays),
      sound: entry.sound ?? "",
      vibrate: Boolean(entry.vibrate),
      policyMode: entry.policy_mode ?? undefined,
      policyPayload: entry.policy_payload ?? undefined,
    }));
    await localDatabase.createAlarmSetTemplate(
      {
        id: template.id,
        label: template.label ?? "",
        defaultSound: template.default_sound ?? "",
        defaultMode: template.default_mode ?? "normal",
        createdAt: template.created_at ?? undefined,
      },
      entryPayloads,
    );
  }
};

const restoreGeoFenceZones = async (zones: DatabaseSnapshot["GeoFenceZone"]) => {
  for (const zone of zones) {
    if (!zone?.alarm_id || zone.is_active === false) continue;
    const latitude = Number(zone.latitude);
    const longitude = Number(zone.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    await localDatabase.setAlarmGeofenceZone(zone.alarm_id, {
      latitude,
      longitude,
      radius: Math.max(1, Math.round(Number(zone.radius) || 0)),
      placeName: zone.name ?? undefined,
    });
  }
};
