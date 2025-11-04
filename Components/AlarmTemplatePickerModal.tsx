import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import WheelPicker from '@quidone/react-native-wheel-picker';
import dayjs from 'dayjs';

import type {
  AlarmSetTemplateSummary,
  AlarmTemplateEntryDetail,
} from '../services/alarm/alarmSetService';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

type Props = {
  visible: boolean;
  templates: AlarmSetTemplateSummary[];
  isLoading: boolean;
  isApplying: boolean;
  onClose: () => void;
  onApply: (templateId: string, baseHour: number, baseMinute: number) => Promise<void> | void;
  loadEntries: (templateId: string) => Promise<AlarmTemplateEntryDetail[]>;
  onDeleteTemplate: (templateId: string) => Promise<void> | void;
};

type TemplateListItemProps = {
  item: AlarmSetTemplateSummary;
  onPress: () => void;
  onDelete: () => void;
  isDeleting: boolean;
};

const TemplateListItem: React.FC<TemplateListItemProps> = ({ item, onPress, onDelete, isDeleting }) => (
  <Pressable style={styles.templateItem} onPress={onPress} disabled={isDeleting}>
    <View style={styles.templateRow}>
      <View style={styles.templateInfo}>
        <Text style={styles.templateLabel}>{item.label}</Text>
        <Text style={styles.templateMeta}>사운드: {item.defaultSound}</Text>
        <Text style={styles.templateMeta}>해제 모드: {item.defaultMode}</Text>
      </View>
      <Pressable
        style={styles.deleteButton}
        onPress={event => {
          event.stopPropagation();
          onDelete();
        }}
        disabled={isDeleting}
        accessibilityLabel="템플릿 삭제"
      >
        <Text style={styles.deleteButtonLabel}>🗑</Text>
      </Pressable>
    </View>
  </Pressable>
);

const toDisplayHour = (hour: number): number => {
  const normalized = hour % 12;
  return normalized === 0 ? 12 : normalized;
};

const toIsMorning = (hour: number): boolean => hour < 12;

const fromDisplayHour = (displayHour: number, isMorning: boolean): number => {
  const normalized = displayHour % 12;
  if (isMorning) {
    return normalized === 12 ? 0 : normalized;
  }
  return normalized === 12 ? 12 : normalized + 12;
};

const formatOffset = (offsetMinutes: number): string => {
  if (offsetMinutes === 0) {
    return '정시';
  }
  const hours = Math.floor(offsetMinutes / 60);
  const minutes = offsetMinutes % 60;
  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}시간`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}분`);
  }
  return parts.join(' ') + ' 후';
};

const formatRepeatDays = (repeatDays: AlarmTemplateEntryDetail['repeatDays']): string => {
  if (!repeatDays.length) {
    return '반복 없음';
  }
  const labels = repeatDays
    .map(day => WEEKDAY_LABELS[day] ?? '')
    .filter(Boolean);
  return labels.length ? `매주 ${labels.join(', ')}` : '반복 없음';
};

const AlarmTemplatePickerModal: React.FC<Props> = ({
  visible,
  templates,
  isLoading,
  isApplying,
  onClose,
  onApply,
  loadEntries,
  onDeleteTemplate,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<AlarmSetTemplateSummary | null>(null);
  const [entries, setEntries] = useState<AlarmTemplateEntryDetail[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [entriesError, setEntriesError] = useState<string | null>(null);
  const [isMorning, setIsMorning] = useState(true);
  const [displayHour, setDisplayHour] = useState(6);
  const [minute, setMinute] = useState(0);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setSelectedTemplate(null);
      setEntries([]);
      setLoadingEntries(false);
      setEntriesError(null);
      const base = dayjs().add(1, 'minute');
      setIsMorning(toIsMorning(base.hour()));
      setDisplayHour(toDisplayHour(base.hour()));
      setMinute(base.minute());
    }
  }, [visible]);

  const hourData = useMemo(
    () =>
      [...Array(12).keys()].map(index => {
        const display = index + 1;
        return { label: String(display).padStart(2, '0'), value: display };
      }),
    [],
  );

  const minuteData = useMemo(
    () => [...Array(60).keys()].map(value => ({ label: String(value).padStart(2, '0'), value })),
    [],
  );

  const handleSelectTemplate = useCallback(
    (template: AlarmSetTemplateSummary) => {
      setSelectedTemplate(template);
      setLoadingEntries(true);
      setEntries([]);
      setEntriesError(null);
      loadEntries(template.id)
        .then(result => {
          setEntries(result);
        })
        .catch(error => {
          console.warn('[AlarmTemplate] Failed to load entries', error);
          setEntriesError('템플릿 세부 정보를 불러오지 못했습니다.');
        })
        .finally(() => {
          setLoadingEntries(false);
        });
    },
    [loadEntries],
  );

  const handleApply = useCallback(async () => {
    if (!selectedTemplate) {
      return;
    }
    const baseHour24 = fromDisplayHour(displayHour, isMorning);
    await onApply(selectedTemplate.id, baseHour24, minute);
  }, [displayHour, isApplying, isMorning, minute, onApply, selectedTemplate]);

  const handleDeleteTemplate = useCallback(
    async (templateId: string) => {
      if (deletingTemplateId) {
        return;
      }
      setDeletingTemplateId(templateId);
      try {
        await onDeleteTemplate(templateId);
      } catch (error) {
        console.warn('[AlarmTemplate] Failed to delete template', error);
      } finally {
        setDeletingTemplateId(null);
      }
    },
    [deletingTemplateId, onDeleteTemplate],
  );

  const renderTemplate = useCallback(
    ({ item }: { item: AlarmSetTemplateSummary }) => (
      <TemplateListItem
        item={item}
        onPress={() => handleSelectTemplate(item)}
        onDelete={() => handleDeleteTemplate(item.id)}
        isDeleting={deletingTemplateId === item.id}
      />
    ),
    [deletingTemplateId, handleDeleteTemplate, handleSelectTemplate],
  );

  const keyExtractor = useCallback((item: AlarmSetTemplateSummary) => item.id, []);

  const showTemplateList = !selectedTemplate;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>
              {showTemplateList ? '알람 템플릿 선택' : selectedTemplate?.label ?? ''}
            </Text>
            <Pressable onPress={onClose} disabled={isApplying}>
              <Text style={styles.closeLabel}>닫기</Text>
            </Pressable>
          </View>

          {showTemplateList ? (
            <View style={styles.content}>
              {isLoading ? (
                <ActivityIndicator size="large" color="#2563eb" />
              ) : templates.length === 0 ? (
                <Text style={styles.emptyText}>저장된 알람 템플릿이 없습니다.</Text>
              ) : (
                <FlatList
                  data={templates}
                  renderItem={renderTemplate}
                  keyExtractor={keyExtractor}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
              )}
            </View>
          ) : (
            <View style={styles.applyContainer}>
              <Pressable
                style={styles.backButton}
                onPress={() => setSelectedTemplate(null)}
                disabled={isApplying}
              >
                <Text style={styles.backButtonLabel}>템플릿 목록으로</Text>
              </Pressable>

              {loadingEntries ? (
                <ActivityIndicator size="large" color="#2563eb" />
              ) : entriesError ? (
                <Text style={styles.errorText}>{entriesError}</Text>
              ) : entries.length === 0 ? (
                <Text style={styles.emptyText}>템플릿에 저장된 알람이 없습니다.</Text>
              ) : (
                <View style={styles.entriesContainer}>
                  <Text style={styles.sectionLabel}>알람 구성</Text>
                  {entries.map(entry => (
                    <View key={`${entry.templateId}-${entry.id ?? 'new'}`} style={styles.entryRow}>
                      <Text style={styles.entryOffset}>{formatOffset(entry.offsetMinutes)}</Text>
                      <View style={styles.entryMetaContainer}>
                        <Text style={styles.entryLabel}>{entry.label || '알람'}</Text>
                        <Text style={styles.entryMeta}>{formatRepeatDays(entry.repeatDays)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.timePickerSection}>
                <Text style={styles.sectionLabel}>기준 시간</Text>
                <View style={styles.baseTimeRow}>
                  <View style={styles.periodColumn}>
                    {(['오전', '오후'] as const).map(period => {
                      const periodIsMorning = period === '오전';
                      const selected = periodIsMorning === isMorning;
                      return (
                        <Pressable
                          key={period}
                          style={[styles.periodButton, selected && styles.periodButtonActive]}
                          onPress={() => setIsMorning(periodIsMorning)}
                        >
                          <Text style={[styles.periodLabel, selected && styles.periodLabelActive]}>
                            {period}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <WheelPicker
                    data={hourData}
                    value={displayHour}
                    onValueChanged={({ item }) => setDisplayHour(item.value as number)}
                    style={styles.timeWheel}
                  />
                  <Text style={styles.timeColon}>:</Text>
                  <WheelPicker
                    data={minuteData}
                    value={minute}
                    onValueChanged={({ item }) => setMinute(item.value as number)}
                    style={styles.timeWheel}
                  />
                </View>
              </View>

              <Pressable
                style={[styles.applyButton, (loadingEntries || entries.length === 0 || isApplying) && styles.applyButtonDisabled]}
                onPress={handleApply}
                disabled={loadingEntries || entries.length === 0 || isApplying}
              >
                <Text style={styles.applyButtonLabel}>{isApplying ? '적용 중...' : '템플릿 적용'}</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000055',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: 24,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  content: {
    marginTop: 20,
    flexGrow: 1,
  },
  templateItem: {
    paddingVertical: 16,
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  templateInfo: {
    flex: 1,
  },
  templateLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  templateMeta: {
    marginTop: 2,
    fontSize: 13,
    color: '#6b7280',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteButtonLabel: {
    fontSize: 18,
  },
  separator: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 24,
    fontSize: 14,
  },
  applyContainer: {
    marginTop: 16,
    gap: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  entriesContainer: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  entryOffset: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
    minWidth: 70,
  },
  entryMetaContainer: {
    flex: 1,
  },
  entryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  entryMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  timePickerSection: {
    gap: 12,
  },
  baseTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  periodColumn: {
    gap: 8,
  },
  periodButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  periodButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  periodLabel: {
    fontSize: 13,
    color: '#374151',
  },
  periodLabelActive: {
    color: '#fff',
    fontWeight: '600',
  },
  timeWheel: {
    width: 70,
    height: 150,
  },
  timeColon: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
  },
  applyButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  applyButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  applyButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});

export default AlarmTemplatePickerModal;
