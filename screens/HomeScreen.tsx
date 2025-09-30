import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import dayjs from 'dayjs';

import { AlarmEngine } from '../alarm/engine';
import type { AlarmSpec } from '../alarm/contracts';

type AlarmItem = {
  id: string;
  label: string;
  hour: number;
  minute: number;
  enabled: boolean;
};

const pad = (value: number) => value.toString().padStart(2, '0');

const getNextFireAt = (hour: number, minute: number) => {
  const now = dayjs();
  let target = now.hour(hour).minute(minute).second(0).millisecond(0);
  if (target.isBefore(now)) {
    target = target.add(1, 'day');
  }
  return target.valueOf();
};

const createSpec = (alarm: AlarmItem): AlarmSpec => ({
  id: alarm.id,
  fireAt: getNextFireAt(alarm.hour, alarm.minute),
  policy: {
    mode: 'normal',
  },
  label: alarm.label || undefined,
  allowWhileIdle: true,
  channel: 'alarms',
  metadata: {
    localTime: `${pad(alarm.hour)}:${pad(alarm.minute)}`,
  },
});

const AlarmCard = ({ alarm, onToggle }: { alarm: AlarmItem; onToggle: (enabled: boolean) => Promise<void> }) => {
  const nextSchedule = useMemo(() => getNextFireAt(alarm.hour, alarm.minute), [alarm.hour, alarm.minute]);
  const nextLabel = useMemo(() => dayjs(nextSchedule).format('M월 D일 (ddd) A hh:mm'), [nextSchedule]);

  return (
    <View style={styles.cardWrapper}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTime}>{`${pad(alarm.hour)}:${pad(alarm.minute)}`}</Text>
        <Switch
          value={alarm.enabled}
          onValueChange={enabled => {
            onToggle(enabled).catch(error => console.warn('toggle alarm failed', error));
          }}
        />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardLabel}>{alarm.label || '알람'}</Text>
        <Text style={styles.cardNext}>{alarm.enabled ? `다음 알람: ${nextLabel}` : '꺼짐'}</Text>
      </View>
    </View>
  );
};

const TimeAdjustButton = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable style={styles.adjustButton} onPress={onPress}>
    <Text style={styles.adjustButtonLabel}>{label}</Text>
  </Pressable>
);

const HomeScreen: React.FC = () => {
  const [alarms, setAlarms] = useState<AlarmItem[]>([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [draftHour, setDraftHour] = useState(dayjs().hour());
  const [draftMinute, setDraftMinute] = useState(dayjs().minute());
  const [draftLabel, setDraftLabel] = useState('');


  const incrementHour = useCallback(() => {
    setDraftHour(prev => (prev + 1) % 24);
  }, []);
  const decrementHour = useCallback(() => {
    setDraftHour(prev => (prev - 1 + 24) % 24);
  }, []);
  const incrementMinute = useCallback(() => {
    setDraftMinute(prev => (prev + 1) % 60);
  }, []);
  const decrementMinute = useCallback(() => {
    setDraftMinute(prev => (prev - 1 + 60) % 60);
  }, []);

  const scheduleAlarm = useCallback(
    async (item: AlarmItem) => {
      const spec = createSpec(item);
      await AlarmEngine.scheduleExact(spec);
      setAlarms(prev =>
        prev.map(alarm => (alarm.id === item.id ? { ...alarm, enabled: true } : alarm))
      );
    },
    []
  );

  const cancelAlarm = useCallback(
    async (item: AlarmItem) => {
      await AlarmEngine.cancel(item.id);
      setAlarms(prev =>
        prev.map(alarm => (alarm.id === item.id ? { ...alarm, enabled: false } : alarm))
      );
    },
    []
  );

  const handleToggle = useCallback(
    (item: AlarmItem) => async (enabled: boolean) => {
      if (enabled) {
        await scheduleAlarm({ ...item, enabled: true });
      } else {
        await cancelAlarm(item);
      }
    },
    [cancelAlarm, scheduleAlarm]
  );

  const openModal = useCallback(() => {
    const now = dayjs();
    setDraftHour(now.hour());
    setDraftMinute(now.minute());
    setDraftLabel('');
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (false) {
      console.warn('정확한 알람 권한이 필요합니다. 설정 화면에서 허용해 주세요.');
    }

    const newAlarm: AlarmItem = {
      id: `alarm-${Date.now()}`,
      label: draftLabel.trim(),
      hour: draftHour,
      minute: draftMinute,
      enabled: true,
    };

    setAlarms(prev => [...prev, newAlarm].sort((a, b) => {
      const timeA = a.hour * 60 + a.minute;
      const timeB = b.hour * 60 + b.minute;
      return timeA - timeB;
    }));

    try {
      await scheduleAlarm(newAlarm);
    } catch (error) {
      console.warn('알람 예약 실패', error);
      setAlarms(prev => prev.filter(alarm => alarm.id !== newAlarm.id));
    }

    setModalVisible(false);
  }, [draftHour, draftLabel, draftMinute, false, scheduleAlarm]);

  const renderAlarm = useCallback(
    ({ item }: { item: AlarmItem }) => (
      <AlarmCard alarm={item} onToggle={handleToggle(item)} />
    ),
    [handleToggle]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>알람</Text>
        <Text style={styles.headerSubtitle}>기본 시계 앱처럼 빠르게 관리하세요</Text>
        {!true && (
          <Text style={styles.permissionWarning}>
            정확한 알람 권한이 필요합니다. 설정에서 허용해 주세요.
          </Text>
        )}
        {!true && (
          <Text style={styles.permissionWarning}>알림 권한이 허용되어야 헤드업 알림을 받을 수 있습니다.</Text>
        )}
      </View>

      {alarms.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>⏰</Text>
          <Text style={styles.emptyTitle}>등록된 알람이 없습니다</Text>
          <Text style={styles.emptySubtitle}>아래 + 버튼으로 알람을 추가하세요</Text>
        </View>
      ) : (
        <FlatList
          data={alarms}
          keyExtractor={item => item.id}
          renderItem={renderAlarm}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      <Pressable style={styles.fab} onPress={openModal} accessibilityLabel='알람 추가'>
        <Text style={styles.fabLabel}>+</Text>
      </Pressable>

      <Modal animationType='slide' transparent visible={isModalVisible} onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>알람 추가</Text>
            <View style={styles.timePickerRow}>
              <View style={styles.timeColumn}>
                <TimeAdjustButton label='▲' onPress={incrementHour} />
                <Text style={styles.timeValue}>{pad(draftHour)}</Text>
                <TimeAdjustButton label='▼' onPress={decrementHour} />
              </View>
              <Text style={styles.timeColon}>:</Text>
              <View style={styles.timeColumn}>
                <TimeAdjustButton label='▲' onPress={incrementMinute} />
                <Text style={styles.timeValue}>{pad(draftMinute)}</Text>
                <TimeAdjustButton label='▼' onPress={decrementMinute} />
              </View>
            </View>
            <View style={styles.labelSection}>
              <Text style={styles.labelCaption}>레이블</Text>
              <TextInput
                value={draftLabel}
                onChangeText={setDraftLabel}
                placeholder='예: 기상, 회의'
                style={styles.labelInput}
              />
            </View>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalButton} onPress={closeModal}>
                <Text style={styles.modalButtonText}>취소</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.modalPrimaryButton]} onPress={handleSave}>
                <Text style={[styles.modalButtonText, styles.modalPrimaryLabel]}>저장</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7fb',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 15,
    color: '#6b7280',
  },
  permissionWarning: {
    marginTop: 8,
    fontSize: 13,
    color: '#dc2626',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  cardWrapper: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    elevation: 2,
    shadowColor: '#00000033',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTime: {
    fontSize: 42,
    fontWeight: '600',
    color: '#111827',
  },
  cardBody: {
    marginTop: 8,
  },
  cardLabel: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  cardNext: {
    marginTop: 2,
    fontSize: 13,
    color: '#6b7280',
  },
  separator: {
    height: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#6b7280',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 36,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#2563eb',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  fabLabel: {
    fontSize: 36,
    color: '#fff',
    marginTop: -4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  timeColumn: {
    alignItems: 'center',
  },
  timeColon: {
    fontSize: 32,
    fontWeight: '600',
    marginHorizontal: 12,
  },
  adjustButton: {
    width: 60,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustButtonLabel: {
    fontSize: 18,
    color: '#1f2937',
  },
  timeValue: {
    fontSize: 36,
    fontWeight: '600',
    color: '#111827',
    marginVertical: 12,
  },
  labelSection: {
    marginTop: 32,
  },
  labelCaption: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
  },
  labelInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 32,
    columnGap: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  modalButtonText: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '600',
  },
  modalPrimaryButton: {
    backgroundColor: '#2563eb',
  },
  modalPrimaryLabel: {
    color: '#fff',
  },
});
    
export default HomeScreen;
