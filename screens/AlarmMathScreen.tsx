import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable } from "react-native";
import { RouteProp, useNavigation } from "@react-navigation/native";

import { AlarmEngine } from "../alarm/engine";
import type { RootStackParamList } from "../types/navigation.types";

const buildSeededRandom = (seed: number | undefined) => {
  let state = (seed ?? Date.now()) % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

type AlarmMathScreenRoute = RouteProp<RootStackParamList, "AlarmMath">;

type Props = {
  route: AlarmMathScreenRoute;
};

const createEquation = (seed: number | undefined) => {
  const random = buildSeededRandom(seed);
  const a = Math.floor(random() * 50) + 10;
  const b = Math.floor(random() * 50) + 10;
  const operator = random() > 0.5 ? "-" : "+";
  const solution = operator === "+" ? a + b : a - b;
  return { a, b, operator, solution } as const;
};

const AlarmMathScreen: React.FC<Props> = ({ route }) => {
  const navigation = useNavigation();
  const { alarmId, seed } = route.params;
  const equation = useMemo(() => createEquation(seed), [seed]);
  const [answer, setAnswer] = useState("");
  const [mistake, setMistake] = useState<string | null>(null);

  useEffect(() => {
    AlarmEngine.send({ type: "UI_READY", id: alarmId, timestampUtc: Date.now() }).catch(console.error);
    return AlarmEngine.addListener(event => {
      if (event.id === alarmId && event.type === "DISMISSED") {
        navigation.goBack();
      }
    });
  }, [alarmId, navigation]);

  const verify = () => {
    const numeric = Number.parseInt(answer.trim(), 10);
    if (Number.isNaN(numeric)) {
      setMistake("숫자를 입력해 주세요.");
      return;
    }

    if (numeric !== equation.solution) {
      setMistake("정답이 아니에요. 다시 시도해 주세요.");
      return;
    }

    AlarmEngine.send({ type: "DISMISS", id: alarmId }).catch(console.error);
  };

  const handleSnooze = () => {
    AlarmEngine.send({ type: "SNOOZE", id: alarmId }).catch(console.error);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>기상 수학 챌린지</Text>
      <Text style={styles.subtitle}>아래 문제를 풀어야 알람이 꺼집니다.</Text>
      <Text style={styles.equation}>
        {equation.a} {equation.operator} {equation.b} = ?
      </Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={answer}
        onChangeText={text => {
          setAnswer(text);
          setMistake(null);
        }}
        placeholder="정답 입력"
      />
      {mistake ? <Text style={styles.error}>{mistake}</Text> : null}
      <Pressable style={styles.primaryButton} onPress={verify}>
        <Text style={styles.primaryLabel}>알람 끄기</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={handleSnooze}>
        <Text style={styles.secondaryLabel}>5분만 더</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f9fafc",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    marginBottom: 24,
    textAlign: "center",
  },
  equation: {
    fontSize: 32,
    fontWeight: "600",
    marginBottom: 24,
  },
  input: {
    width: "80%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    marginBottom: 16,
    backgroundColor: "#fff",
    textAlign: "center",
  },
  error: {
    color: "#d32f2f",
    marginBottom: 16,
  },
  primaryButton: {
    width: "80%",
    borderRadius: 8,
    paddingVertical: 14,
    backgroundColor: "#0091EA",
    marginBottom: 12,
    alignItems: "center",
  },
  primaryLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    width: "80%",
    borderRadius: 8,
    paddingVertical: 12,
    backgroundColor: "#e3f2fd",
    alignItems: "center",
  },
  secondaryLabel: {
    color: "#1976d2",
    fontSize: 15,
    fontWeight: "500",
  },
});

export default AlarmMathScreen;
