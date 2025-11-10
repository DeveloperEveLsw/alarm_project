export type ScheduleTodo = {
  id: number;
  title: string;
  dueDate: string | null;
  dueTime: string | null;
  isRepeating: boolean;
  repeatType: 'weekly' | 'monthly' | null;
  repeatWeekdays: number[] | null;
  repeatDayOfMonth: number | null;
  ddayId: number | null;
  alarmId: number | null;
  alarmSetId: number | null;
};

export type ScheduleTodoFormData = {
  title: string;
  timeValue: [number, number];
  isTimePickerVisible: boolean;
  isRepeatSectionVisible: boolean;
  repeatType: 'weekly' | 'monthly' | null;
  selectedWeekdays: number[];
  isDDay: boolean;
};

