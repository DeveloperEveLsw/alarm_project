import React, { useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { RouteProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { AlarmEngine } from "../alarm/engine";
import type { RootStackParamList } from "../types/navigation.types";

type AlarmScreenRoute = RouteProp<RootStackParamList, "Alarm">;

type Props = {
  route: AlarmScreenRoute;
};

const AlarmScreen: React.FC<Props> = ({ route }) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { alarmId } = route.params;

  useEffect(() => {
    AlarmEngine.send({ type: "UI_READY", id: alarmId, timestampUtc: Date.now() }).catch(console.error);
    return AlarmEngine.addListener(event => {
      if (event.id !== alarmId) return;
      if (event.type === "DISMISSED" || event.type === "SNOOZED") {
        navigation.goBack();
      }
    });
  }, [alarmId, navigation]);

  const dismiss = () => {
    AlarmEngine.send({ type: "DISMISS", id: alarmId }).catch(console.error);
  };

  const snooze = () => {
    AlarmEngine.send({ type: "SNOOZE", id: alarmId }).catch(console.error);
  };

  const stopNativeRing = () => {
    AlarmEngine.send({ type: "STOP_NATIVE", id: alarmId }).catch(console.error);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alarm is ringing</Text>
      <Text style={styles.subtitle}>Choose what to do next or move to another mission screen.</Text>
      <Pressable style={styles.primaryButton} onPress={dismiss}>
        <Text style={styles.primaryLabel}>Dismiss alarm</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={snooze}>
        <Text style={styles.secondaryLabel}>Snooze 5 minutes</Text>
      </Pressable>
      <Pressable style={styles.tertiaryButton} onPress={stopNativeRing}>
        <Text style={styles.tertiaryLabel}>Silence native sound</Text>
      </Pressable>
      <Pressable style={styles.linkButton} onPress={() => navigation.navigate('AlarmPermissions')}>
        <Text style={styles.linkLabel}>Review alarm permission guide</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#111827",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#f8fafc",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#cbd5f5",
    marginBottom: 32,
    textAlign: "center",
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: "#f97316",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  primaryLabel: {
    color: "#fff7ed",
    fontSize: 18,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#22d3ee",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  secondaryLabel: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "600",
  },
  tertiaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#475569",
  },
  tertiaryLabel: {
    color: "#e2e8f0",
    fontSize: 15,
    fontWeight: "500",
  },
  linkButton: {
    alignItems: "center",
  },
  linkLabel: {
    color: "#38bdf8",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default AlarmScreen;
