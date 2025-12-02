import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DeviceEventEmitter, Platform, Pressable, StyleSheet, Text, View } from "react-native";

export type ShakeChallengeSettings = {
  targetShakes: number;
  threshold: number;
  intervalMs: number;
  range: { min: number; max: number };
};

export type ShakeChallengeProps = {
  settings: ShakeChallengeSettings;
  snoozeMinutes?: number[];
  onReady?: () => void;
  onComplete?: (payload: { shakes: number }) => void;
  onSnooze?: (minutes?: number) => void;
};

const ShakeChallenge: React.FC<ShakeChallengeProps> = ({ settings, snoozeMinutes, onReady, onComplete, onSnooze }) => {
  const [shakeCount, setShakeCount] = useState(0);
  const [status, setStatus] = useState<"playing" | "success">("playing");
  const [lastShakeAt, setLastShakeAt] = useState<number>(0);

  const target = useMemo(() => Math.max(1, settings.targetShakes), [settings.targetShakes]);

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  const handleShakeDetected = useCallback(() => {
    if (status !== "playing") return;
    const now = Date.now();
    if (now - lastShakeAt < settings.intervalMs) {
      return;
    }
    setLastShakeAt(now);
    setShakeCount(prev => {
      const next = Math.min(target, prev + 1);
      if (next >= target) {
        setStatus("success");
        onComplete?.({ shakes: next });
      }
      return next;
    });
  }, [lastShakeAt, onComplete, settings.intervalMs, status, target]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const subscription = DeviceEventEmitter.addListener("ShakeEvent", handleShakeDetected);
    return () => {
      subscription.remove();
    };
  }, [handleShakeDetected]);

  const handleManualShake = useCallback(() => {
    handleShakeDetected();
  }, [handleShakeDetected]);

  const handleSnooze = useCallback(() => {
    if (status !== "playing") return;
    const minutes = snoozeMinutes?.[0];
    onSnooze?.(minutes);
  }, [onSnooze, snoozeMinutes, status]);

  const progress = shakeCount / target;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>흔들기 미션</Text>
      <Text style={styles.subtitle}>휴대폰을 힘차게 흔들어 목표를 달성하세요.</Text>
      <View style={styles.counterCard}>
        <Text style={styles.counterValue}>{shakeCount}</Text>
        <Text style={styles.counterTarget}>/ {target}</Text>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${Math.min(100, progress * 100)}%` }]} />
      </View>
      <Text style={styles.helper}>{target - shakeCount}번 더 흔들면 알람이 해제됩니다.</Text>

      <Pressable style={[styles.primaryButton, status === "success" ? styles.primaryDisabled : null]} onPress={handleManualShake} disabled={status !== "playing"}>
        <Text style={styles.primaryLabel}>{status === "success" ? "완료" : "흔들기 버튼"}</Text>
      </Pressable>

      <Pressable style={styles.ghostButton} onPress={handleSnooze}>
        <Text style={styles.ghostLabel}>{snoozeMinutes?.[0] ? `${snoozeMinutes[0]}분 뒤에` : "5분 뒤에"} 다시 울리기</Text>
      </Pressable>
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
  counterCard: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#334155",
    paddingVertical: 24,
    backgroundColor: "#1e293b",
  },
  counterValue: {
    color: "#f8fafc",
    fontSize: 56,
    fontWeight: "800",
  },
  counterTarget: {
    color: "#94a3b8",
    fontSize: 20,
    marginLeft: 8,
  },
  progressBar: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#1f2937",
    marginTop: 24,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#22d3ee",
  },
  helper: {
    color: "#cbd5f5",
    textAlign: "center",
    marginTop: 12,
  },
  primaryButton: {
    marginTop: 28,
    backgroundColor: "#38bdf8",
    paddingVertical: 18,
    borderRadius: 24,
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
  ghostButton: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  ghostLabel: {
    color: "#94a3b8",
    fontWeight: "600",
  },
});

export default ShakeChallenge;
