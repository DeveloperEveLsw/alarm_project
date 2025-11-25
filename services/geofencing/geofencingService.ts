import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import Geolocation, { GeolocationError, GeolocationResponse } from '@react-native-community/geolocation';

const isAndroid = Platform.OS === 'android';

interface GeofencingModuleBridge {
  addGeofence(geofenceData: {
    id: string;
    latitude: number;
    longitude: number;
    radius: number;
    transitionTypes: number; // GEOFENCE_TRANSITION_ENTER | GEOFENCE_TRANSITION_EXIT | GEOFENCE_TRANSITION_DWELL
  }): Promise<boolean>;
  removeGeofence(geofenceId: string): Promise<boolean>;
  removeAllGeofences(): Promise<boolean>;
  getActiveGeofences(): Promise<any[]>; // Returns a list of active geofence IDs or data
}

const GeofencingModule: GeofencingModuleBridge = isAndroid
  ? NativeModules.GeofencingModule || {}
  : ({} as GeofencingModuleBridge);

// 디버깅을 위한 로그
if (isAndroid) {
  console.log('🔍 Available NativeModules:', Object.keys(NativeModules));
  console.log('🔍 GeofencingModule:', NativeModules.GeofencingModule);
}

// 지오펜싱 상수 정의
const GEOFENCE_TRANSITION = {
  ENTER: 1,
  EXIT: 2,
  DWELL: 4,
};

export const geofencingService = {
  async checkLocationPermission(): Promise<boolean> {
    if (!isAndroid) return true;
    try {
      const fineLocationGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      const backgroundLocationGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
      );
      return fineLocationGranted && backgroundLocationGranted;
    } catch (err) {
      console.warn(err);
      return false;
    }
  },

  async requestLocationPermission(): Promise<boolean> {
    if (!isAndroid) return true;
    try {
      // 먼저 기본 위치 권한 요청
      const fineLocationGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: '위치 권한 필요',
          message: '지오펜싱 기능을 사용하려면 정확한 위치 권한이 필요합니다.',
          buttonNeutral: '나중에',
          buttonNegative: '거부',
          buttonPositive: '허용',
        }
      );

      if (fineLocationGranted !== PermissionsAndroid.RESULTS.GRANTED) {
        return false;
      }

      // Android 10 이상에서는 백그라운드 위치 권한도 별도로 요청
      if (isAndroid && Number(Platform.Version) >= 29) {
        const backgroundLocationGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
          {
            title: '백그라운드 위치 권한 필요',
            message: '앱이 백그라운드에서도 위치를 확인할 수 있도록 권한이 필요합니다.',
            buttonNeutral: '나중에',
            buttonNegative: '거부',
            buttonPositive: '허용',
          }
        );

        return backgroundLocationGranted === PermissionsAndroid.RESULTS.GRANTED;
      }

      return true;
    } catch (err) {
      console.warn('Location permission request failed:', err);
      return false;
    }
  },

  async addStationGeofence(
    geofenceId: string,
    latitude: number,
    longitude: number,
    radius: number
  ): Promise<boolean> {
    if (!isAndroid) return true;

    if (!NativeModules.GeofencingModule || typeof NativeModules.GeofencingModule.addGeofence !== 'function') {
      console.error('❌ GeofencingModule not available or addGeofence function missing');
      throw new Error('GeofencingModule is not available');
    }

    // Station은 ENTER 트리거만 사용 (진입 시 알람 끄기)
    const transitionTypes = GEOFENCE_TRANSITION.ENTER;

    return GeofencingModule.addGeofence({
      id: geofenceId,
      latitude,
      longitude,
      radius,
      transitionTypes,
    });
  },

  async removeStationGeofence(geofenceId: string): Promise<boolean> {
    if (!isAndroid) return true;
    return GeofencingModule.removeGeofence(geofenceId);
  },

  async addAlarmGeofence(
    alarmId: string,
    latitude: number,
    longitude: number,
    radius: number,
    condition: 'enter' | 'exit' | 'dwell',
    loiteringDelayMinutes?: number
  ): Promise<boolean> {
    if (!isAndroid) return true;

    // GeofencingModule이 제대로 로드되었는지 확인
    if (!NativeModules.GeofencingModule || typeof NativeModules.GeofencingModule.addGeofence !== 'function') {
      console.error('❌ GeofencingModule not available or addGeofence function missing');
      console.log('Available modules:', Object.keys(NativeModules));
      throw new Error('GeofencingModule is not available');
    }

    let transitionTypes = 0;
    switch (condition) {
      case 'enter':
        transitionTypes = GEOFENCE_TRANSITION.ENTER;
        break;
      case 'exit':
        transitionTypes = GEOFENCE_TRANSITION.EXIT;
        break;
      case 'dwell':
        transitionTypes = GEOFENCE_TRANSITION.DWELL;
        break;
    }

    const geofenceData: any = {
      id: alarmId,
      latitude,
      longitude,
      radius,
      transitionTypes,
    };

    // DWELL 트리거인 경우에만 loiteringDelayMinutes 전달
    if (condition === 'dwell' && loiteringDelayMinutes !== undefined) {
      geofenceData.loiteringDelayMinutes = loiteringDelayMinutes;
    }

    return GeofencingModule.addGeofence(geofenceData);
  },

  async removeAlarmGeofence(alarmId: string): Promise<boolean> {
    if (!isAndroid) return true;
    return GeofencingModule.removeGeofence(alarmId);
  },

  async removeAllAlarmGeofences(): Promise<boolean> {
    if (!isAndroid) return true;
    return GeofencingModule.removeAllGeofences();
  },

  async getActiveAlarmGeofences(): Promise<any[]> {
    if (!isAndroid) return [];
    return GeofencingModule.getActiveGeofences();
  },

  // 현재 위치가 지오펜스 범위 내에 있는지 확인
  async isInGeofenceRange(
    latitude: number,
    longitude: number,
    radius: number,
    currentLatitude: number,
    currentLongitude: number
  ): Promise<boolean> {
    if (!isAndroid) return false;

    // 간단한 거리 계산 (Haversine 공식)
    const R = 6371000; // 지구 반지름 (미터)
    const dLat = ((currentLatitude - latitude) * Math.PI) / 180;
    const dLon = ((currentLongitude - longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((latitude * Math.PI) / 180) *
        Math.cos((currentLatitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance <= radius;
  },

  // 현재 위치 가져오기 (디버깅용)
  getCurrentLocation: (): Promise<{ latitude: number; longitude: number; accuracy: number }> => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position: GeolocationResponse) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          console.log('📍 Current location for debugging:', coords);
          resolve(coords);
        },
        (error: GeolocationError) => {
          console.error('📍 Failed to get current location:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    });
  },
};
