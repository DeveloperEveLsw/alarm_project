export type AlarmRepeatDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type AlarmBase = {
  hour: number;
  minute: number;
  label: string;
  repeatDays: AlarmRepeatDay[];
  skipHolidays: boolean;
  sound: string;
  vibrate: boolean;
};

export type AlarmDraft = AlarmBase & {
  id?: string;
};

export type AlarmItem = AlarmBase & {
  id: string;
  enabled: boolean;
  nextTriggerAt: number | null;
};
