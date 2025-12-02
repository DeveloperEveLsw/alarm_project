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
import type { AlarmDraft, AlarmPolicyMode, AlarmRepeatDay } from "../types/alarm.types";
import type { PuzzlePolicyPayload, PuzzleDifficulty } from "../types/puzzle.types";
import { computeNextTrigger } from "../services/alarm/alarmService";
import { pickAlarmTone } from "../services/ringtonePicker";
import type { Operator } from "../services/mathExpressions";
import { DEFAULT_SHAKE_TARGET_MAX, DEFAULT_SHAKE_TARGET_MIN, sanitizeShakeTarget } from "../utils/shakeTarget";
import LocationPicker from "./LocationPicker";

const WEEK_LABELS: Record<AlarmRepeatDay, string> = {
  0: "일",
  1: "월",
  2: "화",
  3: "수",
  4: "목",
  5: "금",
  6: "토",
};

type MissionDifficulty = "easy" | "normal" | "hard" | "custom";

type MathMissionFormState = {
  difficulty: MissionDifficulty;
  termCount: string;
  includeMultiplication: boolean;
  avoidDivideByOne: boolean;
  maxAttempts: string;
  presencePenalty: string;
  frequencyPenalty: string;
  weightAdd: string;
  weightSubtract: string;
  weightMultiply: string;
  weightDivide: string;
};

type ShakeMissionFormState = {
  targetShakes: string;
  minTarget: string;
  maxTarget: string;
  threshold: string;
  intervalMs: string;
};

type PuzzleMissionFormState = {
  size: string;
  difficulty: PuzzleDifficulty;
};

type Props = {
  visible: boolean;
  draft: AlarmDraft;
  onSave: (value: AlarmDraft) => void;
  onCancel: () => void;
};

const DIFFICULTY_PRESETS: Record<Exclude<MissionDifficulty, "custom">, Pick<MathMissionFormState, "termCount" | "includeMultiplication" | "maxAttempts" | "presencePenalty" | "frequencyPenalty">> = {
  easy: { termCount: "3", includeMultiplication: false, maxAttempts: "4", presencePenalty: "0", frequencyPenalty: "0" },
  normal: { termCount: "4", includeMultiplication: true, maxAttempts: "3", presencePenalty: "0", frequencyPenalty: "0" },
  hard: { termCount: "6", includeMultiplication: true, maxAttempts: "2", presencePenalty: "0.1", frequencyPenalty: "0.15" },
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
  policyMode: draft.policyMode ?? "normal",
  policyPayload: draft.policyPayload ?? null,
  alarmSetId: draft.alarmSetId ?? null,
  geofenceLocation: draft.geofenceLocation ?? null,
});

const defaultMathFormState = (): MathMissionFormState => ({
  difficulty: "normal",
  termCount: "4",
  includeMultiplication: true,
  avoidDivideByOne: true,
  maxAttempts: "3",
  presencePenalty: "",
  frequencyPenalty: "",
  weightAdd: "",
  weightSubtract: "",
  weightMultiply: "",
  weightDivide: "",
});

const toNumberString = (value: unknown): string => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
};

const buildMathFormFromPayload = (payload: unknown): MathMissionFormState => {
  const base = defaultMathFormState();
  if (!payload || typeof payload !== "object") {
    return base;
  }
  const source = payload as Record<string, unknown>;

  const difficulty = source.difficulty;
  if (difficulty === "easy" || difficulty === "normal" || difficulty === "hard") {
    base.difficulty = difficulty;
    const preset = DIFFICULTY_PRESETS[difficulty];
    base.termCount = preset.termCount;
    base.includeMultiplication = preset.includeMultiplication;
    base.maxAttempts = preset.maxAttempts;
    base.presencePenalty = preset.presencePenalty;
    base.frequencyPenalty = preset.frequencyPenalty;
  } else {
    base.difficulty = "custom";
  }

  if (typeof source.termCount === "number" && Number.isFinite(source.termCount)) {
    base.termCount = String(source.termCount);
  }
  if (typeof source.includeMultiplication === "boolean") {
    base.includeMultiplication = source.includeMultiplication;
  }
  if (typeof source.avoidDivideByOne === "boolean") {
    base.avoidDivideByOne = source.avoidDivideByOne;
  }
  if (typeof source.maxAttempts === "number" && Number.isFinite(source.maxAttempts)) {
    base.maxAttempts = String(source.maxAttempts);
  }
  base.presencePenalty = toNumberString(source.presencePenalty);
  base.frequencyPenalty = toNumberString(source.frequencyPenalty);

  const weights = source.weights;
  if (weights && typeof weights === "object") {
    const map = weights as Record<string, unknown>;
    base.weightAdd = toNumberString(map["+"]);
    base.weightSubtract = toNumberString(map["-"]);
    base.weightMultiply = toNumberString(map["*"]);
    base.weightDivide = toNumberString(map["/"]);
  }

  return base;
};

const defaultShakeFormState = (): ShakeMissionFormState => ({
  targetShakes: "20",
  minTarget: String(DEFAULT_SHAKE_TARGET_MIN),
  maxTarget: String(DEFAULT_SHAKE_TARGET_MAX),
  threshold: "2.7",
  intervalMs: "350",
});

const buildShakeFormFromPayload = (payload: unknown): ShakeMissionFormState => {
  const base = defaultShakeFormState();
  if (!payload || typeof payload !== "object") {
    return base;
  }
  const source = payload as Record<string, unknown>;
  if (typeof source.targetShakes === "number" && Number.isFinite(source.targetShakes)) {
    base.targetShakes = String(source.targetShakes);
  }
  if (typeof source.minTargetShakes === "number" && Number.isFinite(source.minTargetShakes)) {
    base.minTarget = String(source.minTargetShakes);
  }
  if (typeof source.maxTargetShakes === "number" && Number.isFinite(source.maxTargetShakes)) {
    base.maxTarget = String(source.maxTargetShakes);
  }
  if (typeof source.threshold === "number" && Number.isFinite(source.threshold)) {
    base.threshold = String(source.threshold);
  }
  if (typeof source.intervalMs === "number" && Number.isFinite(source.intervalMs)) {
    base.intervalMs = String(source.intervalMs);
  }
  return base;
};

const clampNumber = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const parseIntegerField = (value: string, fallback: number, min: number, max: number): number => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return clampNumber(fallback, min, max);
  return clampNumber(parsed, min, max);
};

const parseFloatField = (value: string, fallback: number, min: number, max: number): number => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return clampNumber(fallback, min, max);
  return clampNumber(parsed, min, max);
};

const sanitizeFloatInput = (value: string): string => {
  const digits = value.replace(/[^0-9.]/g, "");
  const dotIndex = digits.indexOf(".");
  if (dotIndex === -1) return digits;
  return `${digits.slice(0, dotIndex + 1)}${digits.slice(dotIndex + 1).replace(/\./g, "")}`;
};

const buildMathPayload = (form: MathMissionFormState) => {
  const termCount = parseIntegerField(form.termCount, 4, 2, 12);
  const maxAttempts = parseIntegerField(form.maxAttempts, 3, 1, 10);
  const presencePenalty = form.presencePenalty ? parseFloatField(form.presencePenalty, 0, 0, 10) : undefined;
  const frequencyPenalty = form.frequencyPenalty ? parseFloatField(form.frequencyPenalty, 0, 0, 10) : undefined;

  const weights: Partial<Record<Operator, number>> = {};
  const weightEntries: Array<[Operator, string]> = [
    ["+", form.weightAdd],
    ["-", form.weightSubtract],
    ["*", form.weightMultiply],
    ["/", form.weightDivide],
  ];

  weightEntries.forEach(([op, value]) => {
    if (!value) return;
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      weights[op] = parsed;
    }
  });

  const payload: Record<string, unknown> = {
    termCount,
    includeMultiplication: form.includeMultiplication,
    avoidDivideByOne: form.avoidDivideByOne,
    maxAttempts,
  };

  if (form.difficulty !== "custom") {
    payload.difficulty = form.difficulty;
  }
  if (presencePenalty !== undefined) {
    payload.presencePenalty = presencePenalty;
  }
  if (frequencyPenalty !== undefined) {
    payload.frequencyPenalty = frequencyPenalty;
  }
  if (Object.keys(weights).length > 0) {
    payload.weights = weights;
  }

  return payload;
};

const buildShakePayload = (form: ShakeMissionFormState) => {
  const minTarget = parseIntegerField(form.minTarget, DEFAULT_SHAKE_TARGET_MIN, 1, 200);
  let maxTarget = parseIntegerField(form.maxTarget, DEFAULT_SHAKE_TARGET_MAX, minTarget, 200);
  if (maxTarget < minTarget) {
    maxTarget = minTarget;
  }

  let targetShakes = sanitizeShakeTarget(parseIntegerField(form.targetShakes, 20, minTarget, 200));
  if (targetShakes < minTarget) {
    targetShakes = minTarget;
  } else if (targetShakes > maxTarget) {
    targetShakes = maxTarget;
  }

  const threshold = parseFloatField(form.threshold, 2.7, 0.8, 8);
  const intervalMs = parseIntegerField(form.intervalMs, 350, 100, 2000);

  return {
    targetShakes,
    minTargetShakes: minTarget,
    maxTargetShakes: maxTarget,
    threshold,
    intervalMs,
  };
};

const defaultPuzzleFormState = (): PuzzleMissionFormState => ({
  size: "4",
  difficulty: "medium",
});

const buildPuzzleFormFromPayload = (payload: unknown): PuzzleMissionFormState => {
  const base = defaultPuzzleFormState();
  if (!payload || typeof payload !== "object") {
    return base;
  }
  const source = payload as Record<string, unknown>;
  if (typeof source.size === "number" && Number.isFinite(source.size)) {
    base.size = String(Math.min(6, Math.max(3, Math.round(source.size))));
  }
  if (source.difficulty === "easy" || source.difficulty === "medium" || source.difficulty === "hard") {
    base.difficulty = source.difficulty;
  }
  return base;
};

const buildPuzzlePayload = (form: PuzzleMissionFormState): PuzzlePolicyPayload => {
  let parsedSize = Number.parseInt(form.size, 10);
  if (!Number.isFinite(parsedSize)) {
    parsedSize = 4;
  }
  parsedSize = Math.min(6, Math.max(3, parsedSize));
  return {
    size: parsedSize as PuzzlePolicyPayload["size"],
    difficulty: form.difficulty,
  };
};

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
  const [mathForm, setMathForm] = useState<MathMissionFormState>(() =>
    draft.policyMode === "math" ? buildMathFormFromPayload(draft.policyPayload) : defaultMathFormState(),
  );
  const [shakeForm, setShakeForm] = useState<ShakeMissionFormState>(() =>
    draft.policyMode === "shake" ? buildShakeFormFromPayload(draft.policyPayload) : defaultShakeFormState(),
  );
  const [puzzleForm, setPuzzleForm] = useState<PuzzleMissionFormState>(() =>
    draft.policyMode === "puzzle" ? buildPuzzleFormFromPayload(draft.policyPayload) : defaultPuzzleFormState(),
  );
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  useEffect(() => {
    setState(buildInitialState(draft));
    setIsMorning(toIsMorning(draft.hour));
    setMathForm(draft.policyMode === "math" ? buildMathFormFromPayload(draft.policyPayload) : defaultMathFormState());
    setShakeForm(draft.policyMode === "shake" ? buildShakeFormFromPayload(draft.policyPayload) : defaultShakeFormState());
    setPuzzleForm(draft.policyMode === "puzzle" ? buildPuzzleFormFromPayload(draft.policyPayload) : defaultPuzzleFormState());
  }, [draft]);

  const periodData = useMemo(
    () => [
      { label: "오전", value: "am" },
      { label: "오후", value: "pm" },
    ],
    [],
  );

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

  const handleMissionModeChange = useCallback((mode: AlarmPolicyMode) => {
    setState(prev => ({ ...prev, policyMode: mode }));
  }, []);

  const handleDifficultyChange = useCallback((difficulty: MissionDifficulty) => {
    setMathForm(prev => {
      if (difficulty === "custom") {
        return { ...prev, difficulty };
      }
      const preset = DIFFICULTY_PRESETS[difficulty];
      return {
        ...prev,
        difficulty,
        termCount: preset.termCount,
        includeMultiplication: preset.includeMultiplication,
        maxAttempts: preset.maxAttempts,
        presencePenalty: preset.presencePenalty,
        frequencyPenalty: preset.frequencyPenalty,
      };
    });
  }, []);

  const handleMathIntegerChange = useCallback((key: keyof MathMissionFormState, value: string) => {
    setMathForm(prev => ({ ...prev, [key]: value.replace(/[^0-9]/g, "") }));
  }, []);

  const handleMathFloatChange = useCallback((key: keyof MathMissionFormState, value: string) => {
    setMathForm(prev => ({ ...prev, [key]: sanitizeFloatInput(value) }));
  }, []);

  const handleMathSwitchChange = useCallback((key: keyof MathMissionFormState, value: boolean) => {
    setMathForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleShakeFieldChange = useCallback((key: keyof ShakeMissionFormState, value: string) => {
    setShakeForm(prev => {
      if (key === "threshold") {
        return { ...prev, [key]: sanitizeFloatInput(value) };
      }
      return { ...prev, [key]: value.replace(/[^0-9]/g, "") };
    });
  }, []);

  const handlePuzzleSizeChange = useCallback((size: number) => {
    setPuzzleForm(prev => ({ ...prev, size: String(size) }));
  }, []);

  const handlePuzzleDifficultyChange = useCallback((value: PuzzleDifficulty) => {
    setPuzzleForm(prev => ({ ...prev, difficulty: value }));
  }, []);

  const handleLocationSelected = useCallback((location: {
    latitude: number;
    longitude: number;
    radius: number;
    address: string;
    placeName: string;
  }) => {
    setState(prev => ({
      ...prev,
      geofenceLocation: {
        latitude: location.latitude,
        longitude: location.longitude,
        radius: location.radius,
        address: location.address,
        placeName: location.placeName,
      },
    }));
    setShowLocationPicker(false);
  }, []);

  const soundLabel = useMemo(() => {
    if (!state.sound) return "기본 알람음";
    if (state.sound.startsWith("content://") || state.sound.startsWith("file://")) {
      return "시스템 알람음";
    }
    return state.sound;
  }, [state.sound]);

  const locationSummary = useMemo(() => {
    if (!state.geofenceLocation) return "위치를 선택하세요";
    const { placeName, latitude, longitude } = state.geofenceLocation;
    const coords = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    return placeName ? `${placeName} · ${coords}` : coords;
  }, [state.geofenceLocation]);

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
    const missionMode: AlarmPolicyMode = state.policyMode ?? "normal";
    let missionPayload: AlarmDraft["policyPayload"] = null;

    if (missionMode === "math") {
      missionPayload = buildMathPayload(mathForm);
    } else if (missionMode === "shake") {
      missionPayload = buildShakePayload(shakeForm);
    } else if (missionMode === "puzzle") {
      missionPayload = buildPuzzlePayload(puzzleForm);
    }

    const payload: AlarmDraft = {
      id: state.id,
      label: trimmedLabel,
      hour: state.hour,
      minute: state.minute,
      repeatDays: state.repeatDays,
      skipHolidays: state.skipHolidays,
      sound: state.sound,
      vibrate: state.vibrate,
      policyMode: missionMode,
      policyPayload: missionPayload,
      alarmSetId: state.alarmSetId ?? null,
      geofenceLocation: state.geofenceLocation ?? null,
    };
    onSave(payload);
  }, [mathForm, onSave, puzzleForm, shakeForm, state]);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>알람 설정</Text>
          <View style={styles.timePickerRow}>
            <WheelPicker
              data={periodData}
              value={isMorning ? "am" : "pm"}
              onValueChanged={({ item }) => setIsMorning(item.value === "am")}
              style={[styles.wheel, styles.periodWheel]}
              visibleItemCount={3}
              itemTextStyle={styles.wheelText}
            />
            <View style={styles.wheelSpacer} />
            <WheelPicker
              data={hourData}
              value={toDisplayHour(state.hour)}
              onValueChanged={({ item }) => handleHourChange(item.value as number)}
              style={styles.wheel}
              visibleItemCount={3}
              itemTextStyle={styles.wheelText}
            />
            <View style={styles.wheelSpacer} />
            <Text style={styles.timeColon}>:</Text>
            <View style={styles.wheelSpacer} />
            <WheelPicker
              data={minuteData}
              value={state.minute}
              onValueChanged={({ item }) => handleMinuteChange(item.value as number)}
              style={styles.wheel}
              visibleItemCount={3}
              itemTextStyle={styles.wheelText}
            />
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

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>지오펜싱 위치</Text>
              <Text style={styles.helperText}>해당 위치 반경 {state.geofenceLocation?.radius ?? 100}m</Text>
              <Pressable style={styles.locationCard} onPress={() => setShowLocationPicker(true)}>
                <Text style={styles.locationCardTitle}>
                  {state.geofenceLocation?.placeName ?? "위치 선택"}
                </Text>
                <Text style={styles.locationCardValue}>{locationSummary}</Text>
              </Pressable>
            {state.geofenceLocation && (
              <Pressable
                style={styles.locationResetButton}
                onPress={() => setState(prev => ({ ...prev, geofenceLocation: null }))}
              >
                <Text style={styles.locationResetText}>위치 제거</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.separator} />

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>미션</Text>
            <View style={styles.missionRow}>
              {[
                { mode: "normal" as AlarmPolicyMode, label: "없음" },
                { mode: "math" as AlarmPolicyMode, label: "수식" },
                { mode: "shake" as AlarmPolicyMode, label: "흔들기" },
                { mode: "puzzle" as AlarmPolicyMode, label: "폴리오미노" },
              ].map(option => {
                const active = state.policyMode === option.mode;
                return (
                  <Pressable
                    key={option.mode}
                    onPress={() => handleMissionModeChange(option.mode)}
                    style={[styles.missionButton, active && styles.missionButtonActive]}
                  >
                    <Text style={[styles.missionButtonLabel, active && styles.missionButtonLabelActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.helperText}>알람을 해제하려면 선택한 미션을 완료해야 합니다.</Text>
          </View>

            {state.policyMode === "math" ? (
              <View style={styles.missionCard}>
                <Text style={styles.missionTitle}>수식 미션 설정</Text>
                <Text style={styles.missionSubtitle}>난이도 프리셋</Text>
                <View style={styles.missionRow}>
                  {(["easy", "normal", "hard", "custom"] as MissionDifficulty[]).map(option => {
                    const active = mathForm.difficulty === option;
                    const label =
                      option === "easy" ? "쉬움" : option === "normal" ? "보통" : option === "hard" ? "어려움" : "직접 설정";
                    return (
                      <Pressable
                        key={option}
                        onPress={() => handleDifficultyChange(option)}
                        style={[styles.pillButton, active && styles.pillButtonActive]}
                      >
                        <Text style={[styles.pillButtonLabel, active && styles.pillButtonLabelActive]}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.missionFieldGrid}>
                  <View style={styles.missionField}>
                    <Text style={styles.sectionLabel}>항 개수</Text>
                    <TextInput
                      style={styles.missionInput}
                      keyboardType="number-pad"
                      value={mathForm.termCount}
                      onChangeText={value => handleMathIntegerChange("termCount", value)}
                      placeholder="4"
                    />
                  </View>
                  <View style={[styles.missionField, styles.missionFieldLast]}>
                    <Text style={styles.sectionLabel}>최대 시도</Text>
                    <TextInput
                      style={styles.missionInput}
                      keyboardType="number-pad"
                      value={mathForm.maxAttempts}
                      onChangeText={value => handleMathIntegerChange("maxAttempts", value)}
                      placeholder="3"
                    />
                  </View>
                </View>

                <View style={styles.sectionRow}>
                  <View>
                    <Text style={styles.sectionLabel}>곱셈/나눗셈 포함</Text>
                    <Text style={styles.helperText}>최소 한 번 이상 * 또는 /가 등장합니다.</Text>
                  </View>
                  <Switch
                    value={mathForm.includeMultiplication}
                    onValueChange={value => handleMathSwitchChange("includeMultiplication", value)}
                  />
                </View>

                <View style={styles.sectionRow}>
                  <View>
                    <Text style={styles.sectionLabel}>/1 피하기</Text>
                    <Text style={styles.helperText}>가능한 경우 1로 나누는 문제를 제외합니다.</Text>
                  </View>
                  <Switch
                    value={mathForm.avoidDivideByOne}
                    onValueChange={value => handleMathSwitchChange("avoidDivideByOne", value)}
                  />
                </View>

                <View style={styles.missionFieldGrid}>
                  <View style={styles.missionField}>
                    <Text style={styles.sectionLabel}>Presence 패널티</Text>
                    <TextInput
                      style={styles.missionInput}
                      keyboardType="decimal-pad"
                      value={mathForm.presencePenalty}
                      onChangeText={value => handleMathFloatChange("presencePenalty", value)}
                      placeholder="0"
                    />
                  </View>
                  <View style={[styles.missionField, styles.missionFieldLast]}>
                    <Text style={styles.sectionLabel}>Frequency 패널티</Text>
                    <TextInput
                      style={styles.missionInput}
                      keyboardType="decimal-pad"
                      value={mathForm.frequencyPenalty}
                      onChangeText={value => handleMathFloatChange("frequencyPenalty", value)}
                      placeholder="0"
                    />
                  </View>
                </View>

                <Text style={[styles.sectionLabel, styles.missionWeightsLabel]}>연산자 가중치</Text>
                <View style={styles.missionWeightsRow}>
                  <View style={styles.missionWeightField}>
                    <Text style={styles.helperText}>+</Text>
                    <TextInput
                      style={styles.missionInput}
                      keyboardType="decimal-pad"
                      value={mathForm.weightAdd}
                      onChangeText={value => handleMathFloatChange("weightAdd", value)}
                      placeholder="1"
                    />
                  </View>
                  <View style={styles.missionWeightField}>
                    <Text style={styles.helperText}>-</Text>
                    <TextInput
                      style={styles.missionInput}
                      keyboardType="decimal-pad"
                      value={mathForm.weightSubtract}
                      onChangeText={value => handleMathFloatChange("weightSubtract", value)}
                      placeholder="1"
                    />
                  </View>
                  <View style={styles.missionWeightField}>
                    <Text style={styles.helperText}>*</Text>
                    <TextInput
                      style={styles.missionInput}
                      keyboardType="decimal-pad"
                      value={mathForm.weightMultiply}
                      onChangeText={value => handleMathFloatChange("weightMultiply", value)}
                      placeholder="1"
                    />
                  </View>
                  <View style={[styles.missionWeightField, styles.missionWeightFieldLast]}>
                    <Text style={styles.helperText}>/</Text>
                    <TextInput
                      style={styles.missionInput}
                      keyboardType="decimal-pad"
                      value={mathForm.weightDivide}
                      onChangeText={value => handleMathFloatChange("weightDivide", value)}
                      placeholder="1"
                    />
                  </View>
                </View>
              </View>
            ) : null}

            {state.policyMode === "shake" ? (
              <View style={styles.missionCard}>
                <Text style={styles.missionTitle}>흔들기 미션 설정</Text>

              <View style={styles.missionFieldGrid}>
                <View style={styles.missionField}>
                  <Text style={styles.sectionLabel}>목표 횟수</Text>
                  <TextInput
                    style={styles.missionInput}
                    keyboardType="number-pad"
                    value={shakeForm.targetShakes}
                    onChangeText={value => handleShakeFieldChange("targetShakes", value)}
                    placeholder="20"
                  />
                </View>
                <View style={[styles.missionField, styles.missionFieldLast]}>
                  <Text style={styles.sectionLabel}>간격 (ms)</Text>
                  <TextInput
                    style={styles.missionInput}
                    keyboardType="number-pad"
                    value={shakeForm.intervalMs}
                      onChangeText={value => handleShakeFieldChange("intervalMs", value)}
                      placeholder="350"
                    />
                  </View>
                </View>

                <View style={styles.missionFieldGrid}>
                  <View style={styles.missionField}>
                    <Text style={styles.sectionLabel}>최소 목표</Text>
                    <TextInput
                      style={styles.missionInput}
                      keyboardType="number-pad"
                      value={shakeForm.minTarget}
                      onChangeText={value => handleShakeFieldChange("minTarget", value)}
                      placeholder={String(DEFAULT_SHAKE_TARGET_MIN)}
                    />
                  </View>
                  <View style={[styles.missionField, styles.missionFieldLast]}>
                    <Text style={styles.sectionLabel}>최대 목표</Text>
                    <TextInput
                      style={styles.missionInput}
                      keyboardType="number-pad"
                      value={shakeForm.maxTarget}
                      onChangeText={value => handleShakeFieldChange("maxTarget", value)}
                      placeholder={String(DEFAULT_SHAKE_TARGET_MAX)}
                    />
                  </View>
                </View>

                <View style={styles.missionField}>
                  <Text style={styles.sectionLabel}>임계값 (G-force)</Text>
                  <TextInput
                    style={styles.missionInput}
                    keyboardType="decimal-pad"
                    value={shakeForm.threshold}
                    onChangeText={value => handleShakeFieldChange("threshold", value)}
                    placeholder="2.7"
                  />
                  <Text style={styles.helperText}>높을수록 더 강하게 흔들어야 합니다.</Text>
                </View>
              </View>
            ) : null}

            {state.policyMode === "puzzle" ? (
              <View style={styles.missionCard}>
                <Text style={styles.missionTitle}>폴리오미노 미션 설정</Text>
                <Text style={styles.missionSubtitle}>보드 크기 (3 ~ 6)</Text>
                <View style={styles.missionRow}>
                  {[3, 4, 5, 6].map(value => {
                    const active = puzzleForm.size === String(value);
                    return (
                      <Pressable
                        key={value}
                        onPress={() => handlePuzzleSizeChange(value)}
                        style={[styles.pillButton, active && styles.pillButtonActive]}
                      >
                        <Text style={[styles.pillButtonLabel, active && styles.pillButtonLabelActive]}>{value} x {value}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.missionSubtitle}>난이도</Text>
                <View style={styles.missionRow}>
                  {(["easy", "medium", "hard"] as PuzzleDifficulty[]).map(level => {
                    const active = puzzleForm.difficulty === level;
                    const label = level === "easy" ? "쉬움" : level === "medium" ? "보통" : "어려움";
                    return (
                      <Pressable
                        key={level}
                        onPress={() => handlePuzzleDifficultyChange(level)}
                        style={[styles.pillButton, active && styles.pillButtonActive]}
                      >
                        <Text style={[styles.pillButtonLabel, active && styles.pillButtonLabelActive]}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.helperText}>조각 수와 힌트/제한 시간이 난이도에 맞춰 자동 조정됩니다.</Text>
              </View>
            ) : null}
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
    <LocationPicker
      visible={showLocationPicker}
      onLocationSelect={handleLocationSelected}
      onCancel={() => setShowLocationPicker(false)}
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
  wheel: {
    width: 88,
    height: 160,
  },
  periodWheel: {
    width: 72,
  },
  wheelSpacer: {
    width: 12,
  },
  wheelText: {
    fontSize: 22,
    fontWeight: "600",
    color: "#111827",
  },
  timeColon: {
    fontSize: 34,
    fontWeight: "700",
    color: "#111827",
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
  separator: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginTop: 20,
  },
  missionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
  },
  missionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f8fafc",
    marginRight: 8,
    marginBottom: 8,
  },
  missionButtonActive: {
    borderColor: "#2563eb",
    backgroundColor: "#2563eb",
  },
  missionButtonLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  missionButtonLabelActive: {
    color: "#f8fafc",
  },
  missionCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
  },
  missionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  missionSubtitle: {
    marginTop: 12,
    fontSize: 13,
    color: "#475569",
  },
  pillButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#cbd5f5",
    backgroundColor: "#e2e8f0",
  },
  pillButtonActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  pillButtonLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1f2937",
  },
  pillButtonLabelActive: {
    color: "#f8fafc",
  },
  missionFieldGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
  },
  missionField: {
    flex: 1,
    marginRight: 12,
    marginBottom: 12,
  },
  missionFieldLast: {
    marginRight: 0,
  },
  missionInput: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5f5",
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#fff",
  },
  missionWeightsLabel: {
    marginTop: 20,
  },
  missionWeightsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
  },
  missionWeightField: {
    flex: 1,
    marginRight: 12,
    marginBottom: 12,
  },
  missionWeightFieldLast: {
    marginRight: 0,
  },
  locationCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#f9fafb",
  },
  locationCardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  locationCardValue: {
    marginTop: 4,
    fontSize: 13,
    color: "#4b5563",
  },
  locationResetButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
  },
  locationResetText: {
    fontSize: 12,
    color: "#b91c1c",
    fontWeight: "600",
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
