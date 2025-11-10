export interface Todo {
  id: number;
  title: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  isRepeating: boolean;
  repeatType?: 'weekly' | 'monthly';
  repeatWeekdays?: number[];
  repeatDayOfMonth?: number;
  ddayId?: number;
  alarmId?: number;
  alarmSetId?: number;
  createdAt: string;
}

export interface DDay {
  id: number;
  todoId: number;
  targetDate: string;
}

export interface Alarm {
  id: number;
  time: string;
  title: string;
  isSystemAlarm: boolean;
  systemAlarmId?: number;
  ddayId?: number;
  alarmSetId?: number;
  createdAt: string;
}

export interface AlarmSet {
  id: number;
  name?: string;
  representativeAlarmId?: number;
}

export interface CreateTodoData {
  title: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  isRepeating?: boolean;
  repeatType?: 'weekly' | 'monthly';
  repeatWeekdays?: number[];
  repeatDayOfMonth?: number;
}

export interface UpdateTodoData extends CreateTodoData {
  id: number;
}

export interface CreateAlarmData {
  time: string;
  title: string;
  isSystemAlarm?: boolean;
  ddayId?: number;
  alarmSetId?: number;
}

export interface CreateDDayData {
  todoId: number;
  targetDate: string;
}
