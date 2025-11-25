import { NativeModules } from 'react-native';
import type { AlarmRepeatDay } from '../../types/alarm.types';
import type {
  AlarmEntity,
  AlarmSetEntity,
  AlarmSetTemplateEntity,
  AlarmTemplateEntity,
  DdayEntity,
  GeoFenceHistoryEntity,
  GeoFenceZoneEntity,
  TodoAlarmRelationEntity,
  TodoEntity,
} from '../../types/generated/roomEntities';

type TodoNative = TodoEntity;
type AlarmNative = AlarmEntity;
type TodoAlarmRelationNative = TodoAlarmRelationEntity;
type AlarmSetNative = AlarmSetEntity;
type AlarmTemplateNative = AlarmTemplateEntity;
type AlarmSetTemplateNative = AlarmSetTemplateEntity;

type TodoMutationPayload = {
  id?: number | null;
  title: string;
  dueDate: string | null;
  dueTime: string | null;
  isRepeating: boolean;
  repeatType: 'weekly' | 'monthly' | null;
  repeatWeekdays: number[];
  repeatDayOfMonth: number | null;
  alarmId: string | null;
  alarmSetId: string | null;
  ddayId: number | null;
  isDDay: boolean;
};

type TodoAlarmRelationMutationPayload = {
  alarmId: string;
  offsetMinutes: number;
  orderIndex?: number | null;
};

type AlarmSetMutationPayload = {
  id: string;
  label: string;
  defaultSound: string;
  defaultMode?: string;
  createdAt?: string | null;
};

type AlarmTemplateEntryPayload = {
  label?: string | null;
  offsetMinutes: number;
  repeatDays: number[];
  skipHolidays?: boolean;
  sound: string;
  vibrate: boolean;
  policyMode?: string | null;
  policyPayload?: string | null;
};

type AlarmPersistPayload = {
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
  policyMode?: string | null;
  policyPayload?: string | null;
  nextTriggerAt?: number | null;
};

type DatabaseSnapshot = {
  Todo: TodoEntity[];
  Dday: DdayEntity[];
  AlarmSet: AlarmSetEntity[];
  Alarm: AlarmEntity[];
  TodoAlarmRelation: TodoAlarmRelationEntity[];
  AlarmSetTemplate: AlarmSetTemplateEntity[];
  AlarmTemplate: AlarmTemplateEntity[];
  GeoFenceZone: GeoFenceZoneEntity[];
  GeoFenceHistory: GeoFenceHistoryEntity[];
};

type LocalDatabaseModule = {
  ensureInitialized(): Promise<void>;
  fetchSnapshot(): Promise<DatabaseSnapshot>;
  clearAllTables(): Promise<void>;
  fetchTodos(): Promise<TodoEntity[]>;
  fetchTodosForDate(targetDate: string): Promise<TodoEntity[]>;
  upsertTodo(payloadJson: string): Promise<TodoEntity>;
  deleteTodo(id: number): Promise<void>;
  fetchAlarms(): Promise<AlarmEntity[]>;
  insertAlarm(payloadJson: string): Promise<void>;
  updateAlarm(payloadJson: string): Promise<void>;
  deleteAlarm(id: string): Promise<void>;
  deleteAlarms(ids: string[]): Promise<void>;
  setAlarmEnabled(id: string, enabled: boolean): Promise<void>;
  getAlarmById(id: string): Promise<AlarmEntity | null>;
  fetchTodoAlarmRelations(todoId: number): Promise<TodoAlarmRelationEntity[]>;
  replaceTodoAlarmRelations(
    todoId: number,
    payloadJson: string,
  ): Promise<void>;
  upsertAlarmSet(payloadJson: string): Promise<void>;
  assignAlarmsToSet(alarmIds: string[], alarmSetId: string | null): Promise<void>;
  createAlarmSetTemplate(templateJson: string, entriesJson: string): Promise<void>;
  fetchAlarmSetTemplates(): Promise<AlarmSetTemplateEntity[]>;
  fetchAlarmTemplates(templateId: string): Promise<AlarmTemplateEntity[]>;
  deleteAlarmTemplate(templateId: string): Promise<void>;
  setAlarmGeofenceZone(
    alarmId: string,
    latitude: number,
    longitude: number,
    radius: number,
    placeName?: string | null,
  ): Promise<void>;
  removeAlarmGeofenceZone(alarmId: string): Promise<void>;
  fetchGeoFenceZones(): Promise<GeoFenceZoneEntity[]>;
};

const { LocalDatabase } = NativeModules as { LocalDatabase: LocalDatabaseModule | undefined };

if (!LocalDatabase) {
  throw new Error('LocalDatabase native module is not registered.');
}

const stringify = <T,>(payload: T) => JSON.stringify(payload);

export const localDatabase = {
  ensureInitialized: (): Promise<void> => LocalDatabase.ensureInitialized(),
  fetchTodos: (): Promise<TodoEntity[]> => LocalDatabase.fetchTodos(),
  fetchTodosForDate: (targetDate: string): Promise<TodoEntity[]> =>
    LocalDatabase.fetchTodosForDate(targetDate),
  upsertTodo: (payload: TodoMutationPayload): Promise<TodoEntity> =>
    LocalDatabase.upsertTodo(stringify(payload)),
  deleteTodo: (id: number): Promise<void> => LocalDatabase.deleteTodo(id),
  fetchAlarms: (): Promise<AlarmEntity[]> => LocalDatabase.fetchAlarms(),
  insertAlarm: (payload: AlarmPersistPayload): Promise<void> =>
    LocalDatabase.insertAlarm(stringify(payload)),
  updateAlarm: (payload: AlarmPersistPayload): Promise<void> =>
    LocalDatabase.updateAlarm(stringify(payload)),
  deleteAlarm: (id: string): Promise<void> => LocalDatabase.deleteAlarm(id),
  deleteAlarms: (ids: string[]): Promise<void> => LocalDatabase.deleteAlarms(ids),
  setAlarmEnabled: (id: string, enabled: boolean): Promise<void> =>
    LocalDatabase.setAlarmEnabled(id, enabled),
  getAlarmById: (id: string): Promise<AlarmEntity | null> => LocalDatabase.getAlarmById(id),
  fetchTodoAlarmRelations: (todoId: number): Promise<TodoAlarmRelationNative[]> =>
    LocalDatabase.fetchTodoAlarmRelations(todoId),
  replaceTodoAlarmRelations: (
    todoId: number,
    payload: TodoAlarmRelationMutationPayload[],
  ): Promise<void> => LocalDatabase.replaceTodoAlarmRelations(todoId, stringify(payload)),
  upsertAlarmSet: (payload: AlarmSetMutationPayload): Promise<void> =>
    LocalDatabase.upsertAlarmSet(stringify(payload)),
  assignAlarmsToSet: (alarmIds: string[], alarmSetId: string | null): Promise<void> =>
    LocalDatabase.assignAlarmsToSet(alarmIds, alarmSetId),
  createAlarmSetTemplate: (
    template: AlarmSetMutationPayload,
    entries: AlarmTemplateEntryPayload[],
  ): Promise<void> =>
    LocalDatabase.createAlarmSetTemplate(stringify(template), stringify(entries)),
  fetchAlarmSetTemplates: (): Promise<AlarmSetTemplateNative[]> =>
    LocalDatabase.fetchAlarmSetTemplates(),
  fetchAlarmTemplates: (templateId: string): Promise<AlarmTemplateNative[]> =>
    LocalDatabase.fetchAlarmTemplates(templateId),
  deleteAlarmTemplate: (templateId: string): Promise<void> =>
    LocalDatabase.deleteAlarmTemplate(templateId),
  clearAllTables: (): Promise<void> => LocalDatabase.clearAllTables(),
  fetchSnapshot: (): Promise<DatabaseSnapshot> => LocalDatabase.fetchSnapshot(),
  setAlarmGeofenceZone: (
    alarmId: string,
    location: { latitude: number; longitude: number; radius: number; placeName?: string | null },
  ): Promise<void> =>
    LocalDatabase.setAlarmGeofenceZone(alarmId, location.latitude, location.longitude, location.radius, location.placeName ?? null),
  removeAlarmGeofenceZone: (alarmId: string): Promise<void> => LocalDatabase.removeAlarmGeofenceZone(alarmId),
  fetchGeoFenceZones: (): Promise<GeoFenceZoneEntity[]> => LocalDatabase.fetchGeoFenceZones(),
};

export const databaseDebug = {
  ensureInitialized: localDatabase.ensureInitialized,
  clearAllTables: localDatabase.clearAllTables,
  fetchSnapshot: localDatabase.fetchSnapshot,
};

export type {
  DatabaseSnapshot,
  TodoNative,
  TodoMutationPayload,
  AlarmNative,
  AlarmPersistPayload,
  TodoAlarmRelationNative,
  TodoAlarmRelationMutationPayload,
  AlarmSetNative,
  AlarmSetMutationPayload,
  AlarmSetTemplateNative,
  AlarmTemplateNative,
  AlarmTemplateEntryPayload,
};
