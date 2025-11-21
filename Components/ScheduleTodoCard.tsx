import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import WheelPicker from '@quidone/react-native-wheel-picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import IconToggleButton from './Button/IconToggleButton';
import TextToggleButton from './Button/TextToggleButton';
import type { ScheduleTodo, ScheduleTodoFormData } from '../types/todo.types';
export type { ScheduleTodo, ScheduleTodoFormData } from '../types/todo.types';

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

type InternalFormState = {
  title: string;
  timeValue: [number, number];
  isTimePickerVisible: boolean;
  isRepeatSectionVisible: boolean;
  repeatType: 'weekly' | 'monthly' | null;
  selectedWeekdays: number[];
  isDDay: boolean;
  alarmOffsets: number[];
  isAlarmEnabled: boolean;
  alarmTemplateId: string | null;
};

type ScheduleTodoCardProps = {
  isExpanded: boolean;
  onPressHeader?: () => void;
  isSaving: boolean;
  initialData?: ScheduleTodo;
  onSave: (formData: ScheduleTodoFormData) => Promise<unknown> | void;
  onCancel: () => void;
  headerTitle?: string;
  headerMeta?: string;
  mode?: 'existing' | 'new';
  onDelete?: (todo: ScheduleTodo) => Promise<void> | void;
  isDeleting?: boolean;
};

const parseDueTime = (dueTime: string | null | undefined): [number, number] => {
  if (!dueTime) {
    return [0, 0];
  }
  const [hourStr, minuteStr] = dueTime.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return [0, 0];
  }
  return [hour, minute];
};

const buildInitialFormState = (initialData?: ScheduleTodo): InternalFormState => {
  const alarmSource = Array.isArray(initialData?.alarmRelations)
    ? initialData?.alarmRelations ?? []
    : [];
  const initialAlarmOffsets = Array.from(
    new Set(
      alarmSource
        .map(relation => relation.offsetMinutes)
        .filter(offset => Number.isFinite(offset) && offset >= 0),
    ),
  ).sort((a, b) => a - b);

  const baseState: InternalFormState = {
    title: initialData?.title ?? '',
    timeValue: parseDueTime(initialData?.dueTime ?? null),
    isTimePickerVisible: Boolean(initialData?.dueTime),
    isRepeatSectionVisible: Boolean(initialData?.isRepeating),
    repeatType: initialData?.repeatType ?? null,
    selectedWeekdays: [],
    isDDay: Boolean(initialData?.ddayId),
    alarmOffsets: initialAlarmOffsets,
    isAlarmEnabled: initialAlarmOffsets.length > 0,
    alarmTemplateId: initialData?.alarmTemplateId ?? null,
  };

  if (initialData?.repeatType === 'weekly' && Array.isArray(initialData.repeatWeekdays)) {
    baseState.selectedWeekdays = [...initialData.repeatWeekdays].sort((a, b) => a - b);
  }

  return baseState;
};

const formatTodoMeta = (todo?: ScheduleTodo): string => {
  if (!todo) {
    return '일정을 생성하려면 내용을 입력해 주세요.';
  }

  if (todo.isRepeating) {
    if (todo.repeatType === 'weekly' && todo.repeatWeekdays?.length) {
      const labels = todo.repeatWeekdays
        .map(index => WEEKDAY_LABELS[index] ?? '')
        .filter(Boolean)
        .join(', ');
      return labels ? `매주 ${labels}` : '반복 일정';
    }
    if (todo.repeatType === 'monthly' && todo.repeatDayOfMonth !== null) {
      return `매월 ${todo.repeatDayOfMonth}일`;
    }
    return '반복 일정';
  }

  const baseDateLabel = todo.dueDate
    ? todo.dueTime
      ? `${todo.dueDate} ${todo.dueTime}`
      : todo.dueDate
    : '날짜 없음';

  if (Array.isArray(todo.alarmRelations) && todo.alarmRelations.length > 0) {
    const offsets = todo.alarmRelations
      .map(relation => relation.offsetMinutes)
      .sort((a, b) => a - b)
      .map(offset => (offset === 0 ? '정시' : `${offset}분 전`))
      .join(', ');
    return `${baseDateLabel} · 알람(${offsets})`;
  }

  return baseDateLabel;
};

const ScheduleTodoCard: React.FC<ScheduleTodoCardProps> = ({
  isExpanded,
  onPressHeader,
  isSaving,
  isDeleting = false,
  initialData,
  onSave,
  onCancel,
  headerTitle,
  headerMeta,
  mode,
  onDelete,
}) => {
  const [title, setTitle] = useState('');
  const [timeValue, setTimeValue] = useState<[number, number]>([0, 0]);
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
  const [isRepeatSectionVisible, setIsRepeatSectionVisible] = useState(false);
  const [repeatType, setRepeatType] = useState<'weekly' | 'monthly' | null>(null);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [isDDay, setIsDDay] = useState(false);
  const [alarmOffsets, setAlarmOffsets] = useState<number[]>([]);
  const [isAlarmEnabled, setIsAlarmEnabled] = useState(false);
  const [alarmOffsetInput, setAlarmOffsetInput] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const hourData = useMemo(
    () => [...Array(24).keys()].map(value => ({ label: `${String(value).padStart(2, '0')}시`, value })),
    [],
  );

  const minuteData = useMemo(
    () => [...Array(60).keys()].map(value => ({ label: `${String(value).padStart(2, '0')}분`, value })),
    [],
  );

  const sortedAlarmOffsets = useMemo(() => {
    const next = [...alarmOffsets];
    next.sort((a, b) => a - b);
    return next;
  }, [alarmOffsets]);

  const formatOffsetLabel = useCallback(
    (offset: number) => (offset === 0 ? '정시' : `${offset}분 전`),
    [],
  );

  const canAddAlarmOffset = useMemo(
    () => alarmOffsetInput.trim().length > 0 && !isSaving,
    [alarmOffsetInput, isSaving],
  );

  const applyFormState = useCallback((state: InternalFormState) => {
    setTitle(state.title);
    setTimeValue(state.timeValue);
    setIsTimePickerVisible(state.isTimePickerVisible);
    setIsRepeatSectionVisible(state.isRepeatSectionVisible);
    setRepeatType(state.repeatType);
    setSelectedWeekdays(state.selectedWeekdays);
    setIsDDay(state.isDDay);
    setAlarmOffsets(state.alarmOffsets);
    setIsAlarmEnabled(state.isAlarmEnabled);
    setAlarmOffsetInput('');
    setSelectedTemplateId(state.alarmTemplateId);
  }, []);

  const syncWithInitialData = useCallback(() => {
    applyFormState(buildInitialFormState(initialData));
  }, [applyFormState, initialData]);

  useEffect(() => {
    syncWithInitialData();
  }, [syncWithInitialData]);

  useEffect(() => {
    if (!isExpanded) {
      syncWithInitialData();
    }
  }, [isExpanded, syncWithInitialData]);

  const handleToggleRepeatSection = (checked: boolean) => {
    setIsRepeatSectionVisible(checked);
    if (!checked) {
      setRepeatType(null);
      setSelectedWeekdays([]);
    }
  };

  const handleToggleTimePicker = (checked: boolean) => {
    setIsTimePickerVisible(checked);
    if (!checked) {
      setTimeValue([0, 0]);
      setIsAlarmEnabled(false);
      setAlarmOffsets([]);
      setSelectedTemplateId(null);
    }
  };

  const handleSelectRepeatType = (type: 'weekly' | 'monthly') => {
    setRepeatType(type);
    if (type !== 'weekly') {
      setSelectedWeekdays([]);
    }
  };

  const handleToggleWeekday = (weekdayIndex: number) => {
    setSelectedWeekdays(prev => {
      if (prev.includes(weekdayIndex)) {
        return prev.filter(item => item !== weekdayIndex);
      }
      return [...prev, weekdayIndex].sort((a, b) => a - b);
    });
  };

  const handleToggleAlarm = (checked: boolean) => {
    if (checked) {
      if (!isTimePickerVisible) {
        Alert.alert('시간 필요', '알람을 사용하려면 시간을 먼저 설정해 주세요.');
        return;
      }
      setIsAlarmEnabled(true);
      if (alarmOffsets.length === 0) {
        setAlarmOffsets([10]);
      }
      setSelectedTemplateId(null);
      return;
    }

    setIsAlarmEnabled(false);
    setAlarmOffsets([]);
    setSelectedTemplateId(null);
  };

  const handleOffsetInputChange = (text: string) => {
    const sanitized = text.replace(/[^0-9]/g, '');
    setAlarmOffsetInput(sanitized);
  };

  const handleAddAlarmOffset = () => {
    const trimmed = alarmOffsetInput.trim();
    if (trimmed.length === 0) {
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      Alert.alert('유효하지 않은 값', '숫자만 입력해 주세요.');
      return;
    }
    if (parsed < 0 || parsed > 1440) {
      Alert.alert('범위 오류', '알람은 0분 이상 1440분 이하로만 설정할 수 있어요.');
      return;
    }
    setAlarmOffsets(prev => {
      const next = Array.from(new Set([...prev, Math.round(parsed)]));
      next.sort((a, b) => a - b);
      return next;
    });
    setAlarmOffsetInput('');
    setSelectedTemplateId(null);
  };

  const handleRemoveAlarmOffset = (offset: number) => {
    setAlarmOffsets(prev => prev.filter(item => item !== offset));
    setSelectedTemplateId(null);
  };

  const resetToInitial = useCallback(() => {
    syncWithInitialData();
  }, [syncWithInitialData]);

  const handlePressSave = useCallback(async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      console.warn('제목을 입력해 주세요.');
      return;
    }

    if (isAlarmEnabled) {
      if (!isTimePickerVisible) {
        Alert.alert('알람 설정', '알람을 사용하려면 시간을 먼저 설정해 주세요.');
        return;
      }
      if (sortedAlarmOffsets.length === 0) {
        Alert.alert('알람 설정', '최소 한 개 이상의 알람 시간을 추가해 주세요.');
        return;
      }
    }

    const formData: ScheduleTodoFormData = {
      title: trimmedTitle,
      timeValue,
      isTimePickerVisible,
      isRepeatSectionVisible,
      repeatType,
      selectedWeekdays,
      isDDay,
      alarmOffsets: isAlarmEnabled ? sortedAlarmOffsets : [],
      isAlarmEnabled: isAlarmEnabled && sortedAlarmOffsets.length > 0,
      alarmTemplateId: selectedTemplateId,
    };

    try {
      await onSave(formData);
      if (!initialData) {
        resetToInitial();
      } else {
        setTitle(trimmedTitle);
      }
    } catch (error) {
      console.error('Failed to save schedule todo form', error);
    }
  }, [
    initialData,
    isDDay,
    isAlarmEnabled,
    isRepeatSectionVisible,
    isTimePickerVisible,
    onSave,
    repeatType,
    resetToInitial,
    selectedWeekdays,
    sortedAlarmOffsets,
    timeValue,
    title,
  ]);

  const handlePressCancel = useCallback(() => {
    resetToInitial();
    onCancel();
  }, [onCancel, resetToInitial]);

  const computedHeaderTitle = useMemo(() => {
    if (headerTitle !== undefined) {
      return headerTitle;
    }
    if (initialData) {
      return initialData.title || '제목 없음';
    }
    return '새 일정 추가';
  }, [headerTitle, initialData]);

  const computedHeaderMeta = useMemo(() => {
    if (headerMeta !== undefined) {
      return headerMeta;
    }
    return formatTodoMeta(initialData);
  }, [headerMeta, initialData]);

  const isNewMode = mode === 'new' || (!mode && !initialData);
  const chevronName = onPressHeader ? (isExpanded ? 'chevron-up' : 'chevron-down') : 'chevron-up';
  const chevronColor = isExpanded ? '#3B82F6' : '#6b7280';
  const isExisting = Boolean(initialData);

  const handlePressDelete = useCallback(() => {
    if (!initialData || !onDelete || isDeleting) {
      return;
    }
    Alert.alert(
      '일정 삭제',
      '정말 이 일정을 삭제하시겠어요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => onDelete(initialData),
        },
      ],
    );
  }, [initialData, isDeleting, onDelete]);

  return (
    <View
      style={[
        styles.todoCard,
        isNewMode && styles.newTodoCard,
        isExpanded && styles.todoCardExpanded,
        isExpanded && styles.todoCardEditing,
      ]}
    >
      <TouchableOpacity
        style={styles.todoCardHeader}
        onPress={onPressHeader}
        activeOpacity={onPressHeader ? 0.8 : 1}
        disabled={!onPressHeader}
      >
        <View style={styles.todoCardHeaderContent}>
          <Text style={styles.todoCardTitle} numberOfLines={1}>
            {computedHeaderTitle}
          </Text>
          <Text style={styles.todoCardMeta}>{computedHeaderMeta}</Text>
        </View>
        <MaterialCommunityIcons name={chevronName} size={24} color={chevronColor} />
      </TouchableOpacity>

      {isExpanded ? (
        <View style={styles.formBody}>
          <View style={styles.fieldGroup}>
            <View style={styles.fieldGroupHeader}>
              <Text style={styles.fieldLabel}>제목</Text>
              {isExisting && onDelete ? (
                <TouchableOpacity
                  onPress={handlePressDelete}
                  style={[
                    styles.deleteButton,
                    (isSaving || isDeleting) && styles.deleteButtonDisabled,
                  ]}
                  disabled={isSaving || isDeleting}
                  accessibilityRole="button"
                  accessibilityLabel="일정 삭제"
                  accessibilityHint="현재 일정을 삭제합니다."
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={20}
                    color={isSaving || isDeleting ? '#9ca3af' : '#ef4444'}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
            <TextInput
              placeholder="제목을 입력해 주세요."
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={[styles.fieldGroup, styles.optionGroup]}>
            <View style={styles.optionGroupHeader}>
              <Text style={styles.fieldLabel}>세부 설정</Text>
              <Text style={styles.fieldDescription}>필요한 기능만 선택하세요.</Text>
            </View>
            <View style={styles.toggleRow}>
              <IconToggleButton
                boxStyle={[
                  styles.toggleButton,
                  styles.toggleIconButton,
                  isRepeatSectionVisible && styles.toggleIconButtonActive,
                ]}
                textStyle={[
                  styles.toggleIconText,
                  isRepeatSectionVisible && styles.toggleIconTextActive,
                ]}
                IconComponent={MaterialCommunityIcons}
                title="반복"
                iconName="repeat-off"
                onToggleIconName="repeat"
                iconColor={isRepeatSectionVisible ? '#fff' : '#3B82F6'}
                iconSize={28}
                onToggle={handleToggleRepeatSection}
                isToggled={isRepeatSectionVisible}
              />
              <IconToggleButton
                boxStyle={[
                  styles.toggleButton,
                  styles.toggleIconButton,
                  isTimePickerVisible && styles.toggleIconButtonActive,
                ]}
                textStyle={[
                  styles.toggleIconText,
                  isTimePickerVisible && styles.toggleIconTextActive,
                ]}
                IconComponent={MaterialCommunityIcons}
                title="시간"
                iconName="clock-outline"
                onToggleIconName="clock"
                iconColor={isTimePickerVisible ? '#fff' : '#3B82F6'}
                iconSize={28}
                onToggle={handleToggleTimePicker}
                isToggled={isTimePickerVisible}
              />
              <IconToggleButton
                boxStyle={[
                  styles.toggleButton,
                  styles.toggleIconButton,
                  isAlarmEnabled && styles.toggleIconButtonActive,
                ]}
                textStyle={[
                  styles.toggleIconText,
                  isAlarmEnabled && styles.toggleIconTextActive,
                ]}
                IconComponent={MaterialCommunityIcons}
                title="알람"
                iconName="alarm-off"
                onToggleIconName="alarm"
                iconColor={isAlarmEnabled ? '#fff' : '#3B82F6'}
                iconSize={28}
                onToggle={handleToggleAlarm}
                isToggled={isAlarmEnabled}
              />
              <TextToggleButton
                boxStyle={[styles.ddayToggle, styles.toggleButton]}
                textStyle={styles.ddayToggleText}
                title="D-DAY"
                onToggle={setIsDDay}
                color="#3B82F6"
                onToggleColor="#fff"
                onToggleBackgroundColor="#3B82F6"
                isToggled={isDDay}
              />
            </View>
          </View>

          {isTimePickerVisible ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>시간 선택</Text>
              <View style={styles.timePickerRow}>
                <WheelPicker
                  data={hourData}
                  value={timeValue[0]}
                  onValueChanged={({ item: { value } }) =>
                    setTimeValue([value, timeValue[1]])
                  }
                  visibleItemCount={3}
                  overlayItemStyle={styles.hourOverlay}
                />
                <WheelPicker
                  data={minuteData}
                  value={timeValue[1]}
                  onValueChanged={({ item: { value } }) =>
                    setTimeValue([timeValue[0], value])
                  }
                  visibleItemCount={3}
                  overlayItemStyle={styles.minuteOverlay}
                />
              </View>
            </View>
          ) : null}

          {isAlarmEnabled ? (
            <View style={[styles.fieldGroup, styles.alarmContainer]}>
              <Text style={styles.fieldLabel}>알람 시점</Text>
              <Text style={styles.fieldDescription}>일정 시작 시간 기준으로 울릴 분(min)을 입력하세요.</Text>
              <View style={styles.alarmInputRow}>
                <TextInput
                  style={styles.alarmTextInput}
                  placeholder="예: 10"
                  keyboardType="number-pad"
                  value={alarmOffsetInput}
                  onChangeText={handleOffsetInputChange}
                  editable={!isSaving}
                  maxLength={4}
                  accessibilityLabel="알람 오프셋 입력"
                />
                <TouchableOpacity
                  style={[
                    styles.alarmAddButton,
                    !canAddAlarmOffset && styles.alarmAddButtonDisabled,
                  ]}
                  onPress={handleAddAlarmOffset}
                  disabled={!canAddAlarmOffset}
                  accessibilityRole="button"
                  accessibilityLabel="알람 오프셋 추가"
                  accessibilityHint="입력한 분(min) 전에 울리는 알람을 추가합니다."
                >
                  <Text style={styles.alarmAddButtonText}>추가</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.alarmHelperText}>
                0분은 일정 시작과 동시에 울립니다. 최대 1440분(24시간)까지 설정할 수 있어요.
              </Text>
              <View style={styles.alarmChipContainer}>
                {sortedAlarmOffsets.length === 0 ? (
                  <Text style={styles.alarmEmptyLabel}>추가된 알람이 없습니다.</Text>
                ) : (
                  sortedAlarmOffsets.map(offset => (
                    <TouchableOpacity
                      key={`alarm-offset-${offset}`}
                      style={styles.alarmChip}
                      onPress={() => handleRemoveAlarmOffset(offset)}
                      disabled={isSaving}
                      accessibilityRole="button"
                      accessibilityLabel={`${formatOffsetLabel(offset)} 알람 삭제`}
                    >
                      <Text style={styles.alarmChipText}>{formatOffsetLabel(offset)}</Text>
                      <MaterialCommunityIcons
                        name="close"
                        size={16}
                        color="#1f2937"
                        style={styles.alarmChipIcon}
                      />
                    </TouchableOpacity>
                  ))
                )}
              </View>
              <Text style={styles.alarmChipHelper}>알람 항목을 누르면 삭제됩니다.</Text>
            </View>
          ) : null}

          {isRepeatSectionVisible ? (
            <View style={[styles.fieldGroup, styles.repeatContainer]}>
              <Text style={styles.fieldLabel}>반복 설정</Text>
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    repeatType === 'weekly' && styles.optionButtonSelected,
                  ]}
                  onPress={() => handleSelectRepeatType('weekly')}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      repeatType === 'weekly' && styles.optionButtonTextSelected,
                    ]}
                  >
                    주간
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    repeatType === 'monthly' && styles.optionButtonSelected,
                  ]}
                  onPress={() => handleSelectRepeatType('monthly')}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      repeatType === 'monthly' && styles.optionButtonTextSelected,
                    ]}
                  >
                    월간
                  </Text>
                </TouchableOpacity>
              </View>
              {repeatType === 'weekly' ? (
                <View style={styles.weekdaySelector}>
                  {WEEKDAY_LABELS.map((day, index) => {
                    const isSelected = selectedWeekdays.includes(index);
                    return (
                      <TouchableOpacity
                        key={`${day}-${index}`}
                        style={[styles.weekdayButton, isSelected && styles.weekdayButtonSelected]}
                        onPress={() => handleToggleWeekday(index)}
                      >
                        <Text
                          style={[styles.weekdayButtonText, isSelected && styles.weekdayButtonTextSelected]}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
            </View>

          ) : null}

          <View style={styles.formActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={handlePressCancel}
              disabled={isSaving}
            >
              <Text style={styles.secondaryButtonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.primaryButton,
                styles.actionButtonSpacing,
                isSaving && styles.disabledButton,
              ]}
              onPress={handlePressSave}
              disabled={isSaving}
            >
              <Text style={styles.primaryButtonText}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  todoCard: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5eaf5',
    shadowColor: '#1f2933',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  newTodoCard: {
    borderStyle: 'dashed',
    borderColor: '#3B82F6',
    backgroundColor: '#f7faff',
  },
  todoCardExpanded: {
    borderColor: '#3B82F6',
  },
  todoCardEditing: {
    backgroundColor: '#f4f8ff',
  },
  todoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todoCardHeaderContent: {
    flex: 1,
    marginRight: 12,
  },
  todoCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2a37',
    marginBottom: 4,
  },
  todoCardMeta: {
    fontSize: 13,
    color: '#4b5563',
  },
  formBody: {
    marginTop: 18,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  fieldGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2a37',
    marginBottom: 0,
  },
  fieldDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  optionGroup: {
    padding: 16,
    backgroundColor: '#f7faff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d8e2f8',
  },
  optionGroupHeader: {
    marginBottom: 12,
  },
  titleInput: {
    backgroundColor: '#f1f4f9',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: -12,
  },
  toggleButton: {
    marginRight: 12,
    marginBottom: 12,
  },
  toggleIconButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#e8f1ff',
    borderWidth: 1,
    borderColor: '#c7dcff',
  },
  toggleIconButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  toggleIconText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2a37',
    marginLeft: 8,
  },
  toggleIconTextActive: {
    color: '#fff',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
  },
  deleteButtonDisabled: {
    backgroundColor: '#f3f4f6',
  },
  ddayToggle: {
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 14,
    justifyContent: 'center',
    backgroundColor: '#e8f1ff',
    borderWidth: 1,
    borderColor: '#c7dcff',
  },
  ddayToggleText: {
    fontSize: 15,
    fontWeight: '600',
  },
  timePickerRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d8e2f8',
    overflow: 'hidden',
  },
  hourOverlay: {
    borderRadius: 0,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    backgroundColor: '#edf3ff',
  },
  minuteOverlay: {
    borderRadius: 0,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: '#edf3ff',
  },
  repeatContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d8e2f8',
    borderRadius: 16,
    padding: 16,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#f3f6fc',
    borderWidth: 1,
    borderColor: '#d8e2f8',
    marginHorizontal: 4,
  },
  optionButtonSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  optionButtonText: {
    color: '#1f2a37',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  optionButtonTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  alarmContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d8e2f8',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  alarmInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alarmTextInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  alarmAddButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
  },
  alarmAddButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  alarmAddButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  alarmHelperText: {
    fontSize: 12,
    color: '#6b7280',
  },
  alarmChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  alarmEmptyLabel: {
    fontSize: 13,
    color: '#9ca3af',
  },
  alarmChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d8e2f8',
    backgroundColor: '#f3f6fc',
  },
  alarmChipText: {
    fontSize: 13,
    color: '#1f2937',
    fontWeight: '600',
    marginRight: 6,
  },
  alarmChipIcon: {
    marginLeft: 2,
  },
  alarmChipHelper: {
    fontSize: 12,
    color: '#9ca3af',
  },
  weekdaySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  weekdayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f6fc',
    borderWidth: 1,
    borderColor: '#d8e2f8',
  },
  weekdayButtonSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  weekdayButtonText: {
    color: '#1f2a37',
    fontWeight: '600',
  },
  weekdayButtonTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5eaf5',
  },
  actionButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  actionButtonSpacing: {
    marginLeft: 12,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#eef1f8',
  },
  secondaryButtonText: {
    color: '#1f2a37',
    fontSize: 15,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default ScheduleTodoCard;


