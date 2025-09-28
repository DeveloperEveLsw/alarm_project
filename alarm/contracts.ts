export type AlarmMode = "normal" | "shake" | "math";

export type LocationRequirement = "home-in" | "home-out" | "any";

export type AlarmChannel = "alarms" | "silent";

export type Policy = {
  mode: AlarmMode;
  snoozeMinutes?: number[];
  requireLocation?: LocationRequirement;
  volume?: number;
};

export type AlarmSpec = {
  id: string;
  fireAt: number;
  policy: Policy;
  label?: string;
  payload?: Record<string, string>;
  allowWhileIdle?: boolean;
  channel?: AlarmChannel;
  metadata?: Record<string, string>;
};

export type LocationSnapshot = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  ageMillis: number;
  provider: string;
};

export type DeviceSnapshot = {
  timezone: string;
  isScreenOn: boolean;
  batteryLevel: number;
  isPowerSaveMode: boolean;
  ringerMode: "silent" | "vibrate" | "normal" | "unknown";
  musicVolume: number;
  musicVolumeMax: number;
};

export type ContextSnapshot = {
  specId: string;
  firedAtUtc: number;
  receivedAtUtc: number;
  policy: Policy;
  device: DeviceSnapshot;
  location?: LocationSnapshot;
  extras?: Record<string, unknown>;
};

export type UiReadyCommand = {
  type: "UI_READY";
  id: string;
  timestampUtc?: number;
};

export type RingNativeCommand = {
  type: "RING_NATIVE";
  id: string;
  fullScreen?: boolean;
  channel?: AlarmChannel;
};

export type OpenModeUiCommand = {
  type: "OPEN_MODE_UI";
  id: string;
  route: string;
  seed?: number;
  extras?: Record<string, string>;
};

export type SnoozeCommand = {
  type: "SNOOZE";
  id: string;
  minutes?: number;
};

export type DismissCommand = {
  type: "DISMISS";
  id: string;
};

export type StopNativeCommand = {
  type: "STOP_NATIVE";
  id: string;
};

export type EngineCommand =
  | UiReadyCommand
  | RingNativeCommand
  | OpenModeUiCommand
  | SnoozeCommand
  | DismissCommand
  | StopNativeCommand;

export type ScheduledEvent = {
  type: "SCHEDULED";
  id: string;
  fireAt: number;
};

export type FiredEvent = {
  type: "FIRED";
  id: string;
  ctx: ContextSnapshot;
};

export type SnoozedEvent = {
  type: "SNOOZED";
  id: string;
  nextFireAt: number;
  minutes: number;
};

export type DismissedEvent = {
  type: "DISMISSED";
  id: string;
  dismissedAtUtc: number;
};

export type ErrorEvent = {
  type: "ERROR";
  id: string;
  code: string;
  message: string;
};

export type AlarmEvent = ScheduledEvent | FiredEvent | SnoozedEvent | DismissedEvent | ErrorEvent;

export const serializeAlarmSpec = (spec: AlarmSpec): string => JSON.stringify(spec);

export const serializeEngineCommand = (command: EngineCommand): string => JSON.stringify(command);

export const parseAlarmEvent = (raw: string): AlarmEvent => JSON.parse(raw) as AlarmEvent;

export const parseAlarmEvents = (payloads: string[]): AlarmEvent[] => payloads.map(parseAlarmEvent);

export const nowUtc = (): number => Date.now();
