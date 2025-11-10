package com.alarm_project.alarm

import android.content.Context
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * React Native에서 위치 기반 서비스를 제어하는 모듈
 */
class LocationBasedServiceModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
    
    private val locationProvider by lazy { LocationProvider(reactContext) }
    private val locationHistoryManager by lazy { LocationHistoryManager(reactContext) }
    private val locationBasedAlarmManager by lazy { LocationBasedAlarmManager(reactContext) }
    private val geofenceAlarmManager by lazy { GeofenceAlarmManager(reactContext) }
    private val batteryOptimizationManager by lazy { BatteryOptimizationManager(reactContext) }
    
    override fun getName(): String = "LocationBasedService"
    
    @ReactMethod
    fun ping(promise: Promise) {
        promise.resolve("ok")
    }

    /**
     * 현재 위치 가져오기
     */
    @ReactMethod
    fun getCurrentLocation(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val location = locationProvider.getFreshLocation()
                if (location != null) {
                    val result = WritableNativeMap().apply {
                        putDouble("latitude", location.latitude)
                        putDouble("longitude", location.longitude)
                        putDouble("accuracy", location.accuracyMeters.toDouble())
                        putDouble("age", location.ageMillis.toDouble())
                        putString("provider", location.provider)
                    }
                    promise.resolve(result)
                } else {
                    promise.reject("LOCATION_UNAVAILABLE", "현재 위치를 가져올 수 없습니다")
                }
            } catch (e: Exception) {
                promise.reject("LOCATION_ERROR", e.message)
            }
        }
    }
    
    /**
     * 위치 기반 알람 설정
     */
    @ReactMethod
    fun setLocationBasedAlarm(
        alarmId: String,
        latitude: Double,
        longitude: Double,
        radius: Double,
        conditionType: String,
        promise: Promise
    ) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val locationSnapshot = LocationSnapshot(
                    latitude = latitude,
                    longitude = longitude,
                    accuracyMeters = 10f, // 기본 정확도
                    ageMillis = System.currentTimeMillis(),
                    provider = "manual"
                )
                
                val condition = when (conditionType) {
                    "in_location" -> LocationConditionType.IN_LOCATION
                    "out_of_location" -> LocationConditionType.OUT_OF_LOCATION
                    else -> LocationConditionType.ANYWHERE
                }
                
                val success = locationBasedAlarmManager.setLocationCondition(
                    alarmId = alarmId,
                    requiredLocation = locationSnapshot,
                    radius = radius.toFloat(),
                    conditionType = condition
                )
                
                if (success) {
                    promise.resolve(true)
                } else {
                    promise.reject("SET_ALARM_FAILED", "위치 기반 알람 설정에 실패했습니다")
                }
            } catch (e: Exception) {
                promise.reject("SET_ALARM_ERROR", e.message)
            }
        }
    }
    
    /**
     * 지오펜싱 알람 추가
     */
    @ReactMethod
    fun addGeofenceAlarm(
        alarmId: String,
        latitude: Double,
        longitude: Double,
        radius: Double,
        transitionType: String,
        promise: Promise
    ) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val transition = when (transitionType) {
                    "enter" -> com.google.android.gms.location.Geofence.GEOFENCE_TRANSITION_ENTER
                    "exit" -> com.google.android.gms.location.Geofence.GEOFENCE_TRANSITION_EXIT
                    else -> com.google.android.gms.location.Geofence.GEOFENCE_TRANSITION_ENTER
                }
                
                val success = geofenceAlarmManager.addGeofenceAlarm(
                    latitude = latitude,
                    longitude = longitude,
                    radius = radius.toFloat(),
                    alarmId = alarmId,
                    transitionType = transition
                )
                
                if (success) {
                    promise.resolve(true)
                } else {
                    promise.reject("ADD_GEOFENCE_FAILED", "지오펜싱 알람 추가에 실패했습니다")
                }
            } catch (e: Exception) {
                promise.reject("ADD_GEOFENCE_ERROR", e.message)
            }
        }
    }
    
    /**
     * 지오펜싱 알람 제거
     */
    @ReactMethod
    fun removeGeofenceAlarm(alarmId: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val success = geofenceAlarmManager.removeGeofenceAlarm(alarmId)
                if (success) {
                    promise.resolve(true)
                } else {
                    promise.reject("REMOVE_GEOFENCE_FAILED", "지오펜싱 알람 제거에 실패했습니다")
                }
            } catch (e: Exception) {
                promise.reject("REMOVE_GEOFENCE_ERROR", e.message)
            }
        }
    }
    
    /**
     * 위치 히스토리 조회
     */
    @ReactMethod
    fun getLocationHistory(days: Int, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val endTime = System.currentTimeMillis()
                val startTime = endTime - (days * 24 * 60 * 60 * 1000L)
                
                val history = locationHistoryManager.getLocationHistory(startTime, endTime)
                val result = WritableNativeArray()
                
                for (location in history) {
                    val locationMap = WritableNativeMap().apply {
                        putDouble("latitude", location.latitude)
                        putDouble("longitude", location.longitude)
                        putDouble("accuracy", location.accuracyMeters.toDouble())
                        putDouble("timestamp", location.ageMillis.toDouble())
                        putString("provider", location.provider)
                    }
                    result.pushMap(locationMap)
                }
                
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("GET_HISTORY_ERROR", e.message)
            }
        }
    }
    
    /**
     * 위치 패턴 분석
     */
    @ReactMethod
    fun analyzeLocationPattern(days: Int, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val analysis = locationHistoryManager.analyzeLocationPattern(days)
                val result = WritableNativeMap().apply {
                    putInt("totalLocations", analysis.totalLocations)
                    putDouble("averageAccuracy", analysis.averageAccuracy.toDouble())
                    putDouble("movementDistance", analysis.movementDistance.toDouble())
                    putInt("analysisPeriod", analysis.analysisPeriod)
                    
                    if (analysis.mostFrequentArea != null) {
                        val areaMap = WritableNativeMap().apply {
                            putDouble("latitude", analysis.mostFrequentArea.latitude)
                            putDouble("longitude", analysis.mostFrequentArea.longitude)
                            putDouble("radius", analysis.mostFrequentArea.radius)
                            putInt("visitCount", analysis.mostFrequentArea.visitCount)
                            putDouble("lastVisited", analysis.mostFrequentArea.lastVisited.toDouble())
                        }
                        putMap("mostFrequentArea", areaMap)
                    } else {
                        putNull("mostFrequentArea")
                    }
                }
                
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("ANALYZE_PATTERN_ERROR", e.message)
            }
        }
    }
    
    /**
     * 배터리 최적화 상태 확인
     */
    @ReactMethod
    fun getBatteryOptimizationStatus(promise: Promise) {
        try {
            val batteryStatus = batteryOptimizationManager.getBatteryStatus()
            val result = WritableNativeMap().apply {
                putDouble("batteryLevel", batteryStatus.level)
                putBoolean("isPowerSaveMode", batteryStatus.isPowerSaveMode)
                putBoolean("isBatteryOptimized", batteryStatus.isBatteryOptimized)
                putBoolean("isBackgroundRestricted", batteryStatus.isBackgroundRestricted)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("BATTERY_STATUS_ERROR", e.message)
        }
    }
    
    /**
     * 배터리 최적화 해제 요청
     */
    @ReactMethod
    fun requestBatteryOptimizationExemption(promise: Promise) {
        try {
            batteryOptimizationManager.requestBatteryOptimizationExemption()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("BATTERY_OPTIMIZATION_ERROR", e.message)
        }
    }
    
    /**
     * 배터리 최적화 권장사항 가져오기
     */
    @ReactMethod
    fun getBatteryOptimizationTips(promise: Promise) {
        try {
            val tips = batteryOptimizationManager.getLocationServiceOptimizationTips()
            val result = WritableNativeArray()
            
            for (tip in tips) {
                result.pushString(tip)
            }
            
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("BATTERY_TIPS_ERROR", e.message)
        }
    }
    
    /**
     * 백그라운드 위치 추적 서비스 시작
     */
    @ReactMethod
    fun startBackgroundLocationTracking(promise: Promise) {
        try {
            BackgroundLocationService.startService(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("START_TRACKING_ERROR", e.message)
        }
    }
    
    /**
     * 백그라운드 위치 추적 서비스 중지
     */
    @ReactMethod
    fun stopBackgroundLocationTracking(promise: Promise) {
        try {
            BackgroundLocationService.stopService(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_TRACKING_ERROR", e.message)
        }
    }
}
