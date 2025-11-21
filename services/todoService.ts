import dayjs from 'dayjs';

import type { ScheduleTodo, ScheduleTodoAlarmRelation, ScheduleTodoFormData } from '../types/todo.types';
import {
  localDatabase,
  type TodoAlarmRelationMutationPayload,
  type TodoAlarmRelationNative,
  type TodoMutationPayload,
  type TodoNative,
} from './db/localDatabase';
import { decodeWeekdays } from '../utils/repeatMask';

const buildDueTime = (formData: ScheduleTodoFormData): string | null => {
  if (!formData.isTimePickerVisible) {
    return null;
  }

  const [hour, minute] = formData.timeValue;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const normalizeRepeatType = (value: string | null): ScheduleTodo['repeatType'] => {
  if (value === 'weekly' || value === 'monthly') {
    return value;
  }
  return null;
};

const mapNativeToSchedule = (row: TodoNative): ScheduleTodo => ({
  id: row.id != null ? Number(row.id) : 0,
  title: row.title,
  dueDate: row.due_date,
  dueTime: row.due_time,
  isRepeating: row.is_repeating,
  repeatType: normalizeRepeatType(row.repeat_type),
  repeatWeekdays: decodeWeekdays(row.repeat_weekday),
  repeatDayOfMonth: row.repeat_day_of_month,
  ddayId: row.dday_id != null ? Number(row.dday_id) : null,
  alarmId: row.alarm_id ?? null,
  alarmSetId: row.alarm_set_id ?? null,
  alarmTemplateId: null,
  alarmRelations: [],
});

const mapNativeRelation = (row: TodoAlarmRelationNative): ScheduleTodoAlarmRelation => ({
  id: row.id != null ? Number(row.id) : null,
  todoId: Number(row.todo_id),
  alarmId: row.alarm_id,
  offsetMinutes: row.offset_minutes,
  orderIndex: row.order_index,
});

const buildMutationPayload = (
  formData: ScheduleTodoFormData,
  targetDate: string,
  existing?: ScheduleTodo,
): TodoMutationPayload => {
  const repeatType = formData.isRepeatSectionVisible ? formData.repeatType : null;
  const repeatWeekdays =
    repeatType === 'weekly' ? [...formData.selectedWeekdays] : [];
  const repeatDayOfMonth =
    repeatType === 'monthly' && targetDate ? Number(targetDate.split('-')[2]) || null : null;

  return {
    id: existing?.id ?? null,
    title: formData.title,
    dueDate: targetDate,
    dueTime: buildDueTime(formData),
    isRepeating: Boolean(repeatType),
    repeatType,
    repeatWeekdays,
    repeatDayOfMonth,
    alarmId: existing?.alarmId ?? null,
    alarmSetId: existing?.alarmSetId ?? null,
    ddayId: existing?.ddayId ?? null,
    isDDay: formData.isDDay,
  };
};

export const filterTodosByDate = (todos: ScheduleTodo[], targetDate: string): ScheduleTodo[] => {
  const targetDay = dayjs(targetDate);
  if (!targetDay.isValid()) {
    return todos.filter(todo => todo.dueDate === targetDate);
  }

  const weekday = targetDay.day();
  const dayOfMonth = targetDay.date();

  return todos.filter(todo => {
    if (todo.isRepeating) {
      if (todo.repeatType === 'weekly' && todo.repeatWeekdays) {
        return todo.repeatWeekdays.includes(weekday);
      }

      if (todo.repeatType === 'monthly' && todo.repeatDayOfMonth !== null) {
        return todo.repeatDayOfMonth === dayOfMonth;
      }

      return false;
    }

    return todo.dueDate === targetDate;
  });
};

const attachAlarmRelations = async (todos: ScheduleTodo[]): Promise<ScheduleTodo[]> => {
  await Promise.all(
    todos.map(async todo => {
      if (!todo.id) {
        todo.alarmRelations = [];
        return;
      }
      const relations = await getTodoAlarmRelations(todo.id);
      todo.alarmRelations = relations;
    }),
  );
  return todos;
};

const getAllTodos = async (): Promise<ScheduleTodo[]> => {
  const rows = await localDatabase.fetchTodos();
  const todos = rows.map(mapNativeToSchedule);
  await attachAlarmRelations(todos);
  return todos;
};

const getTodosForDate = async (targetDate: string): Promise<ScheduleTodo[]> => {
  const rows = await localDatabase.fetchTodosForDate(targetDate);
  const todos = rows.map(mapNativeToSchedule);
  await attachAlarmRelations(todos);
  return todos;
};

const getTodoAlarmRelations = async (todoId: number): Promise<ScheduleTodoAlarmRelation[]> => {
  const rows = await localDatabase.fetchTodoAlarmRelations(todoId);
  return rows.map(mapNativeRelation);
};

const replaceTodoAlarmRelations = async (
  todoId: number,
  relations: Array<Omit<ScheduleTodoAlarmRelation, 'id' | 'todoId'>>,
): Promise<void> => {
  const payload: TodoAlarmRelationMutationPayload[] = relations.map(relation => ({
    alarmId: relation.alarmId,
    offsetMinutes: relation.offsetMinutes,
    orderIndex: relation.orderIndex,
  }));
  await localDatabase.replaceTodoAlarmRelations(todoId, payload);
};

const updateTodo = async ({
  todo,
  formData,
  targetDate,
}: {
  todo: ScheduleTodo;
  formData: ScheduleTodoFormData;
  targetDate: string;
}): Promise<ScheduleTodo> => {
  const payload = buildMutationPayload(formData, targetDate, todo);
  const updated = await localDatabase.upsertTodo(payload);
  const schedule = mapNativeToSchedule(updated);
  if (schedule.id) {
    schedule.alarmRelations = await getTodoAlarmRelations(schedule.id);
  }
  return schedule;
};

const createTodo = async ({
  formData,
  targetDate,
}: {
  formData: ScheduleTodoFormData;
  targetDate: string;
}): Promise<ScheduleTodo> => {
  const payload = buildMutationPayload(formData, targetDate);
  const created = await localDatabase.upsertTodo({
    ...payload,
    id: null,
    alarmId: null,
    alarmSetId: null,
    ddayId: null,
  });
  const schedule = mapNativeToSchedule(created);
  if (schedule.id) {
    schedule.alarmRelations = await getTodoAlarmRelations(schedule.id);
  }
  return schedule;
};

const deleteTodo = async (todoId: number): Promise<void> => {
  await localDatabase.deleteTodo(todoId);
};

export const todoService = {
  getAllTodos,
  getTodosForDate,
  filterTodosByDate,
  updateTodo,
  createTodo,
  deleteTodo,
  getTodoAlarmRelations,
  replaceTodoAlarmRelations,
};
