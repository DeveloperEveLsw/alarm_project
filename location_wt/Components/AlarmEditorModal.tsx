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
  Alert,
} from "react-native";
import WheelPicker from "@quidone/react-native-wheel-picker";
import type { AlarmDraft, AlarmRepeatDay, LocationBasedSettings } from "../types/alarm.types";
import { computeNextTrigger } from "../services/alarm/alarmService";
import { pickAlarmTone } from "../services/ringtonePicker";
import MapLocationPicker from "./MapLocationPicker";

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
  locationBased: draft.locationBased || null,
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
  const [showMapPicker, setShowMapPicker] = useState(false);

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

  const toggleLocationBased = useCallback(() => {
    setState(prev => ({
      ...prev,
      locationBased: prev.locationBased?.enabled ? null : {
        enabled: true,
        type: 'anywhere',
        radius: 100,
        conditionType: 'in_location'
      }
    }));
  }, []);

  const updateLocationType = useCallback((type: 'geofence' | 'location_condition' | 'anywhere') => {
    setState(prev => ({
      ...prev,
      locationBased: prev.locationBased ? {
        ...prev.locationBased,
        type
      } : null
    }));
  }, []);

  const updateLocationRadius = useCallback((radius: number) => {
    setState(prev => ({
      ...prev,
      locationBased: prev.locationBased ? {
        ...prev.locationBased,
        radius
      } : null
    }));
  }, []);

  const updateLocationCondition = useCallback((conditionType: 'in_location' | 'out_of_location') => {
    setState(prev => ({
      ...prev,
      locationBased: prev.locationBased ? {
        ...prev.locationBased,
        conditionType
      } : null
    }));
  }, []);

  const setCurrentLocation = useCallback(() => {
    Alert.alert(
      "현재 위치 설정",
      "현재 위치를 알람 위치로 설정하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        { 
          text: "설정", 
          onPress: () => {
            // 실제로는 현재 위치를 가져와야 함
            setState(prev => ({
              ...prev,
              locationBased: prev.locationBased ? {
                ...prev.locationBased,
                latitude: 37.5665, // 임시 서울시청 좌표
                longitude: 126.9780
              } : null
            }));
          }
        }
      ]
    );
  }, []);

  const openMapPicker = useCallback(() => {
    setShowMapPicker(true);
  }, []);

  const handleMapLocationSelect = useCallback((location: LocationBasedSettings) => {
    setState(prev => ({
      ...prev,
      locationBased: location
    }));
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
      policyMode: draft.policyMode ?? "normal",
      policyPayload: draft.policyPayload ?? null,
      locationBased: state.locationBased,
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

            {/* 위치기반 알람 설정 */}
            <View style={styles.sectionRow}>
              <View>
                <Text style={styles.sectionLabel}>위치기반 알람</Text>
                <Text style={styles.helperText}>특정 위치에서만 알람이 울립니다</Text>
              </View>
              <Switch
                value={state.locationBased?.enabled || false}
                onValueChange={toggleLocationBased}
              />
            </View>

            {/* 위치기반 설정 상세 옵션 */}
            {state.locationBased?.enabled && (
              <View style={styles.locationSection}>
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>위치 타입</Text>
                  <View style={styles.locationTypeRow}>
                    {[
                      { key: 'anywhere', label: '어디서나' },
                      { key: 'geofence', label: '지오펜싱' },
                      { key: 'location_condition', label: '위치 조건' }
                    ].map(({ key, label }) => (
                      <Pressable
                        key={key}
                        onPress={() => updateLocationType(key as any)}
                        style={[
                          styles.locationTypeButton,
                          state.locationBased?.type === key && styles.locationTypeButtonActive
                        ]}
                      >
                        <Text style={[
                          styles.locationTypeLabel,
                          state.locationBased?.type === key && styles.locationTypeLabelActive
                        ]}>
                          {label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {state.locationBased?.type !== 'anywhere' && (
                  <>
                    <View style={styles.section}>
                      <Text style={styles.sectionLabel}>반경 설정</Text>
                      <View style={styles.radiusRow}>
                        {[50, 100, 200, 500].map(radius => (
                          <Pressable
                            key={radius}
                            onPress={() => updateLocationRadius(radius)}
                            style={[
                              styles.radiusButton,
                              state.locationBased?.radius === radius && styles.radiusButtonActive
                            ]}
                          >
                            <Text style={[
                              styles.radiusLabel,
                              state.locationBased?.radius === radius && styles.radiusLabelActive
                            ]}>
                              {radius}m
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    <View style={styles.section}>
                      <Text style={styles.sectionLabel}>위치 조건</Text>
                      <View style={styles.conditionRow}>
                        {[
                          { key: 'in_location', label: '위치 내에서만' },
                          { key: 'out_of_location', label: '위치 밖에서만' }
                        ].map(({ key, label }) => (
                          <Pressable
                            key={key}
                            onPress={() => updateLocationCondition(key as any)}
                            style={[
                              styles.conditionButton,
                              state.locationBased?.conditionType === key && styles.conditionButtonActive
                            ]}
                          >
                            <Text style={[
                              styles.conditionLabel,
                              state.locationBased?.conditionType === key && styles.conditionLabelActive
                            ]}>
                              {label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    <Pressable style={styles.sectionRow} onPress={openMapPicker}>
                      <View>
                        <Text style={styles.sectionLabel}>지도에서 위치 선택</Text>
                        <Text style={styles.linkLabel}>
                          {state.locationBased?.latitude && state.locationBased?.longitude 
                            ? `위도: ${state.locationBased.latitude.toFixed(4)}, 경도: ${state.locationBased.longitude.toFixed(4)}`
                            : "지도를 탭하여 위치를 선택하세요"
                          }
                        </Text>
                      </View>
                      <Text style={styles.chevron}>{">"}</Text>
                    </Pressable>

                    <Pressable style={styles.sectionRow} onPress={setCurrentLocation}>
                      <View>
                        <Text style={styles.sectionLabel}>현재 위치 사용</Text>
                        <Text style={styles.linkLabel}>GPS로 현재 위치를 가져옵니다</Text>
                      </View>
                      <Text style={styles.chevron}>{">"}</Text>
                    </Pressable>
                  </>
                )}
              </View>
            )}
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

      <MapLocationPicker
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onLocationSelect={handleMapLocationSelect}
        initialLocation={state.locationBased}
      />
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
  // 위치기반 설정 스타일
  locationSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  locationTypeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  locationTypeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
    marginHorizontal: 4,
    alignItems: "center",
  },
  locationTypeButtonActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  locationTypeLabel: {
    fontSize: 12,
    color: "#4b5563",
  },
  locationTypeLabelActive: {
    color: "#fff",
    fontWeight: "600",
  },
  radiusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  radiusButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
    marginHorizontal: 4,
    alignItems: "center",
  },
  radiusButtonActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  radiusLabel: {
    fontSize: 12,
    color: "#4b5563",
  },
  radiusLabelActive: {
    color: "#fff",
    fontWeight: "600",
  },
  conditionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  conditionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
    marginHorizontal: 4,
    alignItems: "center",
  },
  conditionButtonActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  conditionLabel: {
    fontSize: 12,
    color: "#4b5563",
  },
  conditionLabelActive: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default AlarmEditorModal;
