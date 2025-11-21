import { PermissionsAndroid as NativePermissionsAndroid, Platform } from "react-native";

import { useAlarmPermissionsStore } from "../stores/alarmPermissionsStore";

const permissionsAndroid = NativePermissionsAndroid as unknown as {
  check(permission: string): Promise<boolean>;
  requestMultiple(permissions: string[]): Promise<Record<string, string>>;
};

const rawPermissions = NativePermissionsAndroid.PERMISSIONS as Record<string, string | undefined>;

const foregroundServicePermission =
  rawPermissions.FOREGROUND_SERVICE_LOCATION ?? "android.permission.FOREGROUND_SERVICE_LOCATION";

const foregroundLocationPermissions = [rawPermissions.ACCESS_FINE_LOCATION, foregroundServicePermission].filter(
  (permission): permission is string => Boolean(permission),
);

export const ensureLocationForegroundServicePermission = async (): Promise<boolean> => {
  if (Platform.OS !== "android") {
    return true;
  }

  if (Platform.Version < 34) {
    return true;
  }

  if (foregroundLocationPermissions.length === 0) {
    return true;
  }

  const checks = await Promise.all(foregroundLocationPermissions.map(permission => permissionsAndroid.check(permission)));

  if (checks.every(Boolean)) {
    return true;
  }

  const results = await permissionsAndroid.requestMultiple(foregroundLocationPermissions);
  const granted = foregroundLocationPermissions.every(
    permission => results[permission] === NativePermissionsAndroid.RESULTS.GRANTED,
  );

  if (granted) {
    await useAlarmPermissionsStore.getState().hydratePermissions();
  }

  return granted;
};
