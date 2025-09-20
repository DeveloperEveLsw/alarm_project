import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import WheelPicker from '@quidone/react-native-wheel-picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import IconToggleButton from './Button/IconToggleButton';
import TextToggleButton from './Button/TextToggleButton';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

type InternalFormState = {
  title: string;
  timeValue: [number, number];
  isTimePickerVisible: boolean;
  isRepeatSectionVisible: boolean;
  repeatType: 'weekly' | 'monthly' | null;
  selectedWeekdays: number[];
  isDDay: boolean;
};

export type ScheduleTodo = {
  id: number;
  title: string;
  dueDate: string | null;
  dueTime: string | null;
  isRepeating: boolean;
  repeatType: 'weekly' | 'monthly' | null;
  repeatWeekdays: number[] | null;
  repeatDayOfMonth: number | null;
  ddayId: number | null;
  alarmId: number | null;
  alarmSetId: number | null;
};

export type ScheduleTodoFormData = {
  title: string;
  timeValue: [number, number];
  isTimePickerVisible: boolean;
  isRepeatSectionVisible: boolean;
  repeatType: 'weekly' | 'monthly' | null;
  selectedWeekdays: number[];
  isDDay: boolean;
};

type ScheduleTodoCardProps = {
  isExpanded: boolean;
  onPressHeader?: () => void;
  isSaving: boolean;
  initialData?: ScheduleTodo;
  onSave: (formData: ScheduleTodoFormData) => Promise<void> | void;
  onCancel: () => void;
  headerTitle?: string;
  headerMeta?: string;
  mode?: 'existing' | 'new';
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
  const baseState: InternalFormState = {
    title: initialData?.title ?? '',
    timeValue: parseDueTime(initialData?.dueTime ?? null),
    isTimePickerVisible: Boolean(initialData?.dueTime),
    isRepeatSectionVisible: Boolean(initialData?.isRepeating),
    repeatType: initialData?.repeatType ?? null,
    selectedWeekdays: [],
    isDDay: Boolean(initialData?.ddayId),
  };

  if (initialData?.repeatType === 'weekly' && Array.isArray(initialData.repeatWeekdays)) {
    baseState.selectedWeekdays = [...initialData.repeatWeekdays].sort((a, b) => a - b);
  }

  return baseState;
};

const formatTodoMeta = (todo?: ScheduleTodo): string => {
  if (!todo) {
    return '새로운 할 일을 등록하려면 내용을 입력해주세요.';
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

  if (todo.dueDate) {
    return todo.dueTime ? `${todo.dueDate} ${todo.dueTime}` : todo.dueDate;
  }

  return '날짜 없음';
};

const ScheduleTodoCard: React.FC<ScheduleTodoCardProps> = ({
  isExpanded,
  onPressHeader,
  isSaving,
  initialData,
  onSave,
  onCancel,
  headerTitle,
  headerMeta,
  mode,
}) => {
  const [title, setTitle] = useState('');
  const [timeValue, setTimeValue] = useState<[number, number]>([0, 0]);
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
  const [isRepeatSectionVisible, setIsRepeatSectionVisible] = useState(false);
  const [repeatType, setRepeatType] = useState<'weekly' | 'monthly' | null>(null);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [isDDay, setIsDDay] = useState(false);

  const hourData = useMemo(
    () => [...Array(24).keys()].map(value => ({ label: `${value}시`, value })),
    [],
  );

  const minuteData = useMemo(
    () => [...Array(60).keys()].map(value => ({ label: `${value}분`, value })),
    [],
  );

  const applyFormState = useCallback((state: InternalFormState) => {
    setTitle(state.title);
    setTimeValue(state.timeValue);
    setIsTimePickerVisible(state.isTimePickerVisible);
    setIsRepeatSectionVisible(state.isRepeatSectionVisible);
    setRepeatType(state.repeatType);
    setSelectedWeekdays(state.selectedWeekdays);
    setIsDDay(state.isDDay);
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

  const resetToInitial = useCallback(() => {
    syncWithInitialData();
  }, [syncWithInitialData]);

  const handlePressSave = useCallback(async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      console.warn('할 일을 입력해주세요.');
      return;
    }

    const formData: ScheduleTodoFormData = {
      title: trimmedTitle,
      timeValue,
      isTimePickerVisible,
      isRepeatSectionVisible,
      repeatType,
      selectedWeekdays,
      isDDay,
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
    isRepeatSectionVisible,
    isTimePickerVisible,
    onSave,
    repeatType,
    resetToInitial,
    selectedWeekdays,
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
        <MaterialCommunityIcons name={chevronName} size={24} color="#424242" />
      </TouchableOpacity>

      {isExpanded ? (
        <View style={styles.formBody}>
          <TextInput
            placeholder="할 일을 입력해주세요."
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
          />

          <View style={styles.toggleRow}>
            <IconToggleButton
              boxStyle={[styles.toggleButton, styles.toggleIconButton]}
              IconComponent={MaterialCommunityIcons}
              iconName="repeat-off"
              onToggleIconName="repeat"
              iconColor="black"
              iconSize={36}
              onToggle={handleToggleRepeatSection}
              isToggled={isRepeatSectionVisible}
            />
            <IconToggleButton
              boxStyle={[styles.toggleButton, styles.toggleIconButton]}
              IconComponent={MaterialCommunityIcons}
              iconName="clock-outline"
              onToggleIconName="clock"
              iconColor="black"
              iconSize={36}
              onToggle={handleToggleTimePicker}
              isToggled={isTimePickerVisible}
            />
            <TextToggleButton
              boxStyle={[styles.ddayToggle, styles.toggleButton]}
              textStyle={styles.ddayToggleText}
              title="D-DAY"
              onToggle={setIsDDay}
              color="#000"
              onToggleColor="#FFF"
              onToggleBackgroundColor="#000"
              isToggled={isDDay}
            />
          </View>

          {isTimePickerVisible ? (
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
          ) : null}

          {isRepeatSectionVisible ? (
            <View style={styles.repeatContainer}>
              <Text style={styles.repeatTitle}>반복 설정</Text>
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
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  newTodoCard: {
    borderStyle: 'dashed',
  },
  todoCardExpanded: {
    borderColor: '#007AFF',
  },
  todoCardEditing: {
    backgroundColor: '#f0f6ff',
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
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  todoCardMeta: {
    fontSize: 13,
    color: '#616161',
  },
  formBody: {
    marginTop: 16,
  },
  titleInput: {
    backgroundColor: '#e7e7e7',
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleButton: {
    marginRight: 12,
  },
  toggleIconButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#f3f3f3',
  },
  ddayToggle: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 14,
    justifyContent: 'center',
  },
  ddayToggleText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  timePickerRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  hourOverlay: {
    borderRadius: 0,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  minuteOverlay: {
    borderRadius: 0,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  repeatContainer: {
    marginTop: 10,
    padding: 15,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  repeatTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    color: '#212121',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  optionButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  optionButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionButtonText: {
    color: '#333',
    fontSize: 14,
  },
  optionButtonTextSelected: {
    color: '#fff',
  },
  weekdaySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  weekdayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  weekdayButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  weekdayButtonText: {
    color: '#333',
  },
  weekdayButtonTextSelected: {
    color: '#fff',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
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
    backgroundColor: '#007AFF',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#eeeeee',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 15,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default ScheduleTodoCard;
