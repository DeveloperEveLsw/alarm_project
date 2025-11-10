import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { check, openSettings, PERMISSIONS, request, RESULTS } from 'react-native-permissions';
import { LocationBasedSettings } from '../types/alarm.types';
import locationBasedService from '../services/locationBasedService';

interface MapLocationPickerProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (location: LocationBasedSettings) => void;
  initialLocation?: LocationBasedSettings;
}


const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  visible,
  onClose,
  onLocationSelect,
  initialLocation,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [region, setRegion] = useState<Region>({
    latitude: initialLocation?.latitude || 37.5665, // 서울시청 기본 위치
    longitude: initialLocation?.longitude || 126.9780,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number }>({
    latitude: initialLocation?.latitude || 37.5665,
    longitude: initialLocation?.longitude || 126.9780,
  });
  const [hasPermission, setHasPermission] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  useEffect(() => {
    if (!visible) return;
    requestLocationPermission().catch(error => {
      console.warn('[MapLocationPicker] permission request failed', error);
    });
  }, [visible]);

  useEffect(() => {
    if (initialLocation?.latitude && initialLocation?.longitude) {
      setSelectedLocation({
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
      });
      setMapCenter({
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
      });
      setRegion({
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, [initialLocation]);

  const requestLocationPermission = async () => {
    const permission =
      Platform.OS === 'ios'
        ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
        : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

    if (!permission) {
      setHasPermission(false);
      return;
    }

    const currentStatus = await check(permission);
    if (currentStatus === RESULTS.GRANTED || currentStatus === RESULTS.LIMITED) {
      setHasPermission(true);
      focusCurrentLocation(true);
      return;
    }

    if (currentStatus === RESULTS.BLOCKED) {
      Alert.alert(
        '위치 권한 필요',
        '지도를 사용하려면 위치 권한을 허용해주세요. 설정 화면으로 이동할까요?',
        [
          { text: '취소', style: 'cancel' },
          { text: '설정으로 이동', onPress: () => openSettings() },
        ],
      );
      setHasPermission(false);
      return;
    }

    const requested = await request(permission);
    const granted = requested === RESULTS.GRANTED || requested === RESULTS.LIMITED;
    setHasPermission(granted);
    if (granted) {
      focusCurrentLocation(true);
    }
  };

  const focusCurrentLocation = async (forcePermission = false) => {
    if (isFetchingLocation || (!hasPermission && !forcePermission)) {
      return;
    }

    setIsFetchingLocation(true);
    try {
      const snapshot = await locationBasedService.getCurrentLocation();
      setRegion(prev => ({
        ...prev,
        latitude: snapshot.latitude,
        longitude: snapshot.longitude,
      }));
      setSelectedLocation({
        latitude: snapshot.latitude,
        longitude: snapshot.longitude,
      });
      setMapCenter({
        latitude: snapshot.latitude,
        longitude: snapshot.longitude,
      });
    } catch (error) {
      console.warn('[MapLocationPicker] failed to fetch current location', error);
      Alert.alert('현재 위치 찾기', '현재 위치를 불러오지 못했습니다. 위치 권한과 GPS 설정을 확인해주세요.');
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
  };

  const handleConfirm = () => {
    const target = selectedLocation ?? mapCenter;
    if (!target) {
      Alert.alert('위치 선택', '지도에서 위치를 선택해주세요.');
      return;
    }

    const locationData: LocationBasedSettings = {
      enabled: true,
      type: 'geofence',
      latitude: target.latitude,
      longitude: target.longitude,
      radius: 100, // 기본 반경 100m
      conditionType: 'in_location',
    };

    onLocationSelect(locationData);
    onClose();
  };

  const handleCancel = () => {
    setSelectedLocation(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>위치 선택</Text>
          <View style={styles.buttonContainer}>
            <Pressable style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>취소</Text>
            </Pressable>
            <Pressable style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmButtonText}>확인</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={region}
            onRegionChangeComplete={nextRegion => {
              setRegion(nextRegion);
              setMapCenter({ latitude: nextRegion.latitude, longitude: nextRegion.longitude });
            }}
            onPress={handleMapPress}
            provider={PROVIDER_GOOGLE}
            showsUserLocation={hasPermission}
            showsMyLocationButton={hasPermission}
            mapType="standard"
          >
            {selectedLocation && (
              <Marker
                coordinate={selectedLocation}
                title="선택된 위치"
                description="알람이 울릴 위치입니다"
                pinColor="red"
              />
            )}
          </MapView>
          <View pointerEvents="none" style={styles.crosshairContainer}>
            <View style={styles.crosshair}>
              <View style={styles.crosshairHorizontal} />
              <View style={styles.crosshairVertical} />
            </View>
          </View>
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            지도를 탭하거나, 지도를 이동해 가운데 십자 위치를 맞춘 뒤 확인을 누르세요
          </Text>
          <Text style={styles.coordinateText}>
            중심 좌표: {mapCenter.latitude.toFixed(5)}, {mapCenter.longitude.toFixed(5)}
          </Text>
          <Pressable
            style={[styles.currentLocationButton, !hasPermission && styles.disabledButton]}
            onPress={() => focusCurrentLocation()}
            disabled={!hasPermission || isFetchingLocation}
          >
            <Text style={styles.currentLocationText}>
              {isFetchingLocation ? '현재 위치 확인 중...' : '현재 위치로 이동'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  confirmButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  mapContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  map: {
    flex: 1,
  },
  instructions: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  instructionText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  coordinateText: {
    marginTop: 6,
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  currentLocationButton: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  currentLocationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  crosshairContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crosshair: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crosshairHorizontal: {
    position: 'absolute',
    width: 40,
    height: 2,
    backgroundColor: '#2563eb',
  },
  crosshairVertical: {
    position: 'absolute',
    width: 2,
    height: 40,
    backgroundColor: '#2563eb',
  },
});

export default MapLocationPicker;
