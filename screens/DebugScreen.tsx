import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import LocationAlarmService from '../services/location/LocationAlarmService';
import DemoBusApiService from '../services/bus/DemoBusApiService';
import DatabaseService from '../services/location/DatabaseService';

const DebugScreen = () => {
  const [debugInfo, setDebugInfo] = useState({
    isTracking: false,
    currentLocation: null,
    currentTrip: null,
    geofences: [],
    logs: [],
    databaseStats: {}
  });

  const [_refreshInterval, setRefreshInterval] = useState(null);

  useEffect(() => {
    // 1초마다 상태 업데이트
    const interval = setInterval(() => {
      updateDebugInfo();
    }, 1000);

    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const updateDebugInfo = async () => {
    try {
      // LocationAlarmService 상태 가져오기
      const status = LocationAlarmService.getStatus();
      
      // 현재 위치 가져오기
      let currentLocation = null;
      try {
        currentLocation = await LocationAlarmService.getCurrentLocation();
      } catch (error) {
        currentLocation = { error: error.message };
      }

      // 데이터베이스 상태 가져오기
      let databaseStats = {};
      try {
        databaseStats = await DatabaseService.getDatabaseStats();
      } catch (error) {
        databaseStats = { error: error.message };
      }

      setDebugInfo(_prev => ({
        ...status,
        currentLocation,
        databaseStats,
        logs: status.debugLogs || [] // LocationAlarmService의 실제 로그 사용
      }));
    } catch (error) {
      console.error('Debug info update failed:', error);
    }
  };

  const simulateLocationChange = () => {
    // 현재 설정된 목적지 근처로 시뮬레이션된 위치 변경
    const status = LocationAlarmService.getStatus();
    
    if (!status.isTracking) {
      LocationAlarmService.addDebugLog(`❌ 위치 추적이 비활성화됨`);
      return;
    }
    
    if (!status.currentTrip || !status.geofences || status.geofences.length === 0) {
      LocationAlarmService.addDebugLog(`❌ 설정된 목적지나 지오펜스가 없음`);
      return;
    }
    
    // 첫 번째 지오펜스(목적지) 근처로 이동
    const targetGeofence = status.geofences[0];
    const destinationLocation = {
      lat: targetGeofence.lat + (Math.random() - 0.5) * 0.0002, // 목적지 아주 근처
      lng: targetGeofence.lng + (Math.random() - 0.5) * 0.0002
    };

    LocationAlarmService.checkGeofences(destinationLocation);
    LocationAlarmService.addDebugLog(`🔄 수동 위치 변경: ${targetGeofence.stationName} 근처로 이동`);
  };

  const testBusApi = async () => {
    try {
      LocationAlarmService.addDebugLog('🚌 버스 API 테스트 시작...');

      // 1. 주변 정류장 조회 테스트
      const stations = await DemoBusApiService.getNearbyStations(37.497952, 127.027618);
      LocationAlarmService.addDebugLog(`📍 주변 정류장: ${stations.length}개 발견`);
      
      stations.forEach((station, index) => {
        LocationAlarmService.addDebugLog(`  ${index + 1}. ${station.stationName} (${station.distance}m)`);
      });

      // 2. 버스 도착 정보 조회 테스트
      const busInfo = await DemoBusApiService.getBusArrivalInfo('GPO31001');
      LocationAlarmService.addDebugLog(`🚌 도착 예정 버스: ${busInfo.length}개`);
      
      busInfo.forEach((bus, index) => {
        LocationAlarmService.addDebugLog(`  ${index + 1}. ${bus.routeNo}번 - ${bus.arrivalTime} (${bus.vehicleNo})`);
      });

      // 3. 경로 조회 테스트
      const route = await DemoBusApiService.getBusRoute(
        { lat: 37.497952, lng: 127.027618 }, // 강남역
        { lat: 37.504692, lng: 127.025465 }  // 신논현역
      );
      
      if (route) {
        LocationAlarmService.addDebugLog(`🗺️ 경로 조회 성공: 예상 소요시간 ${route.estimatedTime}분`);
        LocationAlarmService.addDebugLog(`📍 출발: ${route.startStation.stationName}`);
        LocationAlarmService.addDebugLog(`📍 도착: ${route.endStations.length}개 정류장`);
      }

      LocationAlarmService.addDebugLog('✅ 버스 API 테스트 완료');

    } catch (error) {
      LocationAlarmService.addDebugLog(`❌ API 테스트 실패: ${error.message}`);
    }
  };

  const getCurrentLocationManually = async () => {
    try {
      LocationAlarmService.addDebugLog('🔄 수동으로 위치 새로고침 시작...');
      const location = await LocationAlarmService.getCurrentLocation();
      LocationAlarmService.addDebugLog(`📍 현재 위치 업데이트 완료: (${location.lat.toFixed(6)}, ${location.lng.toFixed(6)})`);
    } catch (error) {
      LocationAlarmService.addDebugLog(`❌ 위치 새로고침 실패: ${error.message}`);
    }
  };

  const testAlarmNotification = () => {
    // 강제로 알람 발생시키기
    LocationAlarmService.addDebugLog('🧪 알람 테스트 시작...');
    LocationAlarmService.showNotification('🚌 테스트 알람입니다!\n이것은 강제로 발생시킨 알람입니다.');
  };

  const clearLogs = () => {
    // LocationAlarmService의 로그 클리어
    LocationAlarmService.debugLogs = [];
    LocationAlarmService.addDebugLog('🧹 로그가 지워졌습니다');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔧 위치 기반 알람 디버그</Text>
      
      {/* 현재 상태 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 현재 상태</Text>
        <Text style={styles.statusText}>
          추적 상태: {debugInfo.isTracking ? '✅ 진행중' : '❌ 중지'}
        </Text>
        <Text style={styles.statusText}>
          지오펜스 수: {debugInfo.geofences?.length || 0}개
        </Text>
        <View style={styles.locationInfo}>
          <Text style={styles.statusText}>
            📍 현재 위치: {debugInfo.currentLocation ? 
              `${debugInfo.currentLocation.lat?.toFixed(6)}, ${debugInfo.currentLocation.lng?.toFixed(6)}` : 
              '위치 정보 없음'
            }
          </Text>
          {debugInfo.currentLocation && (
            <>
              <Text style={styles.smallText}>
                위도: {debugInfo.currentLocation.lat?.toFixed(6)}
              </Text>
              <Text style={styles.smallText}>
                경도: {debugInfo.currentLocation.lng?.toFixed(6)}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  const url = `https://maps.google.com/maps?q=${debugInfo.currentLocation.lat},${debugInfo.currentLocation.lng}`;
                  Linking.openURL(url);
                }}
                style={styles.mapLinkButton}
              >
                <Text style={styles.mapLinkText}>
                  🗺️ Google Maps에서 보기
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* 현재 여행 정보 */}
      {debugInfo.currentTrip && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚌 현재 여행</Text>
          <Text style={styles.statusText}>
            목적지: {debugInfo.currentTrip.destination?.name || '설정되지 않음'}
          </Text>
          <Text style={styles.statusText}>
            시작 시간: {debugInfo.currentTrip.startTime ? 
              new Date(debugInfo.currentTrip.startTime).toLocaleTimeString() : 
              '없음'
            }
          </Text>
          <Text style={styles.statusText}>
            활성 상태: {debugInfo.currentTrip.isActive ? '✅' : '❌'}
          </Text>
        </View>
      )}

      {/* 지오펜스 정보 */}
      {debugInfo.geofences && debugInfo.geofences.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 지오펜스</Text>
          {debugInfo.geofences.map((geofence, index) => (
            <View key={index} style={styles.geofenceItem}>
              <Text style={styles.statusText}>
                {index + 1}. {geofence.stationName} ({geofence.action})
              </Text>
              <Text style={styles.smallText}>
                반경: {geofence.radius}m | 위치: {geofence.lat?.toFixed(4)}, {geofence.lng?.toFixed(4)}
              </Text>
              {geofence.dbId && (
                <Text style={styles.smallText}>
                  DB ID: {geofence.dbId}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* 데이터베이스 상태 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💾 데이터베이스 상태</Text>
        {debugInfo.databaseStats.error ? (
          <Text style={styles.errorText}>❌ {debugInfo.databaseStats.error}</Text>
        ) : (
          <>
            <Text style={styles.statusText}>
              📊 총 여행 수: {debugInfo.databaseStats.trips || 0}개
            </Text>
            <Text style={styles.statusText}>
              🎯 활성 여행: {debugInfo.databaseStats.active_trips || 0}개
            </Text>
            <Text style={styles.statusText}>
              📍 지오펜스: {debugInfo.databaseStats.geofences || 0}개
            </Text>
            <Text style={styles.statusText}>
              🚏 정류장 캐시: {debugInfo.databaseStats.stations || 0}개
            </Text>
          </>
        )}
      </View>

      {/* 테스트 버튼들 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧪 테스트</Text>
        <TouchableOpacity style={styles.button} onPress={getCurrentLocationManually}>
          <Text style={styles.buttonText}>현재 위치 새로고침</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={simulateLocationChange}>
          <Text style={styles.buttonText}>목적지 근처로 이동 (테스트)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.alarmButton]} onPress={testAlarmNotification}>
          <Text style={styles.buttonText}>알람 테스트 (강제 발생)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={testBusApi}>
          <Text style={styles.buttonText}>버스 API 테스트</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={clearLogs}>
          <Text style={styles.buttonText}>로그 지우기</Text>
        </TouchableOpacity>
      </View>

      {/* 실시간 로그 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 실시간 로그</Text>
        <ScrollView style={styles.logContainer} nestedScrollEnabled={true}>
          {debugInfo.logs.map((log, index) => (
            <View key={index} style={styles.logItem}>
              <Text style={styles.logTime}>{log.timestamp}</Text>
              <Text style={styles.logMessage}>{log.message}</Text>
            </View>
          ))}
          {debugInfo.logs.length === 0 && (
            <Text style={styles.noLogs}>로그가 없습니다.</Text>
          )}
        </ScrollView>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#2196f3',
  },
  statusText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
  },
  smallText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
  },
  locationInfo: {
    backgroundColor: '#f0f8ff',
    padding: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  mapLinkButton: {
    backgroundColor: '#4285f4',
    padding: 8,
    borderRadius: 5,
    marginTop: 8,
    alignItems: 'center',
  },
  mapLinkText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  geofenceItem: {
    marginBottom: 8,
    paddingVertical: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#4caf50',
    paddingLeft: 10,
  },
  button: {
    backgroundColor: '#2196f3',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#f44336',
  },
  alarmButton: {
    backgroundColor: '#ff9800',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  logContainer: {
    maxHeight: 200,
    backgroundColor: '#f8f8f8',
    borderRadius: 5,
    padding: 10,
  },
  logItem: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  logTime: {
    fontSize: 12,
    color: '#666',
    marginRight: 10,
    minWidth: 70,
  },
  logMessage: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  noLogs: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#f44336',
    marginBottom: 5,
  },
});

export default DebugScreen;
