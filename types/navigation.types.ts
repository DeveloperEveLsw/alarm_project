export type RootStackParamList = {
  Main: undefined;
  ScheduleEditor: { date: string };
  Todo: undefined;
  DDay: undefined;
  AlarmPermissions: undefined;
  AlarmMath: { alarmId: string; seed?: number };
  AlarmShake: { alarmId: string; targetShakes?: number };
};
