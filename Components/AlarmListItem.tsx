import React, { useMemo } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import dayjs from "dayjs";

import type { AlarmItem } from "../types/alarm.types";

type Props = {
  alarm: AlarmItem;
  onToggle: (value: boolean) => void;
  onPress: () => void;
};

const WEEK_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const AlarmListItem: React.FC<Props> = ({ alarm, onToggle, onPress }) => {
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

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.timeLabel}>{formattedTime}</Text>
        <Switch value={alarm.enabled} onValueChange={onToggle} />
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
});

export default AlarmListItem;
