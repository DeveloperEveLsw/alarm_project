import { NativeModules } from 'react-native';

const { LocationBasedService } = NativeModules;

export interface LocationSnapshot {
  latitude: number;
  longitude: number;
  accuracy: number;
  age: number;
  provider: string;
}

export interface LocationArea {
  latitude: number;
  longitude: number;
  radius: number;
  visitCount: number;
  lastVisited: number;
}

export interface LocationPatternAnalysis {
  totalLocations: number;
  averageAccuracy: number;
  mostFrequentArea: LocationArea | null;
  movementDistance: number;
  analysisPeriod: number;
}

export interface BatteryStatus {
  batteryLevel: number;
  isPowerSaveMode: boolean;
  isBatteryOptimized: boolean;
  isBackgroundRestricted: boolean;
}

export type LocationConditionType = 'in_location' | 'out_of_location' | 'anywhere';
export type GeofenceTransitionType = 'enter' | 'exit';

class LocationBasedServiceAPI {
  /**
   * 현재 위치 가져오기
   */
  async getCurrentLocation(): Promise<LocationSnapshot> {
    return LocationBasedService.getCurrentLocation();
  }

  /**
   * 위치 기반 알람 설정
   */
  async setLocationBasedAlarm(
    alarmId: string,
    latitude: number,
    longitude: number,
    radius: number,
    conditionType: LocationConditionType
  ): Promise<boolean> {
    return LocationBasedService.setLocationBasedAlarm(
      alarmId,
      latitude,
      longitude,
      radius,
      conditionType
    );
  }

  /**
   * 지오펜싱 알람 추가
   */
  async addGeofenceAlarm(
    alarmId: string,
    latitude: number,
    longitude: number,
    radius: number,
    transitionType: GeofenceTransitionType
  ): Promise<boolean> {
    return LocationBasedService.addGeofenceAlarm(
      alarmId,
      latitude,
      longitude,
      radius,
      transitionType
    );
  }

  /**
   * 지오펜싱 알람 제거
   */
  async removeGeofenceAlarm(alarmId: string): Promise<boolean> {
    return LocationBasedService.removeGeofenceAlarm(alarmId);
  }

  /**
   * 위치 히스토리 조회
   */
  async getLocationHistory(days: number = 7): Promise<LocationSnapshot[]> {
    return LocationBasedService.getLocationHistory(days);
  }

  /**
   * 위치 패턴 분석
   */
  async analyzeLocationPattern(days: number = 7): Promise<LocationPatternAnalysis> {
    return LocationBasedService.analyzeLocationPattern(days);
  }

  /**
   * 배터리 최적화 상태 확인
   */
  async getBatteryOptimizationStatus(): Promise<BatteryStatus> {
    return LocationBasedService.getBatteryOptimizationStatus();
  }

  /**
   * 배터리 최적화 해제 요청
   */
  async requestBatteryOptimizationExemption(): Promise<boolean> {
    return LocationBasedService.requestBatteryOptimizationExemption();
  }

  /**
   * 배터리 최적화 권장사항 가져오기
   */
  async getBatteryOptimizationTips(): Promise<string[]> {
    return LocationBasedService.getBatteryOptimizationTips();
  }

  /**
   * 백그라운드 위치 추적 서비스 시작
   */
  async startBackgroundLocationTracking(): Promise<boolean> {
    return LocationBasedService.startBackgroundLocationTracking();
  }

  /**
   * 백그라운드 위치 추적 서비스 중지
   */
  async stopBackgroundLocationTracking(): Promise<boolean> {
    return LocationBasedService.stopBackgroundLocationTracking();
  }
}

export default new LocationBasedServiceAPI();
