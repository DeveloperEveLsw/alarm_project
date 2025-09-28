import React from "react";
import { View, Text, StyleSheet, Pressable, Linking, Platform } from "react-native";

const openSettings = async () => {
  try {
    await Linking.openSettings();
  } catch (error) {
    console.warn("알림", "설정 화면을 열 수 없습니다.", error);
  }
};

const requestExactAlarm = async () => {
  if (Platform.OS !== "android") {
    return;
  }

  try {
    await Linking.sendIntent("android.settings.REQUEST_SCHEDULE_EXACT_ALARM");
  } catch (error) {
    console.warn("정확한 알람 권한 요청 실패", error);
    openSettings();
  }
};

const openNotificationSettings = async () => {
  if (Platform.OS !== "android") {
    return;
  }

  try {
    await Linking.sendIntent("android.settings.APP_NOTIFICATION_SETTINGS");
  } catch (error) {
    console.warn("알림 설정 화면을 열 수 없습니다.", error);
    openSettings();
  }
};

const AlarmPermissionsScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>알람 안정성을 위한 설정</Text>
      <Text style={styles.description}>
        안드로이드 OS 보안 정책으로 인해 아래 항목을 모두 허용해야 백업 알람과 전체 화면 알림이 정상 작동합니다.
      </Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>1. 정확한 알람 권한</Text>
        <Text style={styles.cardBody}>
          Android 12 이상에서는 정확한 알람 권한이 비활성화되어 있으면 Doze 모드에서 알람이 지연될 수 있습니다.
        </Text>
        <Pressable style={styles.cardButton} onPress={requestExactAlarm}>
          <Text style={styles.cardButtonLabel}>권한 설정 열기</Text>
        </Pressable>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>2. 알림 권한</Text>
        <Text style={styles.cardBody}>전체 화면 알림과 헤드업을 위해 알림 권한이 필요합니다.</Text>
        <Pressable style={styles.cardButton} onPress={openNotificationSettings}>
          <Text style={styles.cardButtonLabel}>알림 설정 열기</Text>
        </Pressable>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>3. 배터리 최적화 해제</Text>
        <Text style={styles.cardBody}>
          앱이 절전 모드로 전환되지 않도록 배터리 최적화에서 제외해 주세요. 제조사마다 위치가 다를 수 있습니다.
        </Text>
        <Pressable style={styles.cardButton} onPress={openSettings}>
          <Text style={styles.cardButtonLabel}>시스템 설정 열기</Text>
        </Pressable>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>4. 위치 권한</Text>
        <Text style={styles.cardBody}>
          위치 기반 미션을 사용하려면 앱 권한에서 위치 (정확/배경) 허용이 필요합니다.
        </Text>
        <Pressable style={styles.cardButton} onPress={openSettings}>
          <Text style={styles.cardButtonLabel}>권한 관리로 이동</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: "#f8fafc",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    color: "#0f172a",
  },
  description: {
    fontSize: 15,
    color: "#475569",
    marginBottom: 20,
    lineHeight: 22,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#0f172a",
  },
  cardBody: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
    marginBottom: 12,
  },
  cardButton: {
    alignSelf: "flex-start",
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  cardButtonLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default AlarmPermissionsScreen;
