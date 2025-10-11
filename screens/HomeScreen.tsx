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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import AlarmEditorModal from "../Components/AlarmEditorModal";
import AlarmListItem from "../Components/AlarmListItem";
import { fetchAlarms } from "../services/alarm/alarmStorage";
import {
  createAlarmFromDraft,
  deleteAlarms as deleteAlarmsWorkflow,
  toggleAlarmEnabled,
  updateAlarmFromDraft,
} from "../services/alarm/alarmWorkflow";
import { useAlarmPermissionsStore } from "../stores/alarmPermissionsStore";
import type { AlarmPermissionState } from "../stores/alarmPermissionsStore";
import type { AlarmDraft, AlarmItem } from "../types/alarm.types";

const DEFAULT_SOUND = "Arcade";

const selectHasExactAlarm = (state: AlarmPermissionState) => state.hasExactAlarm;
const selectHasPostNotifications = (state: AlarmPermissionState) => state.hasPostNotifications;
const selectHasVibrate = (state: AlarmPermissionState) => state.hasVibrate;

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
    policyMode: "normal",
    policyPayload: null,
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
  policyMode: alarm.policyMode ?? "normal",
  policyPayload: alarm.policyPayload ?? null,
});

type EditorState =
  | {
      mode: "create";
      draft: AlarmDraft;
    }
  | {
      mode: "edit";
      draft: AlarmDraft;
      alarm: AlarmItem;
    };

const HomeScreen: React.FC = () => {
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const alarmsQuery = useQuery<AlarmItem[]>({
    queryKey: ["alarms"],
    queryFn: fetchAlarms,
  });

  const alarms = alarmsQuery.data ?? [];
  const isLoadingAlarms = alarmsQuery.isLoading;
  const selectionCount = selectedIds.length;
  const hasAlarms = alarms.length > 0;
  const isAllSelected = hasAlarms && selectionCount === alarms.length;

  const hasExactAlarm = useAlarmPermissionsStore(selectHasExactAlarm);
  const hasPostNotifications = useAlarmPermissionsStore(selectHasPostNotifications);
  const hasVibrate = useAlarmPermissionsStore(selectHasVibrate);
  const {
    hydratePermissions,
    requestPostNotifications,
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
    hydratePermissions,
    openExactAlarmSettings,
    requestPostNotifications,
    requestVibrate,
  ]);

  const invalidateAlarms = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["alarms"] }),
    [queryClient],
  );

  const createAlarmMutation = useMutation({
    mutationFn: createAlarmFromDraft,
    onSuccess: () => {
      void invalidateAlarms();
    },
  });

  const updateAlarmMutation = useMutation({
    mutationFn: ({ alarm, draft }: { alarm: AlarmItem; draft: AlarmDraft }) =>
      updateAlarmFromDraft(alarm, draft),
    onSuccess: () => {
      void invalidateAlarms();
    },
  });

  const toggleAlarmMutation = useMutation({
    mutationFn: ({ alarm, enabled }: { alarm: AlarmItem; enabled: boolean }) =>
      toggleAlarmEnabled(alarm, enabled),
    onSuccess: () => {
      void invalidateAlarms();
    },
  });

  const closeEditor = useCallback(() => {
    setEditorState(null);
  }, []);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds([]);
  }, []);

  const enterSelectionMode = useCallback((initialId?: string) => {
    setIsSelectionMode(true);
    if (initialId) {
      setSelectedIds([initialId]);
    } else {
      setSelectedIds([]);
    }
  }, []);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(existing => existing !== id) : [...prev, id],
    );
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(alarms.map(item => item.id));
    setIsSelectionMode(true);
  }, [alarms, isAllSelected]);

  const handleLongPressCard = useCallback(
    (id: string) => {
      enterSelectionMode(id);
    },
    [enterSelectionMode],
  );

  const deleteAlarmsMutation = useMutation({
    mutationFn: (targets: AlarmItem[]) => deleteAlarmsWorkflow(targets),
    onSuccess: () => {
      exitSelectionMode();
      void invalidateAlarms();
    },
  });

  const handleDeleteSelected = useCallback(() => {
    if (selectionCount === 0 || deleteAlarmsMutation.isPending) {
      return;
    }

    const selectedSet = new Set(selectedIds);
    const targets = alarms.filter(alarm => selectedSet.has(alarm.id));

    if (targets.length === 0) {
      exitSelectionMode();
      return;
    }

    Alert.alert(
      "알람 삭제",
      `${targets.length}개의 알람을 삭제할까요?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: () => {
            deleteAlarmsMutation
              .mutateAsync(targets)
              .catch(error => {
                console.warn("[Alarm] Failed to delete alarms", error);
                Alert.alert("삭제 실패", "알람을 삭제하는 중 오류가 발생했습니다.");
              });
          },
        },
      ],
    );
  }, [alarms, deleteAlarmsMutation, exitSelectionMode, selectedIds, selectionCount]);

  useEffect(() => {
    if (selectedIds.length === 0) {
      return;
    }
    const validIds = new Set(alarms.map(item => item.id));
    const filtered = selectedIds.filter(id => validIds.has(id));
    if (filtered.length !== selectedIds.length) {
      setSelectedIds(filtered);
    }
    if (isSelectionMode && filtered.length === 0) {
      setIsSelectionMode(false);
    }
  }, [alarms, isSelectionMode, selectedIds]);

  const handleSaveDraft = useCallback(
    async (payload: AlarmDraft) => {
      const permissionsOk = await ensureCorePermissions();
      if (!permissionsOk) {
        return;
      }

      try {
        if (editorState?.mode === "edit") {
          await updateAlarmMutation.mutateAsync({ alarm: editorState.alarm, draft: payload });
        } else {
          await createAlarmMutation.mutateAsync(payload);
        }
        setEditorState(null);
      } catch (error) {
        console.warn("[Alarm] Failed to save alarm", error);
        Alert.alert("알람 저장 실패", "알람을 저장하는 중 오류가 발생했습니다.");
      }
    },
    [createAlarmMutation, editorState, ensureCorePermissions, updateAlarmMutation],
  );

  const handleToggle = useCallback(
    async (target: AlarmItem, enabled: boolean) => {
      if (enabled) {
        const permissionsOk = await ensureCorePermissions();
        if (!permissionsOk) {
          return;
        }
      }

      try {
        await toggleAlarmMutation.mutateAsync({ alarm: target, enabled });
      } catch (error) {
        console.warn("[Alarm] Failed to toggle alarm", error);
        Alert.alert(
          "알람 처리 실패",
          enabled
            ? "알람을 켜는 중 오류가 발생했습니다."
            : "알람을 끄는 중 오류가 발생했습니다.",
        );
      }
    },
    [ensureCorePermissions, toggleAlarmMutation],
  );

  const openCreateEditor = useCallback(() => {
    setEditorState({ mode: "create", draft: createDefaultDraft() });
  }, []);

  const openEditEditor = useCallback(
    (alarm: AlarmItem) => {
      if (isSelectionMode) {
        toggleSelection(alarm.id);
        return;
      }
      setEditorState({ mode: "edit", draft: toDraft(alarm), alarm });
    },
    [isSelectionMode, toggleSelection],
  );

  const renderAlarm = useCallback(
    ({ item }: { item: AlarmItem }) => (
      <AlarmListItem
        alarm={item}
        onPress={() => openEditEditor(item)}
        onToggle={value => handleToggle(item, value)}
        onLongPress={() => handleLongPressCard(item.id)}
        onToggleSelection={() => toggleSelection(item.id)}
        selectionMode={isSelectionMode}
        selected={selectedIds.includes(item.id)}
      />
    ),
    [
      handleLongPressCard,
      handleToggle,
      isSelectionMode,
      openEditEditor,
      selectedIds,
      toggleSelection,
    ],
  );

  const keyExtractor = useCallback((item: AlarmItem) => item.id, []);

  const editorVisible = Boolean(editorState);
  const draftForEditor = useMemo(
    () => (editorState ? editorState.draft : createDefaultDraft()),
    [editorState],
  );

  const showPermissionWarning = useMemo(
    () => !hasPostNotifications || !hasExactAlarm || !hasVibrate,
    [hasExactAlarm, hasPostNotifications, hasVibrate],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {isSelectionMode ? (
          <View style={styles.selectionHeader}>
            <Pressable onPress={exitSelectionMode} accessibilityLabel="선택 취소">
              <Text style={styles.selectionAction}>취소</Text>
            </Pressable>
            <View style={styles.selectionActions}>
              <Pressable
                onPress={toggleSelectAll}
                accessibilityLabel="모두 선택"
                disabled={!hasAlarms || deleteAlarmsMutation.isPending}
              >
                <Text
                  style={[
                    styles.selectionAction,
                    !hasAlarms || deleteAlarmsMutation.isPending
                      ? styles.selectionActionDisabled
                      : null,
                  ]}
                >
                  {isAllSelected ? "모두 해제" : "모두 선택"}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleDeleteSelected}
                accessibilityLabel="선택 삭제"
                disabled={selectionCount === 0 || deleteAlarmsMutation.isPending}
              >
                <Text
                  style={[
                    styles.selectionAction,
                    styles.selectionDelete,
                    selectionCount === 0 || deleteAlarmsMutation.isPending
                      ? styles.selectionActionDisabled
                      : null,
                  ]}
                >
                  삭제
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.headerTitle}>알람</Text>
                <Text style={styles.headerSubtitle}>기본 시계 앱처럼 빠르게 관리하세요</Text>
              </View>
              {hasAlarms ? (
                <Pressable onPress={() => enterSelectionMode()} accessibilityLabel="알람 편집">
                  <Text style={styles.editButton}>편집</Text>
                </Pressable>
              ) : null}
            </View>
            {showPermissionWarning ? (
              <View style={styles.permissionBanner}>
                <Text style={styles.permissionTitle}>필수 권한이 필요해요</Text>
                <Text style={styles.permissionMessage}>
                  정확한 알람, 알림, 진동, 위치 권한을 모두 허용해야 제 시간에 알람을 울릴 수 있어요.
                </Text>
              </View>
            ) : null}
          </>
        )}
      </View>

      {isLoadingAlarms ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>⏳</Text>
          <Text style={styles.emptyTitle}>알람을 불러오는 중입니다</Text>
          <Text style={styles.emptySubtitle}>잠시만 기다려 주세요.</Text>
        </View>
      ) : alarms.length === 0 ? (
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
          extraData={{ isSelectionMode, selectedIds }}
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  editButton: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2563eb",
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
  selectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectionActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectionAction: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2563eb",
    marginLeft: 20,
  },
  selectionActionDisabled: {
    color: "#9ca3af",
  },
  selectionDelete: {
    color: "#ef4444",
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
