import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { AlarmChallengeBridge } from "../alarm/challengeBridge";
import type { ChallengeConfig } from "../alarm/challengeBridge";
import { MathChallenge, type MathChallengeSettings } from "../Components/Challenge/MathChallenge";
import PuzzleChallenge from "../Components/Challenge/PuzzleChallenge";
import { ShakeChallenge, type ShakeChallengeSettings } from "../Components/Challenge/ShakeChallenge";
import type { PuzzleDifficulty } from "../types/puzzle.types";
import type { Operator } from "../services/mathExpressions";
import {
  DEFAULT_SHAKE_TARGET_MAX,
  DEFAULT_SHAKE_TARGET_MIN,
  getRandomShakeTarget,
  normalizeShakeRange,
  sanitizeShakeTarget,
} from "../utils/shakeTarget";

type ScreenState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "math"; settings: MathChallengeSettings; snoozeMinutes: number[] }
  | { status: "shake"; settings: ShakeChallengeSettings; snoozeMinutes: number[] }
  | { status: "puzzle"; settings: PuzzleChallengeSettings; snoozeMinutes: number[] };

type MathPolicyPayload = {
  difficulty?: "easy" | "normal" | "hard";
  termCount?: number;
  includeMultiplication?: boolean;
  avoidDivideByOne?: boolean;
  maxAttempts?: number;
  weights?: Partial<Record<Operator, number>>;
  presencePenalty?: number;
  frequencyPenalty?: number;
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
  difficulty?: string;
  seed?: number;
};

type PuzzleChallengeSettings = {
  size: number;
  difficulty: PuzzleDifficulty;
  seed?: number;
};

const DEFAULT_SETTINGS: MathChallengeSettings = {
  termCount: 4,
  includeMultiplication: true,
  avoidDivideByOne: true,
  maxAttempts: 3,
};

const DEFAULT_SHAKE_SETTINGS: ShakeChallengeSettings = {
  targetShakes: 20,
  threshold: 2.7,
  intervalMs: 350,
  range: { min: DEFAULT_SHAKE_TARGET_MIN, max: DEFAULT_SHAKE_TARGET_MAX },
};

const DIFFICULTY_PRESETS: Record<string, Partial<MathChallengeSettings>> = {
  easy: { termCount: 3, includeMultiplication: false, maxAttempts: 4 },
  normal: { termCount: 4, includeMultiplication: true, maxAttempts: 3 },
  hard: { termCount: 6, includeMultiplication: true, maxAttempts: 2, presencePenalty: 0.1, frequencyPenalty: 0.15 },
};

const sanitizeNumber = (value: unknown, fallback: number, min: number, max: number): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const clamped = Math.round(value);
  return Math.min(max, Math.max(min, clamped));
};

const sanitizeBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;

const sanitizeWeights = (value: unknown): Partial<Record<Operator, number>> | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const entries = (['+', '-', '*', '/'] as Operator[]).reduce<Partial<Record<Operator, number>>>((acc, op) => {
    const candidate = raw[op];
    if (typeof candidate === "number" && Number.isFinite(candidate) && candidate > 0) {
      acc[op] = candidate;
    }
    return acc;
  }, {});
  return Object.keys(entries).length > 0 ? entries : undefined;
};

const sanitizePenalty = (value: unknown): number | undefined => {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.max(0, value);
};

const sanitizeFloat = (value: unknown, fallback: number, min: number, max: number): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const clamped = Math.min(max, Math.max(min, value));
  return clamped;
};

const sanitizePuzzleSize = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    const rounded = Math.round(value);
    if (rounded >= 3 && rounded <= 6) {
      return rounded;
    }
  }
  return 4;
};

const sanitizePuzzleDifficulty = (value: unknown): PuzzleDifficulty => {
  if (value === "easy" || value === "medium" || value === "hard") {
    return value;
  }
  return "medium";
};

const resolvePuzzleSettings = (payload: PuzzlePolicyPayload | null): PuzzleChallengeSettings => ({
  size: sanitizePuzzleSize(payload?.size),
  difficulty: sanitizePuzzleDifficulty(payload?.difficulty),
  seed: typeof payload?.seed === "number" && Number.isFinite(payload.seed) ? payload.seed : undefined,
});

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

const resolveMathSettings = (payload: MathPolicyPayload | null): MathChallengeSettings => {
  const difficultyPreset = payload?.difficulty ? DIFFICULTY_PRESETS[payload.difficulty] ?? {} : {};

  return {
    termCount: sanitizeNumber(payload?.termCount, difficultyPreset.termCount ?? DEFAULT_SETTINGS.termCount, 2, 12),
    includeMultiplication: sanitizeBoolean(payload?.includeMultiplication, difficultyPreset.includeMultiplication ?? DEFAULT_SETTINGS.includeMultiplication),
    avoidDivideByOne: sanitizeBoolean(payload?.avoidDivideByOne, DEFAULT_SETTINGS.avoidDivideByOne),
    maxAttempts: sanitizeNumber(payload?.maxAttempts, difficultyPreset.maxAttempts ?? DEFAULT_SETTINGS.maxAttempts, 1, 10),
    weights: sanitizeWeights(payload?.weights),
    presencePenalty: sanitizePenalty(payload?.presencePenalty ?? difficultyPreset.presencePenalty),
    frequencyPenalty: sanitizePenalty(payload?.frequencyPenalty ?? difficultyPreset.frequencyPenalty),
  };
};

const resolveShakeSettings = (payload: ShakePolicyPayload | null): ShakeChallengeSettings => {
  let explicitTarget: number | null = null;
  if (payload && typeof payload.targetShakes === "number" && Number.isFinite(payload.targetShakes)) {
    explicitTarget = sanitizeShakeTarget(payload.targetShakes);
  }

  const range = normalizeShakeRange(
    payload && typeof payload.minTargetShakes === "number" ? payload.minTargetShakes : undefined,
    payload && typeof payload.maxTargetShakes === "number" ? payload.maxTargetShakes : undefined,
    DEFAULT_SHAKE_TARGET_MIN,
    DEFAULT_SHAKE_TARGET_MAX,
  );

  const targetShakes = explicitTarget ?? getRandomShakeTarget(range.min, range.max);

  return {
    targetShakes,
    threshold: sanitizeFloat(payload?.threshold, DEFAULT_SHAKE_SETTINGS.threshold ?? 2.7, 0.8, 8),
    intervalMs: sanitizeNumber(
      payload?.intervalMs,
      DEFAULT_SHAKE_SETTINGS.intervalMs ?? 350,
      100,
      2000,
    ),
    range,
  };
};

const normalizeSnoozeMinutes = (config: ChallengeConfig): number[] => {
  if (!config.snoozeMinutes || !Array.isArray(config.snoozeMinutes)) return [];
  return config.snoozeMinutes.filter(value => typeof value === "number" && Number.isFinite(value)).map(value => Math.round(value)).filter(value => value > 0).sort((a, b) => a - b);
};

const AlarmChallengeRoot: React.FC = () => {
  const [state, setState] = useState<ScreenState>({ status: "loading" });

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const config = await AlarmChallengeBridge.getConfig();
        if (!mounted) return;

        const payload = parsePolicyPayload(config.policyPayload);
        const snoozeMinutes = normalizeSnoozeMinutes(config);

        if (config.policyMode === "math") {
          const mathSettings = resolveMathSettings(payload as MathPolicyPayload | null);
          setState({ status: "math", settings: mathSettings, snoozeMinutes });
          return;
        }

        if (config.policyMode === "shake") {
          const shakeSettings = resolveShakeSettings(payload as ShakePolicyPayload | null);
          setState({ status: "shake", settings: shakeSettings, snoozeMinutes });
          return;
        }

        if (config.policyMode === "puzzle") {
          const puzzleSettings = resolvePuzzleSettings(payload as PuzzlePolicyPayload | null);
          const enrichedSettings: PuzzleChallengeSettings = {
            ...puzzleSettings,
            seed: puzzleSettings.seed ?? Date.now(),
          };
          setState({ status: "puzzle", settings: enrichedSettings, snoozeMinutes });
          return;
        }

        AlarmChallengeBridge.fail(`지원하지 않는 도전 모드입니다: ${config.policyMode}`);
        setState({ status: "error", message: "지원하지 않는 도전 모드입니다." });
      } catch (error) {
        console.warn("[AlarmChallenge] Failed to load config", error);
        AlarmChallengeBridge.fail("도전 구성을 불러오지 못했습니다.");
        if (mounted) {
          setState({ status: "error", message: "구성을 불러오지 못했습니다." });
        }
      }
    };

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  if (state.status === "math") {
    return <MathChallenge settings={state.settings} snoozeMinutes={state.snoozeMinutes} />;
  }

  if (state.status === "shake") {
    return <ShakeChallenge settings={state.settings} snoozeMinutes={state.snoozeMinutes} />;
  }

  if (state.status === "puzzle") {
    return (
      <PuzzleChallenge
        size={state.settings.size}
        difficulty={state.settings.difficulty}
        seed={state.settings.seed}
        snoozeMinutes={state.snoozeMinutes}
        onReady={() => AlarmChallengeBridge.ready()}
        onComplete={() =>
          AlarmChallengeBridge.complete({
            expression: "puzzle",
            userAnswer: "completed",
            correctAnswer: "completed",
            isCorrect: true,
            attempts: 1,
            settings: {
              size: state.settings.size,
              difficulty: state.settings.difficulty,
            },
          })
        }
        onSnooze={minutes => AlarmChallengeBridge.snooze(minutes ?? state.snoozeMinutes[0])}
        onTimeout={() => AlarmChallengeBridge.fail("시간 초과로 퍼즐 미션을 완료하지 못했습니다.")}
      />
    );
  }

  const message = state.status === "error" ? state.message : "문제를 불러오는 중입니다...";

  return (
    <View style={styles.loadingContainer}>
      {state.status === "loading" ? <ActivityIndicator size="large" color="#60a5fa" /> : null}
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
  },
  loadingText: {
    marginTop: 16,
    color: "#e5e7eb",
    fontSize: 16,
  },
});

export default AlarmChallengeRoot;
