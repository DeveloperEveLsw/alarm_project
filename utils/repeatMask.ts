export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const encodeWeekdays = (days: Weekday[]): number => {
  let mask = 0;
  for (const day of days) {
    if (day >= 0 && day <= 6) {
      mask |= 1 << day;
    }
  }
  return mask;
};

export const decodeWeekdays = (mask: number): Weekday[] => {
  const result: Weekday[] = [];
  for (let index = 0 as Weekday; index <= 6; index = ((index + 1) % 7) as Weekday) {
    if ((mask & (1 << index)) !== 0) {
      result.push(index);
    }
    if (index === 6) break;
  }
  return result;
};

export const hasWeekday = (mask: number, day: Weekday): boolean => (mask & (1 << day)) !== 0;
