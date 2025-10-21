import dayjs from 'dayjs';

import type { ScheduleTodo, ScheduleTodoFormData } from '../types/todo.types';
import { localDatabase, type TodoMutationPayload, type TodoNative } from './db/localDatabase';
import { decodeWeekdays } from '../utils/repeatMask';

const buildDueTime = (formData: ScheduleTodoFormData): string | null => {
  if (!formData.isTimePickerVisible) {
    return null;
  }

  const [hour, minute] = formData.timeValue;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const mapNativeToSchedule = (row: TodoNative): ScheduleTodo => ({
  id: row.id != null ? Number(row.id) : 0,
  title: row.title,
  dueDate: row.due_date,
  dueTime: row.due_time,
  isRepeating: row.is_repeating,
  repeatType: row.repeat_type,
  repeatWeekdays: decodeWeekdays(row.repeat_weekday),
  repeatDayOfMonth: row.repeat_day_of_month,
  ddayId: row.dday_id != null ? Number(row.dday_id) : null,
  alarmId: row.alarm_id ?? null,
  alarmSetId: row.alarm_set_id ?? null,
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

const getAllTodos = async (): Promise<ScheduleTodo[]> => {
  const rows = await localDatabase.fetchTodos();
  return rows.map(mapNativeToSchedule);
};

const getTodosForDate = async (targetDate: string): Promise<ScheduleTodo[]> => {
  const rows = await localDatabase.fetchTodosForDate(targetDate);
  return rows.map(mapNativeToSchedule);
};

const updateTodo = async ({ todo, formData, targetDate }: {
  todo: ScheduleTodo;
  formData: ScheduleTodoFormData;
  targetDate: string;
}): Promise<void> => {
  const payload = buildMutationPayload(formData, targetDate, todo);
  await localDatabase.upsertTodo(payload);
};

const createTodo = async ({ formData, targetDate }: {
  formData: ScheduleTodoFormData;
  targetDate: string;
}): Promise<void> => {
  const payload = buildMutationPayload(formData, targetDate);
  await localDatabase.upsertTodo({ ...payload, id: null, alarmId: null, alarmSetId: null, ddayId: null });
};

export const todoService = {
  getAllTodos,
  getTodosForDate,
  filterTodosByDate,
  updateTodo,
  createTodo,
};
