import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { Operator } from "../../services/mathExpressions";
import { createSeededRandom } from "../../utils/seededRandom";

export type MathChallengeSettings = {
  termCount: number;
  includeMultiplication: boolean;
  avoidDivideByOne: boolean;
  maxAttempts: number;
  weights?: Partial<Record<Operator, number>>;
};

export type MathChallengeProps = {
  settings: MathChallengeSettings;
  snoozeMinutes?: number[];
  onReady?: () => void;
  onComplete?: (result: { expression: string; attempts: number }) => void;
  onSnooze?: (minutes?: number) => void;
};

type MathProblem = {
  expression: string;
  solution: number;
};

const OPERATORS: Operator[] = ["+", "-", "*", "/"];

const pickOperator = (settings: MathChallengeSettings, random: () => number): Operator => {
  const candidates = settings.includeMultiplication ? OPERATORS : OPERATORS.slice(0, 2);
  const weightSum = candidates.reduce((sum, operator) => {
    const weight = settings.weights?.[operator] ?? 1;
    return sum + (weight > 0 ? weight : 1);
  }, 0);
  const threshold = random() * weightSum;
  let cursor = 0;
  for (const operator of candidates) {
    const weight = settings.weights?.[operator] ?? 1;
    const normalized = weight > 0 ? weight : 1;
    if (cursor + normalized >= threshold) {
      return operator;
    }
    cursor += normalized;
  }
  return candidates[candidates.length - 1];
};

const generateOperand = (random: () => number, max = 20, min = 2): number => {
  const span = max - min + 1;
  return min + Math.floor(random() * span);
};

const buildMathProblem = (settings: MathChallengeSettings, seed?: number): MathProblem => {
  const random = createSeededRandom(seed);
  const termCount = Math.max(2, Math.min(12, Math.round(settings.termCount)));
  let current = generateOperand(random);
  const parts: string[] = [`${current}`];

  for (let index = 1; index < termCount; index += 1) {
    const operator = pickOperator(settings, random);
    let operand = generateOperand(random);
    if (operator === "/" && settings.avoidDivideByOne && operand === 1) {
      operand = 2;
    }
    if (operator === "/") {
      if (operand === 0) {
        operand = 2;
      }
      if (current % operand !== 0) {
        current = current * operand;
        parts[parts.length - 1] = `${current}`;
      }
    }
    switch (operator) {
      case "+":
        current += operand;
        break;
      case "-":
        current -= operand;
        break;
      case "*":
        current *= operand;
        break;
      case "/":
        current /= operand;
        break;
      default:
        break;
    }
    parts.push(`${operator === "*" ? "×" : operator === "/" ? "÷" : operator}`);
    parts.push(`${operand}`);
  }

  return { expression: parts.join(" "), solution: current };
};

const MathChallenge: React.FC<MathChallengeProps> = ({ settings, snoozeMinutes, onReady, onComplete, onSnooze }) => {
  const [problemSeed, setProblemSeed] = useState(() => Date.now());
  const [problem, setProblem] = useState<MathProblem>(() => buildMathProblem(settings, problemSeed));
  const [answer, setAnswer] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(() => Math.max(1, settings.maxAttempts));
  const [feedback, setFeedback] = useState<string | null>(null);
  const [status, setStatus] = useState<"playing" | "success">("playing");

  useEffect(() => {
    setProblem(buildMathProblem(settings, problemSeed));
    setStatus("playing");
    setFeedback(null);
    setAnswer("");
    setAttemptsLeft(Math.max(1, settings.maxAttempts));
  }, [problemSeed, settings]);

  const readyRef = useRef(false);
  useEffect(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    onReady?.();
  }, [onReady]);

  const validateAnswer = useCallback(() => {
    if (status !== "playing") {
      return;
    }
    const numeric = Number.parseFloat(answer.trim());
    if (!Number.isFinite(numeric)) {
      setFeedback("정답을 숫자로 입력해 주세요.");
      return;
    }
    if (Math.abs(numeric - problem.solution) < 0.00001) {
      setStatus("success");
      setFeedback("정답입니다!");
      onComplete?.({ expression: problem.expression, attempts: Math.max(1, settings.maxAttempts - attemptsLeft + 1) });
      return;
    }
    const nextAttempts = attemptsLeft - 1;
    setAttemptsLeft(nextAttempts);
    if (nextAttempts <= 0) {
      Alert.alert("재도전 필요", "시도 가능한 횟수를 모두 사용했습니다. 새로운 문제로 다시 도전해 보세요.");
      setProblemSeed(Date.now());
      return;
    }
    setFeedback(`정답이 아닙니다. 기회가 ${nextAttempts}번 남았습니다.`);
  }, [answer, attemptsLeft, problem.expression, problem.solution, onComplete, settings.maxAttempts, status]);

  const handleSnooze = useCallback(() => {
    if (status !== "playing") return;
    const minutes = snoozeMinutes?.[0];
    onSnooze?.(minutes);
  }, [onSnooze, snoozeMinutes, status]);

  const handleRefresh = useCallback(() => {
    setProblemSeed(Date.now());
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>기상 수학 미션</Text>
      <Text style={styles.subtitle}>문제를 정확히 풀면 알람이 해제됩니다.</Text>
      <View style={styles.expressionCard}>
        <Text style={styles.expressionText}>{problem.expression}</Text>
      </View>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={answer}
        editable={status === "playing"}
        onChangeText={text => {
          setAnswer(text);
          setFeedback(null);
        }}
        placeholder="정답을 입력하세요"
      />
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      <Text style={styles.attempts}>남은 기회: {attemptsLeft}회</Text>
      <Pressable style={[styles.primaryButton, status === "success" ? styles.primaryDisabled : null]} onPress={validateAnswer} disabled={status !== "playing"}>
        <Text style={styles.primaryLabel}>{status === "success" ? "완료" : "정답 제출"}</Text>
      </Pressable>
      <View style={styles.row}>
        <Pressable style={[styles.secondaryButton, styles.buttonHalf]} onPress={handleRefresh}>
          <Text style={styles.secondaryLabel}>새 문제</Text>
        </Pressable>
        <Pressable style={[styles.ghostButton, styles.buttonHalf]} onPress={handleSnooze}>
          <Text style={styles.ghostLabel}>{snoozeMinutes?.[0] ? `${snoozeMinutes[0]}분 뒤에` : "5분 뒤에"} 다시 울리기</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#0f172a",
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#f8fafc",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#cbd5f5",
    textAlign: "center",
    marginBottom: 24,
  },
  expressionCard: {
    backgroundColor: "#1e293b",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  expressionText: {
    color: "#f1f5f9",
    fontSize: 32,
    textAlign: "center",
    fontWeight: "700",
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "#111827",
    color: "#f8fafc",
    fontSize: 18,
  },
  feedback: {
    color: "#fca5a5",
    marginTop: 12,
    textAlign: "center",
    fontWeight: "600",
  },
  attempts: {
    color: "#cbd5f5",
    marginTop: 20,
    textAlign: "center",
  },
  primaryButton: {
    marginTop: 20,
    backgroundColor: "#22d3ee",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  primaryDisabled: {
    opacity: 0.6,
  },
  primaryLabel: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  buttonHalf: {
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: "#1e293b",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryLabel: {
    color: "#e5e7eb",
    fontWeight: "600",
  },
  ghostButton: {
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#475569",
    alignItems: "center",
  },
  ghostLabel: {
    color: "#94a3b8",
    fontWeight: "600",
  },
});

export default MathChallenge;
