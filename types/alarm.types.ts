import type { AlarmMode } from "../alarm/contracts";

export type AlarmRepeatDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type AlarmPolicyMode = AlarmMode;

export type AlarmPolicyPayload = Record<string, unknown> | null | undefined;

export type AlarmBase = {
  hour: number;
  minute: number;
  label: string;
  repeatDays: AlarmRepeatDay[];
  skipHolidays: boolean;
  sound: string;
  vibrate: boolean;
  policyMode?: AlarmPolicyMode;
  policyPayload?: AlarmPolicyPayload;
};

export type AlarmDraft = AlarmBase & {
  id?: string;
};

export type AlarmItem = AlarmBase & {
  id: string;
  enabled: boolean;
  nextTriggerAt: number | null;
};
