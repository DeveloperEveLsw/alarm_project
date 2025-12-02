import type { AlarmLocationInfo } from "../../types/alarm.types";
import { geofencingService } from "./geofencingService";
import { localDatabase } from "../db/localDatabase";

const registerAlarmGeofence = async (alarmId: string, location: AlarmLocationInfo) => {
  try {
    await geofencingService.addAlarmGeofence(
      alarmId,
      location.latitude,
      location.longitude,
      location.radius,
      "enter",
    );
  } catch (error) {
    console.warn("[AlarmGeofencing] Failed to register geofence with OS", error);
  }

  try {
    await localDatabase.setAlarmGeofenceZone(alarmId, location);
  } catch (error) {
    console.warn("[AlarmGeofencing] Failed to persist geofence zone", error);
  }
};

const unregisterAlarmGeofence = async (alarmId: string) => {
  try {
    await geofencingService.removeAlarmGeofence(alarmId);
  } catch (error) {
    console.warn("[AlarmGeofencing] Failed to remove geofence from OS", error);
  }

  try {
    await localDatabase.removeAlarmGeofenceZone(alarmId);
  } catch (error) {
    console.warn("[AlarmGeofencing] Failed to remove geofence zone from DB", error);
  }
};

export const syncAlarmGeofence = async (
  alarmId: string,
  location: AlarmLocationInfo | null,
  enabled: boolean,
) => {
  if (!location || !enabled) {
    await unregisterAlarmGeofence(alarmId);
    return;
  }

  await unregisterAlarmGeofence(alarmId);
  await registerAlarmGeofence(alarmId, location);
};

export const removeAlarmGeofence = async (alarmId: string) => {
  await unregisterAlarmGeofence(alarmId);
};
