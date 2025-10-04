import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import WheelPicker from "@quidone/react-native-wheel-picker";
import type { AlarmDraft, AlarmRepeatDay } from "../types/alarm.types";
import { computeNextTrigger } from "../services/alarm/alarmService";
import { pickAlarmTone } from "../services/ringtonePicker";

const WEEK_LABELS: Record<AlarmRepeatDay, string> = {
  0: "일",
  1: "월",
  2: "화",
  3: "수",
  4: "목",
  5: "금",
  6: "토",
};

type Props = {
  visible: boolean;
  draft: AlarmDraft;
  onSave: (value: AlarmDraft) => void;
  onCancel: () => void;
};

const buildInitialState = (draft: AlarmDraft) => ({
  id: draft.id,
  label: draft.label,
  repeatDays: draft.repeatDays,
  skipHolidays: draft.skipHolidays,
  sound: draft.sound,
  vibrate: draft.vibrate,
  hour: draft.hour,
  minute: draft.minute,
});

const toDisplayHour = (hour: number): number => {
  const normalized = hour % 12;
  return normalized === 0 ? 12 : normalized;
};

const toIsMorning = (hour: number): boolean => hour < 12;

const to24Hour = (displayHour: number, isMorning: boolean): number => {
  const normalized = displayHour % 12;
  if (isMorning) {
    return normalized === 12 ? 0 : normalized;
  }
  return normalized === 12 ? 12 : normalized + 12;
};

const AlarmEditorModal: React.FC<Props> = ({ visible, draft, onSave, onCancel }) => {
  const [state, setState] = useState(() => buildInitialState(draft));
  const [isMorning, setIsMorning] = useState(() => toIsMorning(draft.hour));

  useEffect(() => {
    setState(buildInitialState(draft));
    setIsMorning(toIsMorning(draft.hour));
  }, [draft]);

  const hourData = useMemo(
    () =>
      [...Array(12).keys()].map(index => {
        const display = index + 1;
        return { label: String(display), value: display };
      }),
    [],
  );

  const minuteData = useMemo(
    () =>
      [...Array(60).keys()].map(value => ({
        label: String(value).padStart(2, "0"),
        value,
      })),
    [],
  );

  const toggleRepeatDay = useCallback((day: AlarmRepeatDay) => {
    setState(prev => {
      const exists = prev.repeatDays.includes(day);
      const repeatDays = exists
        ? prev.repeatDays.filter(item => item !== day)
        : [...prev.repeatDays, day].sort((a, b) => a - b);
      return { ...prev, repeatDays };
    });
  }, []);

  const handlePickSound = useCallback(async () => {
    const result = await pickAlarmTone(state.sound);
    if (!result) return;
    setState(prev => ({ ...prev, sound: result }));
  }, [state.sound]);

  const soundLabel = useMemo(() => {
    if (!state.sound) return "기본 알람음";
    if (state.sound.startsWith("content://") || state.sound.startsWith("file://")) {
      return "시스템 알람음";
    }
    return state.sound;
  }, [state.sound]);

  const nextTriggerLabel = useMemo(() => {
    const next = computeNextTrigger({
      hour: state.hour,
      minute: state.minute,
      label: state.label,
      repeatDays: state.repeatDays,
      skipHolidays: state.skipHolidays,
      sound: state.sound,
      vibrate: state.vibrate,
    });
    return next.format("M월 D일(ddd) A h:mm");
  }, [state]);

  useEffect(() => {
    setState(prev => ({
      ...prev,
      hour: to24Hour(toDisplayHour(prev.hour), isMorning),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMorning]);

  const handleHourChange = useCallback(
    (displayHour: number) => {
      setState(prev => ({
        ...prev,
        hour: to24Hour(displayHour, isMorning),
      }));
    },
    [isMorning],
  );

  const handleMinuteChange = useCallback((minute: number) => {
    setState(prev => ({ ...prev, minute }));
  }, []);

  const handleSave = useCallback(() => {
    const trimmedLabel = state.label.trim();
    const payload: AlarmDraft = {
      id: state.id,
      label: trimmedLabel,
      hour: state.hour,
      minute: state.minute,
      repeatDays: state.repeatDays,
      skipHolidays: state.skipHolidays,
      sound: state.sound,
      vibrate: state.vibrate,
    };
    onSave(payload);
  }, [onSave, state]);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>알람 설정</Text>
          <View style={styles.timePickerRow}>
            <View style={styles.periodColumn}>
              {(["오전", "오후"] as const).map(label => {
                const selected = (label === "오전" && isMorning) || (label === "오후" && !isMorning);
                return (
                  <Pressable
                    key={label}
                    onPress={() => setIsMorning(label === "오전")}
                    style={[styles.periodButton, selected && styles.periodButtonActive]}
                  >
                    <Text style={[styles.periodLabel, selected && styles.periodLabelActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.wheelColumn}>
              <WheelPicker
                data={hourData}
                value={toDisplayHour(state.hour)}
                onValueChanged={({ item }) => handleHourChange(item.value as number)}
                style={styles.wheel}
              />
            </View>
            <Text style={styles.timeColon}>:</Text>
            <View style={styles.wheelColumn}>
              <WheelPicker
                data={minuteData}
                value={state.minute}
                onValueChanged={({ item }) => handleMinuteChange(item.value as number)}
                style={styles.wheel}
              />
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>다음 울림</Text>
              <Text style={styles.sectionValue}>{nextTriggerLabel}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>알람 이름</Text>
              <TextInput
                value={state.label}
                onChangeText={text => setState(prev => ({ ...prev, label: text }))}
                placeholder="알람 이름"
                style={styles.textInput}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>반복 요일</Text>
              <View style={styles.weekRow}>
                {Object.keys(WEEK_LABELS).map(key => {
                  const day = Number(key) as AlarmRepeatDay;
                  const active = state.repeatDays.includes(day);
                  return (
                    <Pressable
                      key={day}
                      onPress={() => toggleRepeatDay(day)}
                      style={[styles.weekChip, active && styles.weekChipActive]}
                    >
                      <Text style={[styles.weekChipLabel, active && styles.weekChipLabelActive]}>
                        {WEEK_LABELS[day]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.sectionRow}>
              <View>
                <Text style={styles.sectionLabel}>공휴일에는 끄기</Text>
                <Text style={styles.helperText}>대체/임시 공휴일까지 포함합니다.</Text>
              </View>
              <Switch
                value={state.skipHolidays}
                onValueChange={value => setState(prev => ({ ...prev, skipHolidays: value }))}
              />
            </View>

            <Pressable style={styles.sectionRow} onPress={handlePickSound}>
              <View>
                <Text style={styles.sectionLabel}>알람음</Text>
                <Text style={styles.linkLabel}>{soundLabel}</Text>
              </View>
              <Text style={styles.chevron}>{">"}</Text>
            </Pressable>

            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>진동</Text>
              <Switch
                value={state.vibrate}
                onValueChange={value => setState(prev => ({ ...prev, vibrate: value }))}
              />
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={styles.actionButton} onPress={onCancel}>
              <Text style={styles.actionLabel}>취소</Text>
            </Pressable>
            <Pressable style={[styles.actionButton, styles.primaryActionButton]} onPress={handleSave}>
              <Text style={[styles.actionLabel, styles.primaryActionLabel]}>저장</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#00000055",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    borderRadius: 24,
    backgroundColor: "#fff",
    paddingVertical: 24,
    paddingHorizontal: 20,
    maxHeight: "90%",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    color: "#111827",
  },
  timePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 12,
  },
  periodColumn: {
    marginRight: 12,
    justifyContent: "center",
  },
  periodButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
    marginBottom: 8,
  },
  periodButtonActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  periodLabel: {
    fontSize: 14,
    color: "#374151",
    textAlign: "center",
  },
  periodLabelActive: {
    color: "#fff",
    fontWeight: "600",
  },
  wheelColumn: {
    width: 80,
    height: 160,
  },
  wheel: {
    width: "100%",
    height: "100%",
  },
  timeColon: {
    fontSize: 32,
    fontWeight: "600",
    marginHorizontal: 8,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  section: {
    marginTop: 16,
  },
  sectionRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
  },
  sectionValue: {
    marginTop: 4,
    fontSize: 14,
    color: "#4b5563",
  },
  helperText: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
  },
  textInput: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  weekChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  weekChipActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  weekChipLabel: {
    fontSize: 14,
    color: "#4b5563",
  },
  weekChipLabelActive: {
    color: "#fff",
    fontWeight: "600",
  },
  linkLabel: {
    marginTop: 4,
    fontSize: 14,
    color: "#2563eb",
    textDecorationLine: "underline",
  },
  chevron: {
    fontSize: 20,
    color: "#9ca3af",
  },
  actions: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 6,
    alignItems: "center",
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  primaryActionButton: {
    backgroundColor: "#2563eb",
  },
  primaryActionLabel: {
    color: "#fff",
  },
});

export default AlarmEditorModal;
