import dayjs from 'dayjs';

import type { ResultSet } from 'react-native-sqlite-storage';
import type { ScheduleTodo, ScheduleTodoFormData } from '../types/todo.types';
import { DBManager } from './db/db';

type TodoRow = Record<string, any>;

type UpdateTodoParams = {
  todo: ScheduleTodo;
  formData: ScheduleTodoFormData;
  targetDate: string;
};

type CreateTodoParams = {
  formData: ScheduleTodoFormData;
  targetDate: string;
};

const parseRepeatWeekdays = (row: TodoRow): number[] | null => {
  const { repeat_weekday: repeatWeekday } = row;
  if (typeof repeatWeekday !== 'string') {
    return null;
  }

  try {
    const parsed = JSON.parse(repeatWeekday);
    if (!Array.isArray(parsed)) {
      return null;
    }

    const normalized = parsed
      .map(value => Number(value))
      .filter(value => Number.isInteger(value) && value >= 0 && value <= 6);

    return normalized.length > 0 ? normalized : [];
  } catch (error) {
    console.warn('Failed to parse repeat_weekday JSON', row.id, error);
    return null;
  }
};

const mapRowToTodo = (row: TodoRow): ScheduleTodo => {
  const repeatWeekdays = parseRepeatWeekdays(row);

  return {
    id: Number(row.id),
    title: typeof row.title === 'string' ? row.title : '',
    dueDate: typeof row.due_date === 'string' ? row.due_date : null,
    dueTime: typeof row.due_time === 'string' ? row.due_time : null,
    isRepeating: Number(row.is_repeating) === 1,
    repeatType:
      row.repeat_type === 'weekly' || row.repeat_type === 'monthly'
        ? (row.repeat_type as 'weekly' | 'monthly')
        : null,
    repeatWeekdays,
    repeatDayOfMonth:
      row.repeat_day_of_month !== null && row.repeat_day_of_month !== undefined
        ? Number(row.repeat_day_of_month)
        : null,
    ddayId:
      row.dday_id !== null && row.dday_id !== undefined ? Number(row.dday_id) : null,
    alarmId:
      row.alarm_id !== null && row.alarm_id !== undefined ? Number(row.alarm_id) : null,
    alarmSetId:
      row.alarm_set_id !== null && row.alarm_set_id !== undefined ? Number(row.alarm_set_id) : null,
  };
};

const mapResultToTodos = (result: ResultSet): ScheduleTodo[] => {
  const todos: ScheduleTodo[] = [];
  for (let index = 0; index < result.rows.length; index += 1) {
    todos.push(mapRowToTodo(result.rows.item(index)));
  }
  return todos;
};

const buildDueTime = (formData: ScheduleTodoFormData): string | null => {
  if (!formData.isTimePickerVisible) {
    return null;
  }

  const [hour, minute] = formData.timeValue;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const buildRepeatPayload = (formData: ScheduleTodoFormData, dueDate: string) => {
  const isRepeating = formData.isRepeatSectionVisible && formData.repeatType ? 1 : 0;
  const repeatTypeToSave = isRepeating ? formData.repeatType : null;
  const repeatWeekday =
    isRepeating &&
    formData.repeatType === 'weekly' &&
    formData.selectedWeekdays.length > 0
      ? JSON.stringify(formData.selectedWeekdays)
      : null;
  const repeatDayOfMonth =
    isRepeating && formData.repeatType === 'monthly' && dueDate
      ? Number(dueDate.split('-')[2]) || null
      : null;

  return { isRepeating, repeatTypeToSave, repeatWeekday, repeatDayOfMonth };
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
  const db = await DBManager.getDB();
  const [result] = await db.executeSql('SELECT * FROM Todo;');
  return mapResultToTodos(result);
};

const getTodosForDate = async (targetDate: string): Promise<ScheduleTodo[]> => {
  const db = await DBManager.getDB();

  const [nonRepeatingResult] = await db.executeSql(
    `SELECT * FROM Todo WHERE due_date = ? AND (is_repeating IS NULL OR is_repeating = 0);`,
    [targetDate],
  );
  const nonRepeatingTodos = mapResultToTodos(nonRepeatingResult);

  const [repeatingResult] = await db.executeSql(`SELECT * FROM Todo WHERE is_repeating = 1;`);
  const repeatingTodos = mapResultToTodos(repeatingResult);
  const filteredRepeatingTodos = filterTodosByDate(repeatingTodos, targetDate);

  return [...nonRepeatingTodos, ...filteredRepeatingTodos];
};

const updateTodo = async ({ todo, formData, targetDate }: UpdateTodoParams): Promise<void> => {
  const db = await DBManager.getDB();
  const dueDate = targetDate;
  const dueTime = buildDueTime(formData);
  const { isRepeating, repeatTypeToSave, repeatWeekday, repeatDayOfMonth } = buildRepeatPayload(
    formData,
    dueDate,
  );

  await db.executeSql(
    `UPDATE Todo SET
      title = ?,
      description = ?,
      due_date = ?,
      due_time = ?,
      is_repeating = ?,
      repeat_type = ?,
      repeat_weekday = ?,
      repeat_day_of_month = ?,
      alarm_id = ?,
      alarm_set_id = ?
    WHERE id = ?;`,
    [
      formData.title,
      null,
      dueDate,
      dueTime,
      isRepeating,
      repeatTypeToSave,
      repeatWeekday,
      repeatDayOfMonth,
      todo.alarmId,
      todo.alarmSetId,
      todo.id,
    ],
  );

  if (formData.isDDay) {
    if (todo.ddayId) {
      await db.executeSql(`UPDATE Dday SET target_date = ? WHERE id = ?;`, [dueDate, todo.ddayId]);
    } else {
      const [insertDdayResult] = await db.executeSql(
        `INSERT INTO Dday (todo_id, target_date) VALUES (?, ?);`,
        [todo.id, dueDate],
      );
      await db.executeSql(`UPDATE Todo SET dday_id = ? WHERE id = ?;`, [insertDdayResult.insertId, todo.id]);
    }
  } else if (todo.ddayId) {
    await db.executeSql(`DELETE FROM Dday WHERE id = ?;`, [todo.ddayId]);
    await db.executeSql(`UPDATE Todo SET dday_id = NULL WHERE id = ?;`, [todo.id]);
  }
};

const createTodo = async ({ formData, targetDate }: CreateTodoParams): Promise<void> => {
  const db = await DBManager.getDB();
  const dueDate = targetDate;
  const dueTime = buildDueTime(formData);
  const { isRepeating, repeatTypeToSave, repeatWeekday, repeatDayOfMonth } = buildRepeatPayload(
    formData,
    dueDate,
  );

  const [insertTodoResult] = await db.executeSql(
    `INSERT INTO Todo (
      title,
      description,
      due_date,
      due_time,
      is_repeating,
      repeat_type,
      repeat_weekday,
      repeat_day_of_month,
      dday_id,
      alarm_id,
      alarm_set_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      formData.title,
      null,
      dueDate,
      dueTime,
      isRepeating,
      repeatTypeToSave,
      repeatWeekday,
      repeatDayOfMonth,
      null,
      null,
      null,
    ],
  );

  const todoId = insertTodoResult.insertId;
  if (formData.isDDay && todoId) {
    const [insertDdayResult] = await db.executeSql(
      `INSERT INTO Dday (todo_id, target_date) VALUES (?, ?);`,
      [todoId, dueDate],
    );
    await db.executeSql(`UPDATE Todo SET dday_id = ? WHERE id = ?;`, [insertDdayResult.insertId, todoId]);
  }
};

export const todoService = {
  getAllTodos,
  getTodosForDate,
  filterTodosByDate,
  updateTodo,
  createTodo,
};

