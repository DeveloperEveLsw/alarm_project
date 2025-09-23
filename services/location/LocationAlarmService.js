import Geolocation from '@react-native-community/geolocation';
import BusApiService from '../bus/BusApiService';
import DemoBusApiService from '../bus/DemoBusApiService';
import DatabaseService from './DatabaseService';
import { Alert } from 'react-native';

// 개발 중에는 데모 모드 사용
const isDemoMode = true;
const ApiService = isDemoMode ? DemoBusApiService : BusApiService;

class LocationAlarmService {
  constructor() {
    this.isTracking = false;
    this.watchId = null;
    this.currentTrip = null;
    this.currentTripId = null;
    this.geofences = [];
    this.debugLogs = [];
    this.triggeredGeofences = new Set(); // 이미 발생한 지오펜스 추적
    this.isDatabaseInitialized = false;
    this.autoCloseTimer = null; // 알림 자동 종료 타이머
  }

  /**
   * 데이터베이스 초기화
   */
  async initializeDatabase() {
    if (!this.isDatabaseInitialized) {
      try {
        await DatabaseService.initializeDatabase();
        this.isDatabaseInitialized = true;
        this.addDebugLog('✅ SQLite 데이터베이스 초기화 완료');
      } catch (error) {
        this.addDebugLog(`❌ 데이터베이스 초기화 실패: ${error.message}`);
      }
    }
  }

  addDebugLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    this.debugLogs.push({
      timestamp,
      message
    });
    
    // 최근 50개만 유지
    if (this.debugLogs.length > 50) {
      this.debugLogs = this.debugLogs.slice(-50);
    }
    
    console.log(`[LocationAlarm] ${timestamp}: ${message}`);
  }

  /**
   * 목적지 설정 및 알람 시작
   * @param {object} destination - 목적지 {lat, lng, name}
   */
  async startLocationAlarm(destination) {
    try {
      // 0. 데이터베이스 초기화
      await this.initializeDatabase();
      
      this.addDebugLog(`🎯 위치 알람 시작: ${destination.name}`);
      
      // 1. 현재 위치 획득
      this.addDebugLog('📍 현재 위치 획득 중...');
      const currentLocation = await this.getCurrentLocation();
      this.addDebugLog(`📍 현재 위치: (${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)})`);
      
      // 2. 버스 경로 조회
      this.addDebugLog('🔍 버스 경로 조회 중...');
      const route = await ApiService.getBusRoute(currentLocation, destination);
      
      if (!route) {
        this.addDebugLog('❌ 경로를 찾을 수 없음');
        throw new Error('경로를 찾을 수 없습니다.');
      }
      
      this.addDebugLog(`✅ 경로 찾음: ${route.availableBuses.length}개 버스 이용 가능`);

      // 3. 데이터베이스에 여행 정보 저장
      this.addDebugLog('💾 데이터베이스에 여행 정보 저장 중...');
      this.currentTripId = await DatabaseService.createTrip({
        startLocationName: route.startStation.stationName,
        startLat: currentLocation.lat,
        startLng: currentLocation.lng,
        endLocationName: destination.name,
        endLat: destination.lat,
        endLng: destination.lng,
        estimatedTime: route.estimatedTime
      });
      
      // 4. 메모리에 여행 정보 저장
      this.currentTrip = {
        id: this.currentTripId,
        destination: destination,
        route: route,
        startTime: new Date(),
        isActive: true
      };
      this.addDebugLog(`💾 여행 정보 저장 완료 (ID: ${this.currentTripId})`);

      // 5. 지오펜싱 설정
      this.addDebugLog('🔧 지오펜싱 설정 중...');
      await this.setupGeofences(route);

      // 6. 위치 추적 시작
      this.addDebugLog('🔄 위치 추적 시작');
      this.startLocationTracking();

      // 7. 사용자에게 버스 선택 옵션 제공
      this.addDebugLog('✅ 위치 알람 설정 완료');
      return {
        success: true,
        message: '알람이 설정되었습니다.',
        availableBuses: route.availableBuses,
        startStation: route.startStation
      };

    } catch (error) {
      this.addDebugLog(`❌ 위치 알람 시작 실패: ${error.message}`);
      console.error('위치 알람 시작 실패:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 현재 위치 획득
   * @returns {Promise<object>} 현재 위치 {lat, lng}
   */
  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (isDemoMode) {
        // 데모 모드에서는 강남역으로 고정 (실제 현재 위치라고 가정)
        const demoLocation = {
          lat: 37.497952, // 강남역 고정
          lng: 127.027618
        };
        this.addDebugLog(`📍 데모 현재 위치 (강남역): (${demoLocation.lat.toFixed(6)}, ${demoLocation.lng.toFixed(6)})`);
        resolve(demoLocation);
        return;
      }

      // 실제 GPS 사용
      Geolocation.getCurrentPosition(
        position => {
          const realLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          this.addDebugLog(`📍 실제 GPS 위치: (${realLocation.lat.toFixed(6)}, ${realLocation.lng.toFixed(6)})`);
          resolve(realLocation);
        },
        error => {
          this.addDebugLog(`❌ GPS 오류: ${error.message}`);
          // GPS 실패 시 강남역 위치로 폴백
          const fallbackLocation = {
            lat: 37.497952,
            lng: 127.027618
          };
          this.addDebugLog(`📍 폴백 위치 사용: 강남역`);
          resolve(fallbackLocation);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  }

  /**
   * 지오펜싱 설정
   * @param {object} route - 경로 정보
   */
  async setupGeofences(route) {
    this.geofences = [];

    // 목적지 주변 정류장들을 지오펜스로 설정
    for (const [index, station] of route.endStations.entries()) {
      const geofenceData = {
        tripId: this.currentTripId,
        name: `${station.stationName} 하차 알림`,
        lat: station.lat,
        lng: station.lng,
        radius: 100,
        action: 'GET_OFF',
        message: `🚌 ${station.stationName}에 도착했습니다!\n하차하세요!`
      };
      
      // 데이터베이스에 지오펜스 저장
      const geofenceId = await DatabaseService.createGeofence(geofenceData);
      
      // 메모리에 지오펜스 추가
      const geofence = {
        id: `destination_${index}`,
        dbId: geofenceId,
        lat: station.lat,
        lng: station.lng,
        radius: 100,
        type: 'destination',
        stationName: station.stationName,
        action: 'GET_OFF'
      };
      
      this.geofences.push(geofence);
      this.addDebugLog(`📍 지오펜스 추가: ${station.stationName} (DB ID: ${geofenceId}, 반경 ${geofence.radius}m)`);
    }

    this.addDebugLog(`✅ 총 ${this.geofences.length}개의 지오펜스 설정 완료`);
  }

  /**
   * 실시간 위치 추적 시작
   */
  startLocationTracking() {
    if (this.isTracking) {
      return;
    }

    this.isTracking = true;
    this.addDebugLog('🔄 위치 추적 시작');
    
    if (isDemoMode) {
      // 데모 모드: 5초마다 시뮬레이션된 위치 체크 (김포공항 출발 기준)
      this.watchId = setInterval(async () => {
        // 김포공항에서 목적지 방향으로 조금씩 이동하는 시뮬레이션
        const baseLocation = { lat: 37.558598, lng: 126.794374 }; // 김포공항
        const simulatedLocation = {
          lat: baseLocation.lat + (Math.random() - 0.5) * 0.001, // 더 작은 범위로 이동
          lng: baseLocation.lng + (Math.random() - 0.5) * 0.001
        };
        
        this.addDebugLog(`📍 시뮬레이션 위치 (김포공항 기준): (${simulatedLocation.lat.toFixed(6)}, ${simulatedLocation.lng.toFixed(6)})`);
        await this.checkGeofences(simulatedLocation);
      }, 5000);
    } else {
      // 실제 GPS 사용
      this.watchId = Geolocation.watchPosition(
        async position => {
          const currentLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          this.addDebugLog(`📍 실제 위치 업데이트: (${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)})`);
          await this.checkGeofences(currentLocation);
        },
        error => {
          this.addDebugLog(`❌ 위치 추적 오류: ${error.message}`);
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 10, // 10미터 이동시마다 업데이트
          interval: 5000      // 5초마다 체크
        }
      );
    }
  }

  /**
   * 지오펜스 체크
   * @param {object} currentLocation - 현재 위치 {lat, lng}
   */
  async checkGeofences(currentLocation) {
    if (this.geofences.length === 0) {
      this.addDebugLog('⚠️ 설정된 지오펜스가 없음');
      return;
    }

    for (const geofence of this.geofences) {
      const distance = this.calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        geofence.lat,
        geofence.lng
      );

      this.addDebugLog(`📏 ${geofence.stationName}까지 거리: ${distance.toFixed(1)}m`);

      // 이미 발생한 지오펜스인지 확인
      if (distance <= geofence.radius && !this.triggeredGeofences.has(geofence.id)) {
        this.addDebugLog(`🚨 지오펜스 진입: ${geofence.stationName}`);
        this.triggeredGeofences.add(geofence.id); // 발생한 지오펜스로 표시
        
        // 데이터베이스에 지오펜스 발생 기록
        if (geofence.dbId) {
          await DatabaseService.triggerGeofence(geofence.dbId);
          this.addDebugLog(`💾 지오펜스 발생 DB 기록 완료 (DB ID: ${geofence.dbId})`);
        }
        
        this.triggerAlarm(geofence);
      }
    }
  }

  /**
   * 두 지점 간의 거리 계산 (미터)
   * @param {number} lat1 - 위도1
   * @param {number} lon1 - 경도1
   * @param {number} lat2 - 위도2
   * @param {number} lon2 - 경도2
   * @returns {number} 거리(미터)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // 지구 반지름(미터)
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  toRadians(degrees) {
    return degrees * (Math.PI/180);
  }

  /**
   * 알람 발생
   * @param {object} geofence - 지오펜스 정보
   */
  triggerAlarm(geofence) {
    let message = '';
    
    switch (geofence.action) {
      case 'GET_OFF':
        message = `🚌 ${geofence.stationName}에 도착했습니다!\n하차하세요!`;
        break;
      case 'TRANSFER':
        message = `🔄 ${geofence.stationName}에서 환승하세요!`;
        break;
      default:
        message = `📍 ${geofence.stationName}에 도착했습니다.`;
    }

    // 알림 표시
    this.showNotification(message);
    
    // 알람 완료 후 추적 중지
    if (geofence.action === 'GET_OFF') {
      this.stopLocationAlarm();
    }

    console.log('알람 발생:', message);
  }

  /**
   * 알림 표시
   * @param {string} message - 알림 메시지
   */
  showNotification(message) {
    this.addDebugLog(`🔔 알림 표시: ${message}`);
    
    // 진동 패턴 시작 (1초 진동, 0.5초 멈춤, 1초 진동, 0.5초 멈춤, 1초 진동)
    // const vibrationPattern = [0, 1000, 500, 1000, 500, 1000];
    // Vibration.vibrate(vibrationPattern, false); // false: 반복하지 않음
    
    // React Native Alert 사용
    Alert.alert(
      '🚌 위치 알람', 
      message + '\n\n(15초 후 자동으로 닫힙니다)',
      [
        {
          text: '확인',
          onPress: () => {
            this.addDebugLog('✅ 사용자가 알림 확인');
            // Vibration.cancel(); // 진동 중지
            if (this.autoCloseTimer) {
              clearTimeout(this.autoCloseTimer);
              this.autoCloseTimer = null;
            }
          }
        }
      ],
      { 
        cancelable: true, // 뒤로가기 버튼으로 닫을 수 있게 설정
        onDismiss: () => {
          // 사용자가 뒤로가기나 다른 방법으로 알림을 닫았을 때
          this.addDebugLog('✅ 사용자가 알림을 닫음');
          // Vibration.cancel(); // 진동 중지
          if (this.autoCloseTimer) {
            clearTimeout(this.autoCloseTimer);
            this.autoCloseTimer = null;
          }
        }
      }
    );

    // 15초 후 자동으로 알림 효과 종료 (Alert는 수동으로 닫아야 함)
    this.autoCloseTimer = setTimeout(() => {
      this.addDebugLog('⏰ 알림 자동 종료 (15초 경과)');
      // Vibration.cancel(); // 진동 중지
      this.autoCloseTimer = null;
      
      // 추가 알림이나 진동 등을 여기서 중지할 수 있음
      // 사용자에게 알림이 자동 종료되었음을 로그로 표시
    }, 15000);
  }

  /**
   * 위치 알람 중지
   */
  async stopLocationAlarm() {
    // 위치 추적 중지
    if (this.watchId) {
      if (isDemoMode) {
        clearInterval(this.watchId);
      } else {
        Geolocation.clearWatch(this.watchId);
      }
      this.watchId = null;
    }
    
    // 알림 자동 종료 타이머 정리
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = null;
      this.addDebugLog('🧹 알림 자동 종료 타이머 정리');
    }
    
    // 진동 중지
    // Vibration.cancel();
    // this.addDebugLog('📳 진동 중지');
    
    // 데이터베이스에 여행 완료 상태 업데이트
    if (this.currentTripId) {
      try {
        await DatabaseService.updateTripStatus(this.currentTripId, 'completed');
        this.addDebugLog(`💾 여행 완료 상태 DB 업데이트 (ID: ${this.currentTripId})`);
      } catch (error) {
        this.addDebugLog(`❌ 여행 상태 업데이트 실패: ${error.message}`);
      }
    }
    
    // 메모리 상태 초기화
    this.isTracking = false;
    this.currentTrip = null;
    this.currentTripId = null;
    this.geofences = [];
    this.triggeredGeofences.clear(); // 발생한 지오펜스 목록도 초기화
    
    this.addDebugLog('🛑 위치 알람 중지 및 DB 업데이트 완료');
  }

  /**
   * 현재 상태 확인
   * @returns {object} 현재 상태 정보
   */
  getStatus() {
    return {
      isTracking: this.isTracking,
      currentTrip: this.currentTrip,
      geofences: this.geofences,
      geofencesCount: this.geofences.length,
      debugLogs: this.debugLogs
    };
  }
}

export default new LocationAlarmService();
