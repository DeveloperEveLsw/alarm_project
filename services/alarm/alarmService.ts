import dayjs from "dayjs";

import { AlarmEngine } from "../../alarm/engine";
import type { AlarmSpec } from "../../alarm/contracts";
import type { AlarmBase, AlarmItem } from "../../types/alarm.types";

const WEEK_DAY_COUNT = 7;

const normalizeRepeatDays = (days: AlarmBase["repeatDays"]): number[] =>
  Array.from(new Set(days)).filter(day => day >= 0 && day < WEEK_DAY_COUNT).sort((a, b) => a - b);

export const computeNextTrigger = (alarm: AlarmBase, baseTime: number = Date.now()): dayjs.Dayjs => {
  const now = dayjs(baseTime);
  let candidate = now.hour(alarm.hour).minute(alarm.minute).second(0).millisecond(0);

  const repeatDays = normalizeRepeatDays(alarm.repeatDays);

  if (repeatDays.length === 0) {
    if (candidate.isBefore(now)) {
      candidate = candidate.add(1, "day");
    }
    return candidate;
  }

  const today = now.day();

  for (let offset = 0; offset < WEEK_DAY_COUNT; offset += 1) {
    const targetDay = (today + offset) % WEEK_DAY_COUNT;
    if (!repeatDays.includes(targetDay)) continue;

    const scheduledCandidate = candidate.add(offset, "day");
    if (offset === 0 && scheduledCandidate.isBefore(now)) {
      continue;
    }
    return scheduledCandidate;
  }

  return candidate.add(1, "day");
};

const buildAlarmSpec = (alarm: AlarmItem, nextFireAt: number): AlarmSpec => ({
  id: alarm.id,
  fireAt: nextFireAt,
  policy: {
    mode: "normal",
    repeatDays: alarm.repeatDays,
  },
  label: alarm.label || undefined,
  allowWhileIdle: true,
  channel: "alarms",
  metadata: {
    localTime: `${String(alarm.hour).padStart(2, "0")}:${String(alarm.minute).padStart(2, "0")}`,
    repeatDays: alarm.repeatDays.join(","),
    skipHolidays: String(alarm.skipHolidays),
    sound: alarm.sound,
    vibrate: String(alarm.vibrate),
  },
});

export const scheduleAlarm = async (alarm: AlarmItem): Promise<number> => {
  const nextFireAt = computeNextTrigger(alarm).valueOf();
  const spec = buildAlarmSpec(alarm, nextFireAt);
  await AlarmEngine.scheduleExact(spec);
  return nextFireAt;
};

export const cancelAlarm = async (id: string): Promise<void> => {
  await AlarmEngine.cancel(id);
};
