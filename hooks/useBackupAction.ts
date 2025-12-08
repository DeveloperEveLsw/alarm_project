import { useCallback } from "react";
import { Alert } from "react-native";
import { useMutation } from "@tanstack/react-query";

import { backupService } from "../services/backupService";
import { useAuthStore } from "../stores/authStore";

export const useBackupAction = () => {
  const user = useAuthStore(state => state.user);
  const mutation = useMutation({
    mutationFn: backupService.backupNow,
    onSuccess: result => {
      const formatted = new Date(result.exportedAt).toLocaleString();
      Alert.alert("백업 완료", `Supabase에 ${formatted} 기준으로 데이터가 저장되었어요.`);
    },
    onError: error => {
      const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      Alert.alert("백업 실패", message);
    },
  });

  const handleBackup = useCallback(() => {
    if (!user) {
      Alert.alert("로그인이 필요해요", "Google 계정으로 로그인한 뒤 백업 기능을 사용할 수 있어요.");
      return;
    }
    mutation.mutate({ ownerId: user.id });
  }, [mutation, user]);

  return {
    startBackup: handleBackup,
    isBackingUp: mutation.isPending,
  };
};
