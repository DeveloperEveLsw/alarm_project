export type ScheduleTodo = {
  id: number;
  title: string;
  dueDate: string | null;
  dueTime: string | null;
  isRepeating: boolean;
  repeatType: 'weekly' | 'monthly' | null;
  repeatWeekdays: number[];
  repeatDayOfMonth: number | null;
  ddayId: number | null;
  alarmId: string | null;
  alarmSetId: string | null;
  alarmTemplateId?: string | null;
  alarmRelations: ScheduleTodoAlarmRelation[];
};

export type ScheduleTodoAlarmRelation = {
  id: number | null;
  todoId: number;
  alarmId: string;
  offsetMinutes: number;
  orderIndex: number;
};

export type ScheduleTodoFormData = {
  title: string;
  timeValue: [number, number];
  isTimePickerVisible: boolean;
  isRepeatSectionVisible: boolean;
  repeatType: 'weekly' | 'monthly' | null;
  selectedWeekdays: number[];
  isDDay: boolean;
  alarmOffsets: number[];
  isAlarmEnabled: boolean;
  alarmTemplateId?: string | null;
};
