const FALLBACK_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

const fallbackRandom = (): string => {
  const bytes = Array.from({ length: 26 }, () => Math.floor(Math.random() * FALLBACK_ALPHABET.length));
  return bytes.map(index => FALLBACK_ALPHABET[index]).join("");
};

export const generateAlarmId = (): string => {
  const globalCrypto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;

  if (globalCrypto?.randomUUID) {
    return globalCrypto.randomUUID();
  }

  return `alarm-${Date.now()}-${fallbackRandom()}`;
};

export const generateAlarmSetId = (): string => {
  const globalCrypto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;

  if (globalCrypto?.randomUUID) {
    return globalCrypto.randomUUID();
  }

  return `alarm-set-${Date.now()}-${fallbackRandom()}`;
};
