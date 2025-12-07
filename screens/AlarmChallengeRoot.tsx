import React, { useCallback, useEffect, useMemo } from "react";
import { NativeModules, SafeAreaView, StyleSheet, Text } from "react-native";

import MathChallenge, { type MathChallengeSettings } from "../Components/Challenge/MathChallenge";
import PuzzleChallenge from "../Components/Challenge/PuzzleChallenge";
import ShakeChallenge, { type ShakeChallengeSettings } from "../Components/Challenge/ShakeChallenge";
import { AlarmEngine } from "../alarm/engine";
import type { PuzzleDifficulty } from "../types/puzzle.types";
import type { Operator } from "../services/mathExpressions";
import { getRandomShakeTarget, normalizeShakeRange, sanitizeShakeTarget } from "../utils/shakeTarget";

type ChallengeRootProps = {
  alarmId?: string;
  policyMode?: string;
  policyPayload?: string | null;
  snoozeMinutes?: number[];
  nativeHosted?: boolean;
};

type MathPolicyPayload = {
  difficulty?: "easy" | "normal" | "hard" | "custom";
  termCount?: number;
  includeMultiplication?: boolean;
  avoidDivideByOne?: boolean;
  maxAttempts?: number;
  weights?: Partial<Record<Operator, number>>;
};

type ShakePolicyPayload = {
  targetShakes?: number;
  threshold?: number;
  intervalMs?: number;
  minTargetShakes?: number;
  maxTargetShakes?: number;
};

type PuzzlePolicyPayload = {
  size?: number;
  difficulty?: PuzzleDifficulty;
  seed?: number;
};

const DEFAULT_MATH_SETTINGS: MathChallengeSettings = {
  termCount: 4,
  includeMultiplication: true,
  avoidDivideByOne: true,
  maxAttempts: 3,
};

const DEFAULT_SHAKE_SETTINGS: ShakeChallengeSettings = {
  targetShakes: 20,
  threshold: 2.7,
  intervalMs: 350,
  range: { min: 15, max: 45 },
};

const DIFFICULTY_PRESETS: Record<Exclude<MathPolicyPayload["difficulty"], "custom">, Partial<MathChallengeSettings>> = {
  easy: { termCount: 3, includeMultiplication: false, maxAttempts: 4 },
  normal: { termCount: 4, includeMultiplication: true, maxAttempts: 3 },
  hard: { termCount: 6, includeMultiplication: true, maxAttempts: 2 },
};

const sanitizeNumber = (value: unknown, fallback: number, min: number, max: number): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const clamped = Math.min(max, Math.max(min, Math.round(value)));
  return clamped;
};

const sanitizeBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === "boolean") return value;
  return fallback;
};

const sanitizeWeights = (weights: unknown): Partial<Record<Operator, number>> | undefined => {
  if (!weights || typeof weights !== "object") return undefined;
  const raw = weights as Record<string, unknown>;
  const collected = (["+", "-", "*", "/"] as Operator[]).reduce<Partial<Record<Operator, number>>>((acc, operator) => {
    const candidate = raw[operator];
    if (typeof candidate === "number" && Number.isFinite(candidate) && candidate > 0) {
      acc[operator] = candidate;
    }
    return acc;
  }, {});
  return Object.keys(collected).length > 0 ? collected : undefined;
};

const parsePolicyPayload = (raw: string | null | undefined): Record<string, unknown> | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch (error) {
    console.warn("[AlarmChallenge] Failed to parse policy payload", error);
  }
  return null;
};

const resolveMathSettings = (payload: Record<string, unknown> | null): MathChallengeSettings => {
  const p = payload as MathPolicyPayload | null;
  const preset = p?.difficulty && p.difficulty !== "custom" ? DIFFICULTY_PRESETS[p.difficulty] ?? {} : {};
  return {
    termCount: sanitizeNumber(p?.termCount, preset.termCount ?? DEFAULT_MATH_SETTINGS.termCount, 2, 12),
    includeMultiplication: sanitizeBoolean(p?.includeMultiplication, preset.includeMultiplication ?? DEFAULT_MATH_SETTINGS.includeMultiplication),
    avoidDivideByOne: sanitizeBoolean(p?.avoidDivideByOne, DEFAULT_MATH_SETTINGS.avoidDivideByOne),
    maxAttempts: sanitizeNumber(p?.maxAttempts, preset.maxAttempts ?? DEFAULT_MATH_SETTINGS.maxAttempts, 1, 10),
    weights: sanitizeWeights(p?.weights),
  };
};

const resolveShakeSettings = (payload: Record<string, unknown> | null): ShakeChallengeSettings => {
  const p = payload as ShakePolicyPayload | null;
  const range = normalizeShakeRange(p?.minTargetShakes, p?.maxTargetShakes);
  const target =
    typeof p?.targetShakes === "number" && Number.isFinite(p.targetShakes)
      ? sanitizeShakeTarget(p.targetShakes, range.min, range.max)
      : getRandomShakeTarget(range.min, range.max);
  return {
    targetShakes: target,
    threshold: typeof p?.threshold === "number" && Number.isFinite(p.threshold) ? p.threshold : DEFAULT_SHAKE_SETTINGS.threshold,
    intervalMs: sanitizeNumber(p?.intervalMs, DEFAULT_SHAKE_SETTINGS.intervalMs, 100, 2000),
    range,
  };
};

const resolvePuzzleSettings = (payload: Record<string, unknown> | null): { size: number; difficulty: PuzzleDifficulty; seed: number } => {
  const p = payload as PuzzlePolicyPayload | null;
  const size = typeof p?.size === "number" ? Math.min(6, Math.max(3, Math.round(p.size))) : 4;
  const difficulty: PuzzleDifficulty = p?.difficulty === "easy" || p?.difficulty === "hard" ? p.difficulty : "medium";
  const seed = typeof p?.seed === "number" && Number.isFinite(p.seed) ? Math.floor(p.seed) : Date.now();
  return { size, difficulty, seed };
};

const normalizeSnoozeMinutes = (values?: number[]): number[] => {
  if (!values || !Array.isArray(values)) return [];
  return values
    .map(value => Number(value))
    .filter(value => Number.isFinite(value) && value > 0)
    .map(value => Math.round(value))
    .sort((a, b) => a - b);
};

type MissionBridgeModule = {
  notifyMissionCompleted: () => Promise<void>;
};

const AlarmChallengeRoot: React.FC<ChallengeRootProps> = ({ alarmId, policyMode, policyPayload, snoozeMinutes, nativeHosted }) => {
  const normalizedSnooze = useMemo(() => {
    const sanitized = normalizeSnoozeMinutes(snoozeMinutes);
    return sanitized.length > 0 ? sanitized : [5];
  }, [snoozeMinutes]);

  const parsedPayload = useMemo(() => parsePolicyPayload(policyPayload), [policyPayload]);
  const mode = (policyMode ?? "normal").toLowerCase();
  const missionBridge = NativeModules.AlarmMissionBridge as MissionBridgeModule | undefined;
  const isNativeHosted = Boolean(nativeHosted);

  useEffect(() => {
    if (!alarmId) return;
    AlarmEngine.send({ type: "UI_READY", id: alarmId, timestampUtc: Date.now() }).catch(console.error);
    const unsubscribe = AlarmEngine.addListener(event => {
      if (event.id !== alarmId) return;
      if (event.type === "DISMISSED" || event.type === "SNOOZED") {
        AlarmEngine.send({ type: "STOP_NATIVE", id: alarmId }).catch(() => {});
      }
    });
    return unsubscribe;
  }, [alarmId]);

  const notifyNativeMissionCompletion = useCallback(async () => {
    if (!isNativeHosted || !alarmId) {
      return;
    }
    try {
      await AlarmEngine.send({ type: "STOP_NATIVE", id: alarmId }).catch(() => {});
    } finally {
      if (missionBridge?.notifyMissionCompleted) {
        await missionBridge.notifyMissionCompleted().catch(() => {});
      }
    }
  }, [alarmId, isNativeHosted, missionBridge]);

  const handleComplete = useCallback(async () => {
    if (!alarmId) return;
    if (isNativeHosted) {
      await notifyNativeMissionCompletion();
      return;
    }
    await AlarmEngine.send({ type: "DISMISS", id: alarmId }).catch(console.error);
  }, [alarmId, isNativeHosted, notifyNativeMissionCompletion]);

  const handleSnooze = useCallback(
    async (minutes?: number) => {
      if (!alarmId) return;
      await AlarmEngine.send({ type: "SNOOZE", id: alarmId, minutes }).catch(console.error);
      if (isNativeHosted) {
        await notifyNativeMissionCompletion();
      }
    },
    [alarmId, isNativeHosted, notifyNativeMissionCompletion],
  );

  if (!alarmId) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.message}>알람 정보를 불러오는 데 실패했습니다.</Text>
      </SafeAreaView>
    );
  }

  if (mode === "math") {
    const settings = resolveMathSettings(parsedPayload);
    return (
      <SafeAreaView style={styles.full}>
        <MathChallenge settings={settings} snoozeMinutes={normalizedSnooze} onComplete={handleComplete} onSnooze={handleSnooze} />
      </SafeAreaView>
    );
  }

  if (mode === "shake") {
    const settings = resolveShakeSettings(parsedPayload);
    return (
      <SafeAreaView style={styles.full}>
        <ShakeChallenge settings={settings} snoozeMinutes={normalizedSnooze} onComplete={handleComplete} onSnooze={handleSnooze} />
      </SafeAreaView>
    );
  }

  if (mode === "puzzle") {
    const settings = resolvePuzzleSettings(parsedPayload);
    return (
      <SafeAreaView style={styles.full}>
        <PuzzleChallenge
          size={settings.size}
          difficulty={settings.difficulty}
          seed={settings.seed}
          snoozeMinutes={normalizedSnooze}
          onComplete={handleComplete}
          onSnooze={handleSnooze}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.centered}>
      <Text style={styles.message}>지원하지 않는 알람 미션입니다.</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  full: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  centered: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  message: {
    color: "#e2e8f0",
    fontSize: 16,
    textAlign: "center",
  },
});

export default AlarmChallengeRoot;
