export const DEFAULT_SHAKE_TARGET_MIN = 15;
export const DEFAULT_SHAKE_TARGET_MAX = 45;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const sanitizeShakeTarget = (
  target: number,
  min: number = DEFAULT_SHAKE_TARGET_MIN,
  max: number = DEFAULT_SHAKE_TARGET_MAX,
): number => {
  if (!Number.isFinite(target)) {
    return min;
  }
  return clamp(Math.round(target), min, max);
};

export const normalizeShakeRange = (
  minCandidate?: number,
  maxCandidate?: number,
  fallbackMin: number = DEFAULT_SHAKE_TARGET_MIN,
  fallbackMax: number = DEFAULT_SHAKE_TARGET_MAX,
): { min: number; max: number } => {
  let min = sanitizeShakeTarget(
    typeof minCandidate === "number" ? minCandidate : fallbackMin,
    fallbackMin,
    fallbackMax,
  );
  let max = sanitizeShakeTarget(
    typeof maxCandidate === "number" ? maxCandidate : fallbackMax,
    fallbackMin,
    fallbackMax,
  );
  if (max < min) {
    max = min;
  }
  return { min, max };
};

export const getRandomShakeTarget = (
  min: number = DEFAULT_SHAKE_TARGET_MIN,
  max: number = DEFAULT_SHAKE_TARGET_MAX,
): number => {
  const range = normalizeShakeRange(min, max);
  const spread = range.max - range.min + 1;
  return range.min + Math.floor(Math.random() * spread);
};
