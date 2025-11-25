import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { PermissionsAndroid } from "react-native";
import Geolocation from "@react-native-community/geolocation";
import { WebView } from "react-native-webview";

const { height } = Dimensions.get("window");

export type PickedLocation = {
  latitude: number;
  longitude: number;
  radius: number;
  address: string;
  placeName: string;
};

type Props = {
  visible: boolean;
  onLocationSelect: (location: PickedLocation) => void;
  onCancel: () => void;
};

const DEFAULT_RADIUS = 100;
const RADIUS_OPTIONS = [25, 50, 75, 100, 125, 150];

const LocationPicker: React.FC<Props> = ({ visible, onLocationSelect, onCancel }) => {
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [radius, setRadius] = useState(DEFAULT_RADIUS);

  const webViewRef = useRef<WebView | null>(null);

  const center = useMemo(() => selectedLocation || currentLocation || { latitude: 37.5665, longitude: 126.978 }, [
    selectedLocation,
    currentLocation,
  ]);

  const generateKakaoHTML = useCallback(
    (lat: number, lng: number) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
          <style>
            html, body, #map { height: 100%; margin: 0; padding: 0; }
            body { background: #fff; }
            #map { opacity: 0; transition: opacity 0.25s; }
            #map.loaded { opacity: 1; }
          </style>
          <script>
            window.addEventListener('error', function(e){
              try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'webError', message: e.message })); } catch(_) {}
            });
          </script>
          <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=1fd3183a3982b0dd31713e89dc414355"></script>
        </head>
        <body>
          <div id="map"></div>
          <script>
            function init() {
              if (!(window.kakao && window.kakao.maps)) {
                setTimeout(init, 100);
                return;
              }
              var container = document.getElementById('map');
              var center = new kakao.maps.LatLng(${lat}, ${lng});
              window.map = new kakao.maps.Map(container, { center: center, level: 3 });
              window.marker = new kakao.maps.Marker({ position: center });
              window.marker.setMap(window.map);
              window.circle = new kakao.maps.Circle({
                center: center,
                radius: ${radius},
                strokeWeight: 2,
                strokeColor: '#75B8FA',
                strokeOpacity: 0.8,
                fillColor: '#75B8FA',
                fillOpacity: 0.2
              });
              window.circle.setMap(window.map);
              container.classList.add('loaded');

              window.updateCenter = function(lat, lng){
                var next = new kakao.maps.LatLng(lat, lng);
                window.map.setCenter(next);
                window.marker.setPosition(next);
                window.circle.setPosition(next);
              };
              window.updateRadius = function(r){
                window.circle.setRadius(r);
              };

              kakao.maps.event.addListener(window.map, 'click', function(mouseEvent) {
                var latlng = mouseEvent.latLng;
                window.marker.setPosition(latlng);
                window.circle.setPosition(latlng);
                try {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'locationSelected',
                    latitude: latlng.getLat(),
                    longitude: latlng.getLng()
                  }));
                } catch(_) {}
              });
            }
            init();
          </script>
        </body>
      </html>
    `,
    [radius],
  );

  const mapHtmlRef = useRef<string>(generateKakaoHTML(37.5665, 126.978));

  const injectCenterUpdate = useCallback(
    (webview: WebView | null, lat: number, lng: number) => {
      if (!webview) return;
      const js = `try { window.updateCenter && window.updateCenter(${lat}, ${lng}); } catch(e) {}`;
      webview.injectJavaScript(js + "\ntrue;");
    },
    [],
  );

  const injectRadiusUpdate = useCallback((webview: WebView | null, value: number) => {
    if (!webview) return;
    const js = `try { window.updateRadius && window.updateRadius(${value}); } catch(e) {}`;
    webview.injectJavaScript(js + "\ntrue;");
  }, []);

  const getCurrentLocation = useCallback(async () => {
    try {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
          title: "위치 권한 필요",
          message: "현재 위치를 이용하려면 위치 권한이 필요합니다.",
          buttonPositive: "허용",
          buttonNegative: "거부",
        });
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert("권한 필요", "위치 권한이 거부되어 현재 위치를 사용할 수 없습니다.");
          return;
        }
      }

      Geolocation.getCurrentPosition(
        position => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setCurrentLocation(coords);
          setSelectedLocation(coords);
          setAddress(`위도 ${coords.latitude.toFixed(6)}, 경도 ${coords.longitude.toFixed(6)}`);
          injectCenterUpdate(webViewRef.current, coords.latitude, coords.longitude);
        },
        error => {
          console.error("[LocationPicker] getCurrentPosition error:", error);
          Alert.alert("위치 실패", "현재 위치를 가져오지 못했습니다.");
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        },
      );
    } catch (error) {
      console.error("[LocationPicker] permission error:", error);
      Alert.alert("권한 오류", "위치 권한을 확인해주세요.");
    }
  }, [injectCenterUpdate]);

  useEffect(() => {
    if (visible) {
      getCurrentLocation();
    }
  }, [visible, getCurrentLocation]);

  useEffect(() => {
    if (!visible) return;
    const target = selectedLocation || currentLocation;
    if (target) {
      injectCenterUpdate(webViewRef.current, target.latitude, target.longitude);
    }
  }, [visible, selectedLocation, currentLocation, injectCenterUpdate]);

  useEffect(() => {
    if (!visible) return;
    injectRadiusUpdate(webViewRef.current, radius);
  }, [visible, radius, injectRadiusUpdate]);

  const handleMapMessage = useCallback(
    event => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === "locationSelected") {
          const location = { latitude: data.latitude, longitude: data.longitude };
          setSelectedLocation(location);
          setAddress(`위도 ${data.latitude.toFixed(6)}, 경도 ${data.longitude.toFixed(6)}`);
        }
      } catch (error) {
        console.error("[LocationPicker] message parse error:", error);
      }
    },
    [],
  );

  const handleConfirm = () => {
    if (!selectedLocation) {
      Alert.alert("위치 필요", "지도에서 위치를 선택하거나 현재 위치를 사용하세요.");
      return;
    }
    if (!placeName.trim()) {
      Alert.alert("장소 이름", "장소 이름을 입력해주세요.");
      return;
    }

    onLocationSelect({
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      radius,
      address: address || `${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}`,
      placeName: placeName.trim(),
    });
  };

  return (
    <>
      <Modal visible={visible} animationType="slide">
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>위치 설정</Text>
          </View>

          <View style={styles.body}>
            <View style={styles.mapPreview}>
              <WebView
                ref={webViewRef}
                source={{ html: mapHtmlRef.current, baseUrl: "" }}
                style={styles.map}
                onMessage={handleMapMessage}
                javaScriptEnabled
                domStorageEnabled
                scrollEnabled={false}
              />
              <View style={styles.mapOverlay} pointerEvents="box-none">
                <Pressable style={styles.floatingLocationBtn} onPress={getCurrentLocation}>
                  <Text style={styles.floatingLocationIcon}>📍</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>장소 이름</Text>
              <TextInput style={styles.input} value={placeName} onChangeText={setPlaceName} placeholder="예: 집, 회사" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>지오펜싱 반경 ({radius}m)</Text>
              <View style={styles.radiusRow}>
                {RADIUS_OPTIONS.map(option => {
                  const active = option === radius;
                  return (
                    <Pressable
                      key={option}
                      style={[styles.radiusChip, active && styles.radiusChipActive]}
                      onPress={() => {
                        setRadius(option);
                        injectRadiusUpdate(webViewRef.current, option);
                      }}
                    >
                      <Text style={[styles.radiusChipLabel, active && styles.radiusChipLabelActive]}>
                        {option}m
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

          </View>

          <View style={styles.footer}>
            <Pressable style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>취소</Text>
            </Pressable>
            <Pressable style={styles.submitBtn} onPress={handleConfirm}>
              <Text style={styles.submitBtnText}>설정</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  title: { fontSize: 18, fontWeight: "600", color: "#111827" },
  body: { flex: 1, padding: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "#f9fafb",
  },
  mapPreview: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    height: height * 0.55,
    overflow: "hidden",
    marginBottom: 16,
    position: "relative",
  },
  map: { flex: 1 },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "flex-end",
    padding: 16,
  },
  floatingLocationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },
  floatingLocationIcon: { fontSize: 20 },
  radiusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  radiusChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
  },
  radiusChipActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  radiusChipLabel: {
    fontSize: 13,
    color: "#4b5563",
    fontWeight: "500",
  },
  radiusChipLabelActive: {
    color: "#fff",
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e5e7eb",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
  },
  cancelBtnText: { textAlign: "center", fontSize: 16, fontWeight: "500", color: "#4b5563" },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#16a34a",
  },
  submitBtnText: { textAlign: "center", fontSize: 16, fontWeight: "600", color: "#fff" },
});

export default LocationPicker;
