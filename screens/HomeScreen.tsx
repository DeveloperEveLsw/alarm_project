import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import dayjs from "dayjs";

import AlarmEditorModal from "../Components/AlarmEditorModal";
import AlarmListItem from "../Components/AlarmListItem";
import { scheduleAlarm, cancelAlarm } from "../services/alarm/alarmService";
import { useAlarmPermissionsStore } from "../stores/alarmPermissionsStore";
import type { AlarmPermissionState } from "../stores/alarmPermissionsStore";
import type { AlarmDraft, AlarmItem } from "../types/alarm.types";
import { ensureLocationForegroundServicePermission } from "../services/permissionHelpers";

const DEFAULT_SOUND = "Arcade";

const selectHasExactAlarm = (state: AlarmPermissionState) => state.hasExactAlarm;
const selectHasPostNotifications = (state: AlarmPermissionState) => state.hasPostNotifications;
const selectHasVibrate = (state: AlarmPermissionState) => state.hasVibrate;
const selectHasFineLocation = (state: AlarmPermissionState) => state.hasFineLocation;

const sortAlarms = (items: AlarmItem[]): AlarmItem[] =>
  [...items].sort((a, b) => {
    const timeA = a.hour * 60 + a.minute;
    const timeB = b.hour * 60 + b.minute;
    if (timeA !== timeB) return timeA - timeB;
    return a.id.localeCompare(b.id);
  });

const createDefaultDraft = (): AlarmDraft => {
  const base = dayjs().add(1, "minute");
  return {
    label: "",
    hour: base.hour(),
    minute: base.minute(),
    repeatDays: [],
    skipHolidays: false,
    sound: DEFAULT_SOUND,
    vibrate: true,
  };
};

const toDraft = (alarm: AlarmItem): AlarmDraft => ({
  id: alarm.id,
  label: alarm.label,
  hour: alarm.hour,
  minute: alarm.minute,
  repeatDays: alarm.repeatDays,
  skipHolidays: alarm.skipHolidays,
  sound: alarm.sound,
  vibrate: alarm.vibrate,
});

const HomeScreen: React.FC = () => {
  const [alarms, setAlarms] = useState<AlarmItem[]>([]);
  const [editorState, setEditorState] = useState<{ mode: "create" | "edit"; draft: AlarmDraft } | null>(null);

  const hasExactAlarm = useAlarmPermissionsStore(selectHasExactAlarm);
  const hasPostNotifications = useAlarmPermissionsStore(selectHasPostNotifications);
  const hasVibrate = useAlarmPermissionsStore(selectHasVibrate);
  const hasFineLocation = useAlarmPermissionsStore(selectHasFineLocation);
  const {
    hydratePermissions,
    requestPostNotifications,
    requestFineLocation,
    requestVibrate,
    openExactAlarmSettings,
  } = useAlarmPermissionsStore.getState();


  useEffect(() => {
    hydratePermissions().catch(error => {
      console.warn("[Permissions] hydrate failed", error);
    });
  }, [hydratePermissions]);

  const ensureCorePermissions = useCallback(async () => {
    if (!hasPostNotifications) {
      const granted = await requestPostNotifications();
      if (!granted) {
        Alert.alert("권한 필요", "알림 권한을 허용해야 알람을 받을 수 있어요.");
        return false;
      }
    }

    if (!hasVibrate) {
      const granted = await requestVibrate();
      if (!granted) {
        Alert.alert("권한 필요", "기기 진동 권한을 허용해야 알람이 정상적으로 울립니다.");
        return false;
      }
    }

    if (!hasFineLocation) {
      const granted = await requestFineLocation();
      if (!granted) {
        Alert.alert("권한 필요", "위치 권한을 허용해야 알람 서비스가 안정적으로 동작합니다.");
        return false;
      }
    }

    if (!(await ensureLocationForegroundServicePermission())) {
      Alert.alert("권한 필요", "포그라운드 위치 권한을 허용해야 알람이 정확히 동작합니다.");
      return false;
    }

    if (!hasExactAlarm) {
      await openExactAlarmSettings();
      await hydratePermissions();
      const latestExact = useAlarmPermissionsStore.getState().hasExactAlarm;
      if (!latestExact) {
        Alert.alert("권한 필요", "설정에서 정확한 알람 권한을 허용해 주세요.");
        return false;
      }
    }

    return true;
  }, [
    hasExactAlarm,
    hasPostNotifications,
    hasVibrate,
    hasFineLocation,
    hydratePermissions,
    openExactAlarmSettings,
    requestPostNotifications,
    requestVibrate,
    requestFineLocation,
  ]);

  const closeEditor = useCallback(() => {
    setEditorState(null);
  }, []);

  const upsertAlarm = useCallback((next: AlarmItem) => {
    setAlarms(prev => sortAlarms([...prev.filter(item => item.id !== next.id), next]));
  }, []);

  const handleSaveDraft = useCallback(
    async (payload: AlarmDraft) => {
      const permissionsOk = await ensureCorePermissions();
      if (!permissionsOk) {
        return;
      }

      setEditorState(null);

      const existing = payload.id ? alarms.find(alarm => alarm.id === payload.id) : undefined;
      const id = payload.id ?? `alarm-${Date.now()}`;
      const base: AlarmItem = {
        id,
        label: payload.label,
        hour: payload.hour,
        minute: payload.minute,
        repeatDays: payload.repeatDays,
        skipHolidays: payload.skipHolidays,
        sound: payload.sound,
        vibrate: payload.vibrate,
        enabled: existing ? existing.enabled : true,
        nextTriggerAt: null,
      };

      if (existing) {
        await cancelAlarm(existing.id).catch(error => {
          console.warn("알람 취소 실패", error);
        });
      }

      if (base.enabled) {
        try {
          const nextFireAt = await scheduleAlarm({ ...base, enabled: true });
          upsertAlarm({ ...base, nextTriggerAt: nextFireAt, enabled: true });
        } catch (error) {
          console.warn("알람 저장 실패", error);
          Alert.alert("알람 저장 실패", "알람을 예약할 수 없습니다. 다시 시도해 주세요.");
          upsertAlarm({ ...base, enabled: false, nextTriggerAt: null });
        }
      } else {
        upsertAlarm({ ...base, enabled: false, nextTriggerAt: null });
      }
    },
    [alarms, ensureCorePermissions, upsertAlarm],
  );

  const handleToggle = useCallback(
    async (target: AlarmItem, enabled: boolean) => {
      if (enabled) {
        const permissionsOk = await ensureCorePermissions();
        if (!permissionsOk) {
          return;
        }
        try {
          const nextFireAt = await scheduleAlarm({ ...target, enabled: true });
          upsertAlarm({ ...target, enabled: true, nextTriggerAt: nextFireAt });
        } catch (error) {
          console.warn("알람 활성화 실패", error);
          Alert.alert("알람 활성화 실패", "알람을 켜는 중 오류가 발생했습니다.");
        }
        return;
      }

      try {
        await cancelAlarm(target.id);
      } catch (error) {
        console.warn("알람 취소 실패", error);
      }
      upsertAlarm({ ...target, enabled: false, nextTriggerAt: null });
    },
    [ensureCorePermissions, upsertAlarm],
  );

  const openCreateEditor = useCallback(() => {
    setEditorState({ mode: "create", draft: createDefaultDraft() });
  }, []);

  const openEditEditor = useCallback((alarm: AlarmItem) => {
    setEditorState({ mode: "edit", draft: toDraft(alarm) });
  }, []);

  const renderAlarm = useCallback(
    ({ item }: { item: AlarmItem }) => (
      <AlarmListItem
        alarm={item}
        onPress={() => openEditEditor(item)}
        onToggle={value => handleToggle(item, value)}
      />
    ),
    [handleToggle, openEditEditor],
  );

  const keyExtractor = useCallback((item: AlarmItem) => item.id, []);

  const editorVisible = Boolean(editorState);
  const draftForEditor = useMemo(
    () => (editorState ? editorState.draft : createDefaultDraft()),
    [editorState],
  );

  const showPermissionWarning = useMemo(
    () => !hasPostNotifications || !hasExactAlarm || !hasVibrate || !hasFineLocation,
    [hasExactAlarm, hasPostNotifications, hasVibrate, hasFineLocation],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>알람</Text>
        <Text style={styles.headerSubtitle}>기본 시계 앱처럼 빠르게 관리하세요</Text>
        {showPermissionWarning ? (
          <View style={styles.permissionBanner}>
            <Text style={styles.permissionTitle}>필수 권한이 필요해요</Text>
            <Text style={styles.permissionMessage}>
              정확한 알람, 알림, 진동, 위치 권한을 모두 허용해야 제 시간에 알람을 울릴 수 있어요.
            </Text>
          </View>
        ) : null}
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
          keyExtractor={keyExtractor}
          renderItem={renderAlarm}
          contentContainerStyle={styles.listContent}
        />
      )}

      <Pressable style={styles.fab} onPress={openCreateEditor} accessibilityLabel="알람 추가">
        <Text style={styles.fabLabel}>+</Text>
      </Pressable>

      <AlarmEditorModal
        visible={editorVisible}
        draft={draftForEditor}
        onCancel={closeEditor}
        onSave={handleSaveDraft}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f7fb",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 15,
    color: "#6b7280",
  },
  permissionBanner: {
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: "#fef3c7",
    padding: 16,
  },
  permissionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#92400e",
  },
  permissionMessage: {
    marginTop: 4,
    fontSize: 13,
    color: "#92400e",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 120,
    paddingHorizontal: 24,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#6b7280",
  },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 36,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#2563eb",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  fabLabel: {
    fontSize: 36,
    color: "#fff",
    marginTop: -4,
  },
});

export default HomeScreen;
