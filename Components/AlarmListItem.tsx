import React, { useMemo, useRef } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import dayjs from "dayjs";

import type { AlarmItem } from "../types/alarm.types";

type Props = {
  alarm: AlarmItem;
  onToggle: (value: boolean) => void;
  onPress: () => void;
  onLongPress?: () => void;
  onToggleSelection?: () => void;
  selectionMode?: boolean;
  selected?: boolean;
};

const WEEK_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const AlarmListItem: React.FC<Props> = ({
  alarm,
  onToggle,
  onPress,
  onLongPress,
  onToggleSelection,
  selectionMode = false,
  selected = false,
}) => {
  const nextTriggerLabel = useMemo(() => {
    if (!alarm.enabled || !alarm.nextTriggerAt) {
      return "꺼짐";
    }
    return dayjs(alarm.nextTriggerAt).format("M월 D일 (ddd) A h:mm");
  }, [alarm.enabled, alarm.nextTriggerAt]);

  const repeatLabel = useMemo(() => {
    if (alarm.repeatDays.length === 0) {
      return "반복 없음";
    }
    return `매주 ${alarm.repeatDays.map(day => WEEK_LABELS[day]).join(" ")}`;
  }, [alarm.repeatDays]);

  const displayHour = dayjs().hour(alarm.hour).minute(alarm.minute);
  const formattedTime = displayHour.format("A hh:mm");

  const longPressTriggeredRef = useRef(false);

  const handlePress = () => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    if (selectionMode) {
      onToggleSelection?.();
      return;
    }
    onPress();
  };

  const handleLongPress = () => {
    longPressTriggeredRef.current = true;
    onLongPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      android_ripple={{ color: "#e5e7eb" }}
      style={({ pressed }) => [
        styles.card,
        selectionMode && styles.cardSelecting,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
    >
      {selectionMode ? (
        <View style={[styles.selectionIndicator, selected && styles.selectionIndicatorSelected]}>
          {selected ? <Text style={styles.selectionIndicatorText}>✓</Text> : null}
        </View>
      ) : null}
      <View style={styles.header}>
        <Text style={styles.timeLabel}>{formattedTime}</Text>
        <Switch value={alarm.enabled} onValueChange={onToggle} disabled={selectionMode} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{alarm.label || "알람"}</Text>
        <Text style={styles.meta}>{repeatLabel}</Text>
        <Text style={styles.meta}>{nextTriggerLabel}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 24,
    shadowColor: "#00000022",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 16,
    position: "relative",
  },
  cardSelecting: {
    paddingLeft: 56,
  },
  cardSelected: {
    backgroundColor: "#e8f1ff",
  },
  cardPressed: {
    opacity: 0.9,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeLabel: {
    fontSize: 42,
    fontWeight: "600",
    color: "#111827",
  },
  body: {
    marginTop: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  meta: {
    marginTop: 4,
    fontSize: 13,
    color: "#6b7280",
  },
  selectionIndicator: {
    position: "absolute",
    left: 20,
    top: 22,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#cbd5f5",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  selectionIndicatorSelected: {
    borderColor: "#2563eb",
    backgroundColor: "#2563eb",
  },
  selectionIndicatorText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});

export default AlarmListItem;
