import { Linking, PermissionsAndroid, Platform } from "react-native";
import { create } from "zustand";

const isAndroid = Platform.OS === "android";
const sdkVersion = Platform.Version as number;

const PERMISSIONS = PermissionsAndroid.PERMISSIONS;

const POST_NOTIFICATIONS = PERMISSIONS?.POST_NOTIFICATIONS ?? "android.permission.POST_NOTIFICATIONS";
const ACCESS_FINE_LOCATION = PERMISSIONS?.ACCESS_FINE_LOCATION ?? "android.permission.ACCESS_FINE_LOCATION";
const ACCESS_BACKGROUND_LOCATION = PERMISSIONS?.ACCESS_BACKGROUND_LOCATION ?? "android.permission.ACCESS_BACKGROUND_LOCATION";

export type AlarmPermissionState = {
  hasPostNotifications: boolean;
  hasFineLocation: boolean;
  hasBackgroundLocation: boolean;
  hasExactAlarm: boolean;
  lastCheckedAt: number | null;
  hydratePermissions: () => Promise<void>;
  requestPostNotifications: () => Promise<boolean>;
  requestFineLocation: () => Promise<boolean>;
  requestBackgroundLocation: () => Promise<boolean>;
  openExactAlarmSettings: () => Promise<void>;
  acknowledgeExactAlarmPermission: (granted: boolean) => void;
};

const inferExactAlarm = (): boolean => {
  if (!isAndroid) return true;
  if (sdkVersion < 31) return true;
  // Android 12 이상에서는 정확한 알람 권한을 RN에서 직접 확인할 수 없어 사용자 확인이 필요함
  return false;
};

const checkPermission = async (permission: string): Promise<boolean> => {
  try {
    if (!isAndroid) return true;
    return await PermissionsAndroid.check(permission as any);
  } catch (error) {
    console.warn("[Permissions] check failed", permission, error);
    return false;
  }
};

const requestPermission = async (permission: string): Promise<boolean> => {
  try {
    if (!isAndroid) return true;
    const result = await PermissionsAndroid.request(permission as any);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.warn("[Permissions] request failed", permission, error);
    return false;
  }
};

export const useAlarmPermissionsStore = create<AlarmPermissionState>((set, get) => ({
  hasPostNotifications: !isAndroid || sdkVersion < 33,
  hasFineLocation: !isAndroid,
  hasBackgroundLocation: !isAndroid || sdkVersion < 29,
  hasExactAlarm: inferExactAlarm(),
  lastCheckedAt: null,

  hydratePermissions: async () => {
    if (!isAndroid) {
      set({
        hasPostNotifications: true,
        hasFineLocation: true,
        hasBackgroundLocation: true,
        hasExactAlarm: true,
        lastCheckedAt: Date.now(),
      });
      return;
    }

    const [post, fine, background] = await Promise.all([
      sdkVersion >= 33 ? checkPermission(POST_NOTIFICATIONS) : Promise.resolve(true),
      checkPermission(ACCESS_FINE_LOCATION),
      sdkVersion >= 29 ? checkPermission(ACCESS_BACKGROUND_LOCATION) : Promise.resolve(true),
    ]);

    set({
      hasPostNotifications: post,
      hasFineLocation: fine,
      hasBackgroundLocation: background,
      lastCheckedAt: Date.now(),
    });
  },

  requestPostNotifications: async () => {
    if (!isAndroid || sdkVersion < 33) {
      set({ hasPostNotifications: true });
      return true;
    }
    const granted = await requestPermission(POST_NOTIFICATIONS);
    set({ hasPostNotifications: granted });
    return granted;
  },

  requestFineLocation: async () => {
    if (!isAndroid) {
      set({ hasFineLocation: true });
      return true;
    }
    const granted = await requestPermission(ACCESS_FINE_LOCATION);
    set({ hasFineLocation: granted });
    return granted;
  },

  requestBackgroundLocation: async () => {
    if (!isAndroid || sdkVersion < 29) {
      set({ hasBackgroundLocation: true });
      return true;
    }
    const fineGranted = get().hasFineLocation || (await get().requestFineLocation());
    if (!fineGranted) {
      set({ hasBackgroundLocation: false });
      return false;
    }
    const granted = await requestPermission(ACCESS_BACKGROUND_LOCATION);
    set({ hasBackgroundLocation: granted });
    return granted;
  },

  openExactAlarmSettings: async () => {
    if (!isAndroid) return;

    const intentAction = sdkVersion >= 31
      ? "android.settings.REQUEST_SCHEDULE_EXACT_ALARM"
      : "android.settings.APPLICATION_DETAILS_SETTINGS";

    try {
      if (typeof Linking.sendIntent === "function") {
        await Linking.sendIntent(intentAction);
      } else {
        await Linking.openSettings();
      }
    } catch (error) {
      console.warn("[Permissions] exact alarm intent failed", error);
      await Linking.openSettings();
    }
  },

  acknowledgeExactAlarmPermission: (granted: boolean) => {
    set({ hasExactAlarm: granted });
  },
}));

