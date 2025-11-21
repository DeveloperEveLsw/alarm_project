import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { RouteProp, useNavigation } from "@react-navigation/native";

import { AlarmEngine } from "../alarm/engine";
import type { RootStackParamList } from "../types/navigation.types";

type AlarmShakeScreenRoute = RouteProp<RootStackParamList, "AlarmShake">;

type Props = {
  route: AlarmShakeScreenRoute;
};

const AlarmShakeScreen: React.FC<Props> = ({ route }) => {
  const navigation = useNavigation();
  const { alarmId, targetShakes = 20 } = route.params;
  const [shakeCount, setShakeCount] = useState(0);

  useEffect(() => {
    AlarmEngine.send({ type: "UI_READY", id: alarmId, timestampUtc: Date.now() }).catch(console.error);
    return AlarmEngine.addListener(event => {
      if (event.id === alarmId && event.type === "DISMISSED") {
        navigation.goBack();
      }
    });
  }, [alarmId, navigation]);

  const handleShake = () => {
    setShakeCount(prev => {
      const next = prev + 1;
      if (next >= targetShakes) {
        AlarmEngine.send({ type: "DISMISS", id: alarmId }).catch(console.error);
      }
      return next;
    });
  };

  const handleSnooze = () => {
    AlarmEngine.send({ type: "SNOOZE", id: alarmId }).catch(console.error);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>휴대폰을 흔들어 깨기</Text>
      <Text style={styles.subtitle}>
        {targetShakes}회 흔들기까지 {Math.max(targetShakes - shakeCount, 0)}회 남았어요.
      </Text>
      <Pressable style={styles.shakeButton} onPress={handleShake}>
        <Text style={styles.shakeLabel}>흔들기</Text>
      </Pressable>
      <Pressable style={styles.snoozeButton} onPress={handleSnooze}>
        <Text style={styles.snoozeLabel}>5분만 더</Text>
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
    backgroundColor: "#0f172a",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#f8fafc",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#cbd5f5",
    marginBottom: 32,
    textAlign: "center",
  },
  shakeButton: {
    width: "80%",
    paddingVertical: 18,
    borderRadius: 999,
    backgroundColor: "#38bdf8",
    alignItems: "center",
    marginBottom: 20,
  },
  shakeLabel: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "700",
  },
  snoozeButton: {
    width: "80%",
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#94a3b8",
    alignItems: "center",
  },
  snoozeLabel: {
    color: "#e2e8f0",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default AlarmShakeScreen;
