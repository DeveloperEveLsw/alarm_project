import { NativeModules } from 'react-native';
import type { AlarmRepeatDay } from '../../types/alarm.types';
import type {
  AlarmEntity,
  AlarmSetEntity,
  DdayEntity,
  TodoEntity,
} from '../../types/generated/roomEntities';

type TodoNative = TodoEntity;
type AlarmNative = AlarmEntity;

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
};

type LocalDatabaseModule = {
  ensureInitialized(): Promise<void>;
  fetchSnapshot(): Promise<DatabaseSnapshot>;
  clearAllTables(): Promise<void>;
  fetchTodos(): Promise<TodoEntity[]>;
  fetchTodosForDate(targetDate: string): Promise<TodoEntity[]>;
  upsertTodo(payloadJson: string): Promise<TodoEntity>;
  fetchAlarms(): Promise<AlarmEntity[]>;
  insertAlarm(payloadJson: string): Promise<void>;
  updateAlarm(payloadJson: string): Promise<void>;
  deleteAlarm(id: string): Promise<void>;
  deleteAlarms(ids: string[]): Promise<void>;
  setAlarmEnabled(id: string, enabled: boolean): Promise<void>;
  getAlarmById(id: string): Promise<AlarmEntity | null>;
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
  clearAllTables: (): Promise<void> => LocalDatabase.clearAllTables(),
  fetchSnapshot: (): Promise<DatabaseSnapshot> => LocalDatabase.fetchSnapshot(),
};

export const databaseDebug = {
  ensureInitialized: localDatabase.ensureInitialized,
  clearAllTables: localDatabase.clearAllTables,
  fetchSnapshot: localDatabase.fetchSnapshot,
};

export type { DatabaseSnapshot, TodoNative, TodoMutationPayload, AlarmNative, AlarmPersistPayload };
