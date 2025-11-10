import { DatabaseService } from '../db/databaseService';
import { AlarmService } from '../alarm/alarmService';
import { DDayService } from './ddayService';
import { Todo, CreateTodoData, UpdateTodoData } from '../types/database.types';
import { ScheduleTodoFormData } from '../../types/todo.types';
import dayjs from 'dayjs';

export class ScheduleService {
  private databaseService: DatabaseService;
  private alarmService: AlarmService;
  private ddayService: DDayService;

  constructor(databaseService: DatabaseService) {
    this.databaseService = databaseService;
    this.alarmService = new AlarmService(databaseService);
    this.ddayService = new DDayService(databaseService);
  }

  // 일정 생성
  async createTodo(formData: ScheduleTodoFormData, targetDate: string): Promise<number> {
    const db = await this.databaseService.getDB();
    
    // 시간 데이터 변환
    const dueTime = this.buildDueTime(formData);
    
    // 반복 설정 처리
    const { isRepeating, repeatTypeToSave, repeatWeekday, repeatDayOfMonth } = this.buildRepeatPayload(formData, targetDate);

    const [result] = await db.executeSql(
      `INSERT INTO Todo (
        title, description, due_date, due_time, 
        is_repeating, repeat_type, repeat_weekday, repeat_day_of_month
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        formData.title,
        null,
        targetDate,
        dueTime,
        isRepeating,
        repeatTypeToSave,
        repeatWeekday,
        repeatDayOfMonth
      ]
    );

    const todoId = result.insertId;

    // D-Day 설정
    if (formData.isDDay) {
      const ddayId = await this.ddayService.createDDay({
        todoId,
        targetDate
      });
      
      // D-Day 알람 설정
      await this.ddayService.setDDayAlarm(targetDate, todoId, formData.title);
      
      // Todo에 D-Day ID 연결
      await db.executeSql(
        'UPDATE Todo SET dday_id = ? WHERE id = ?',
        [ddayId, todoId]
      );
    }

    // 시간 알람 설정
    if (formData.isTimePickerVisible) {
      const alarmId = await this.alarmService.createAlarm({
        time: dueTime!,
        title: formData.title,
        isSystemAlarm: true
      });
      
      // Todo에 알람 ID 연결
      await db.executeSql(
        'UPDATE Todo SET alarm_id = ? WHERE id = ?',
        [alarmId, todoId]
      );
    }

    return todoId;
  }

  // 일정 조회 (특정 날짜)
  async getTodosForDate(targetDate: string): Promise<Todo[]> {
    const db = await this.databaseService.getDB();

    // 단일 일정 조회
    const [nonRepeatingResult] = await db.executeSql(
      `SELECT * FROM Todo WHERE due_date = ? AND (is_repeating IS NULL OR is_repeating = 0)`,
      [targetDate]
    );
    const nonRepeatingTodos = this.mapResultToTodos(nonRepeatingResult);

    // 반복 일정 조회
    const [repeatingResult] = await db.executeSql(`SELECT * FROM Todo WHERE is_repeating = 1`);
    const repeatingTodos = this.mapResultToTodos(repeatingResult);
    const filteredRepeatingTodos = this.filterTodosByDate(repeatingTodos, targetDate);

    return [...nonRepeatingTodos, ...filteredRepeatingTodos];
  }

  // 모든 일정 조회
  async getAllTodos(): Promise<Todo[]> {
    const db = await this.databaseService.getDB();
    const [result] = await db.executeSql('SELECT * FROM Todo ORDER BY due_date, due_time');
    return this.mapResultToTodos(result);
  }

  // 일정 수정
  async updateTodo(todo: Todo, formData: ScheduleTodoFormData, targetDate: string): Promise<void> {
    const db = await this.databaseService.getDB();
    
    const dueTime = this.buildDueTime(formData);
    const { isRepeating, repeatTypeToSave, repeatWeekday, repeatDayOfMonth } = this.buildRepeatPayload(formData, targetDate);

    await db.executeSql(
      `UPDATE Todo SET
        title = ?, description = ?, due_date = ?, due_time = ?,
        is_repeating = ?, repeat_type = ?, repeat_weekday = ?, repeat_day_of_month = ?
      WHERE id = ?`,
      [
        formData.title,
        null,
        targetDate,
        dueTime,
        isRepeating,
        repeatTypeToSave,
        repeatWeekday,
        repeatDayOfMonth,
        todo.id
      ]
    );

    // D-Day 처리
    if (formData.isDDay) {
      if (todo.ddayId) {
        await this.ddayService.updateDDay(todo.ddayId, targetDate);
      } else {
        const ddayId = await this.ddayService.createDDay({
          todoId: todo.id,
          targetDate
        });
        
        await this.ddayService.setDDayAlarm(targetDate, todo.id, formData.title);
        
        await db.executeSql(
          'UPDATE Todo SET dday_id = ? WHERE id = ?',
          [ddayId, todo.id]
        );
      }
    } else if (todo.ddayId) {
      await this.ddayService.deleteDDay(todo.ddayId);
      await db.executeSql('UPDATE Todo SET dday_id = NULL WHERE id = ?', [todo.id]);
    }

    // 알람 처리
    if (formData.isTimePickerVisible) {
      if (todo.alarmId) {
        await this.alarmService.updateAlarm(todo.alarmId, {
          time: dueTime!,
          title: formData.title,
          isSystemAlarm: true
        });
      } else {
        const alarmId = await this.alarmService.createAlarm({
          time: dueTime!,
          title: formData.title,
          isSystemAlarm: true
        });
        
        await db.executeSql(
          'UPDATE Todo SET alarm_id = ? WHERE id = ?',
          [alarmId, todo.id]
        );
      }
    } else if (todo.alarmId) {
      await this.alarmService.deleteAlarm(todo.alarmId);
      await db.executeSql('UPDATE Todo SET alarm_id = NULL WHERE id = ?', [todo.id]);
    }
  }

  // 일정 삭제
  async deleteTodo(todoId: number): Promise<void> {
    const db = await this.databaseService.getDB();
    
    // 관련 알람 삭제
    const [todoResult] = await db.executeSql('SELECT alarm_id FROM Todo WHERE id = ?', [todoId]);
    if (todoResult.rows.length > 0) {
      const alarmId = todoResult.rows.item(0).alarm_id;
      if (alarmId) {
        await this.alarmService.deleteAlarm(alarmId);
      }
    }
    
    // 일정 삭제 (CASCADE로 D-Day도 자동 삭제)
    await db.executeSql('DELETE FROM Todo WHERE id = ?', [todoId]);
  }

  // 반복 일정 필터링
  filterTodosByDate(todos: Todo[], targetDate: string): Todo[] {
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
  }

  // 시간 데이터 변환
  private buildDueTime(formData: ScheduleTodoFormData): string | null {
    if (!formData.isTimePickerVisible) {
      return null;
    }

    const [hour, minute] = formData.timeValue;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  // 반복 설정 처리
  private buildRepeatPayload(formData: ScheduleTodoFormData, dueDate: string) {
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
  }

  // DB 결과를 Todo 객체로 변환
  private mapResultToTodos(result: any): Todo[] {
    const todos: Todo[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      todos.push(this.mapRowToTodo(row));
    }
    return todos;
  }

  // DB 행을 Todo 객체로 변환
  private mapRowToTodo(row: any): Todo {
    const repeatWeekdays = this.parseRepeatWeekdays(row);

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
      createdAt: row.created_at
    };
  }

  // 반복 요일 파싱
  private parseRepeatWeekdays(row: any): number[] | null {
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
  }
}

