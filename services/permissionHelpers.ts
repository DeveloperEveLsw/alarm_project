import { PermissionsAndroid, Platform } from "react-native";

import { useAlarmPermissionsStore } from "../stores/alarmPermissionsStore";

const foregroundLocationPermissions = [
  PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  PermissionsAndroid.PERMISSIONS.FOREGROUND_SERVICE_LOCATION,
].filter((permission): permission is PermissionsAndroid.Permission => Boolean(permission));

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

  const checks = await Promise.all(
    foregroundLocationPermissions.map(permission => PermissionsAndroid.check(permission)),
  );

  if (checks.every(Boolean)) {
    return true;
  }

  const results = await PermissionsAndroid.requestMultiple(foregroundLocationPermissions);
  const granted = foregroundLocationPermissions.every(
    permission => results[permission] === PermissionsAndroid.RESULTS.GRANTED,
  );

  if (granted) {
    await useAlarmPermissionsStore.getState().hydratePermissions();
  }

  return granted;
};
