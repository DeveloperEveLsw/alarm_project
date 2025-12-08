import { useCallback } from "react";
import { Alert } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { backupService } from "../services/backupService";
import { useAuthStore } from "../stores/authStore";

export const useRestoreAction = () => {
  const user = useAuthStore(state => state.user);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: backupService.restoreLatest,
    onSuccess: async result => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["alarms"] }),
        queryClient.invalidateQueries({ queryKey: ["categories"] }),
        queryClient.invalidateQueries({ queryKey: ["alarm-templates"] }),
        queryClient.invalidateQueries({ queryKey: ["todos"] }),
      ]);
      const formatted = new Date(result.restoredAt).toLocaleString();
      Alert.alert("복원 완료", `${formatted} 기준 백업을 기기에 적용했어요.`);
    },
    onError: error => {
      const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      Alert.alert("복원 실패", message);
    },
  });

  const handleRestore = useCallback(() => {
    if (!user) {
      Alert.alert("로그인이 필요해요", "Google 계정으로 로그인하면 백업을 가져올 수 있어요.");
      return;
    }
    Alert.alert("백업 가져오기", "현재 기기의 데이터를 백업으로 덮어쓸까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "가져오기",
        style: "destructive",
        onPress: () => mutation.mutate({ ownerId: user.id }),
      },
    ]);
  }, [mutation, user]);

  return {
    startRestore: handleRestore,
    isRestoring: mutation.isPending,
  };
};
