import { NativeModules, Platform } from "react-native";
import { create } from "zustand";

const isAndroid = Platform.OS === "android";

type PermissionBridge = {
  checkPostNotifications: () => Promise<boolean>;
  requestPostNotifications: () => Promise<boolean>;
  checkFineLocation: () => Promise<boolean>;
  requestFineLocation: () => Promise<boolean>;
  checkBackgroundLocation: () => Promise<boolean>;
  requestBackgroundLocation: () => Promise<boolean>;
  checkVibrate: () => Promise<boolean>;
  requestVibrate: () => Promise<boolean>;
  canScheduleExactAlarms: () => Promise<boolean>;
  openScheduleExactAlarmSettings: () => Promise<boolean>;
};

const PermissionModule: Partial<PermissionBridge> = isAndroid ? NativeModules.PermissionModule ?? {} : {};

export type AlarmPermissionState = {
  hasPostNotifications: boolean;
  hasFineLocation: boolean;
  hasBackgroundLocation: boolean;
  hasExactAlarm: boolean;
  hasVibrate: boolean;
  lastCheckedAt: number | null;
  hydratePermissions: () => Promise<void>;
  requestPostNotifications: () => Promise<boolean>;
  requestFineLocation: () => Promise<boolean>;
  requestBackgroundLocation: () => Promise<boolean>;
  requestVibrate: () => Promise<boolean>;
  openExactAlarmSettings: () => Promise<void>;
  acknowledgeExactAlarmPermission: (granted: boolean) => void;
};

export const useAlarmPermissionsStore = create<AlarmPermissionState>((set, get) => ({
  hasPostNotifications: !isAndroid,
  hasFineLocation: !isAndroid,
  hasBackgroundLocation: !isAndroid,
  hasExactAlarm: !isAndroid,
  hasVibrate: !isAndroid,
  lastCheckedAt: null,

  hydratePermissions: async () => {
    if (!isAndroid || !PermissionModule.checkPostNotifications) {
      set({
        hasPostNotifications: true,
        hasFineLocation: true,
        hasBackgroundLocation: true,
        hasExactAlarm: true,
        hasVibrate: true,
        lastCheckedAt: Date.now(),
      });
      return;
    }

    try {
      const [post, fine, background, vibrate, exact] = await Promise.all([
        PermissionModule.checkPostNotifications(),
        PermissionModule.checkFineLocation?.() ?? Promise.resolve(false),
        PermissionModule.checkBackgroundLocation?.() ?? Promise.resolve(false),
        PermissionModule.checkVibrate?.() ?? Promise.resolve(true),
        PermissionModule.canScheduleExactAlarms?.() ?? Promise.resolve(false),
      ]);

      set({
        hasPostNotifications: post,
        hasFineLocation: fine,
        hasBackgroundLocation: background,
        hasVibrate: vibrate,
        hasExactAlarm: exact,
        lastCheckedAt: Date.now(),
      });
    } catch (error) {
      console.warn("[Permissions] hydrate via native failed", error);
      set({
        hasPostNotifications: false,
        hasFineLocation: false,
        hasBackgroundLocation: false,
        hasExactAlarm: false,
        hasVibrate: false,
        lastCheckedAt: Date.now(),
      });
    }
  },

  requestPostNotifications: async () => {
    if (!isAndroid || !PermissionModule.requestPostNotifications) {
      set({ hasPostNotifications: true });
      return true;
    }
    try {
      const granted = await PermissionModule.requestPostNotifications();
      set({ hasPostNotifications: granted });
      return granted;
    } catch (error) {
      console.warn("[Permissions] requestPostNotifications failed", error);
      set({ hasPostNotifications: false });
      return false;
    }
  },

  requestFineLocation: async () => {
    if (!isAndroid || !PermissionModule.requestFineLocation) {
      set({ hasFineLocation: true });
      return true;
    }
    try {
      const granted = await PermissionModule.requestFineLocation();
      set({ hasFineLocation: granted });
      return granted;
    } catch (error) {
      console.warn("[Permissions] requestFineLocation failed", error);
      set({ hasFineLocation: false });
      return false;
    }
  },

  requestBackgroundLocation: async () => {
    if (!isAndroid || !PermissionModule.requestBackgroundLocation) {
      set({ hasBackgroundLocation: true });
      return true;
    }
    try {
      const granted = await PermissionModule.requestBackgroundLocation();
      set({ hasBackgroundLocation: granted });
      return granted;
    } catch (error) {
      console.warn("[Permissions] requestBackgroundLocation failed", error);
      set({ hasBackgroundLocation: false });
      return false;
    }
  },

  requestVibrate: async () => {
    if (!isAndroid || !PermissionModule.requestVibrate) {
      set({ hasVibrate: true });
      return true;
    }
    try {
      const granted = await PermissionModule.requestVibrate();
      set({ hasVibrate: granted });
      return granted;
    } catch (error) {
      console.warn("[Permissions] requestVibrate failed", error);
      set({ hasVibrate: false });
      return false;
    }
  },

  openExactAlarmSettings: async () => {
    if (!isAndroid || !PermissionModule.openScheduleExactAlarmSettings) {
      return;
    }

    try {
      await PermissionModule.openScheduleExactAlarmSettings();
    } catch (error) {
      console.warn("[Permissions] exact alarm settings intent failed", error);
    }
  },

  acknowledgeExactAlarmPermission: (granted: boolean) => {
    set({ hasExactAlarm: granted });
  },
}));
