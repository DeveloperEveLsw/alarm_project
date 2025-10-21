package com.alarm_project.alarm

import android.Manifest
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingClient
import com.google.android.gms.location.GeofencingRequest
import com.google.android.gms.location.LocationServices
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * 지오펜싱 기반 알람 관리자
 * 특정 위치에 도착했을 때 알람을 울리는 기능
 */
class GeofenceAlarmManager(private val context: Context) {
    
    private val geofencingClient: GeofencingClient = LocationServices.getGeofencingClient(context)
    
    /**
     * 지오펜싱 알람 추가
     * @param latitude 위도
     * @param longitude 경도
     * @param radius 반경 (미터)
     * @param alarmId 알람 ID
     * @param transitionType 진입/이탈 타입 (Geofence.GEOFENCE_TRANSITION_ENTER, EXIT)
     */
    suspend fun addGeofenceAlarm(
        latitude: Double,
        longitude: Double,
        radius: Float,
        alarmId: String,
        transitionType: Int = Geofence.GEOFENCE_TRANSITION_ENTER
    ): Boolean = withContext(Dispatchers.IO) {
        
        if (!hasLocationPermission()) {
            return@withContext false
        }
        
        try {
            val geofence = Geofence.Builder()
                .setRequestId(alarmId)
                .setCircularRegion(latitude, longitude, radius)
                .setExpirationDuration(Geofence.NEVER_EXPIRE)
                .setTransitionTypes(transitionType)
                .setLoiteringDelay(5000) // 5초 대기 후 트리거
                .build()
            
            val geofencingRequest = GeofencingRequest.Builder()
                .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
                .addGeofence(geofence)
                .build()
            
            val pendingIntent = createGeofencePendingIntent(alarmId)
            
            geofencingClient.addGeofences(geofencingRequest, pendingIntent)
                .addOnSuccessListener {
                    // 성공 로그
                    android.util.Log.d("GeofenceAlarm", "Geofence added successfully for alarm: $alarmId")
                }
                .addOnFailureListener { exception ->
                    android.util.Log.e("GeofenceAlarm", "Failed to add geofence for alarm: $alarmId", exception)
                }
            
            true
        } catch (e: Exception) {
            android.util.Log.e("GeofenceAlarm", "Error adding geofence for alarm: $alarmId", e)
            false
        }
    }
    
    /**
     * 지오펜싱 알람 제거
     * @param alarmId 알람 ID
     */
    suspend fun removeGeofenceAlarm(alarmId: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val pendingIntent = createGeofencePendingIntent(alarmId)
            geofencingClient.removeGeofences(listOf(alarmId))
                .addOnSuccessListener {
                    android.util.Log.d("GeofenceAlarm", "Geofence removed successfully for alarm: $alarmId")
                }
                .addOnFailureListener { exception ->
                    android.util.Log.e("GeofenceAlarm", "Failed to remove geofence for alarm: $alarmId", exception)
                }
            true
        } catch (e: Exception) {
            android.util.Log.e("GeofenceAlarm", "Error removing geofence for alarm: $alarmId", e)
            false
        }
    }
    
    /**
     * 모든 지오펜싱 알람 제거
     */
    suspend fun removeAllGeofenceAlarms(): Boolean = withContext(Dispatchers.IO) {
        try {
            val pendingIntent = createGeofencePendingIntent("")
            geofencingClient.removeGeofences(pendingIntent)
                .addOnSuccessListener {
                    android.util.Log.d("GeofenceAlarm", "All geofences removed successfully")
                }
                .addOnFailureListener { exception ->
                    android.util.Log.e("GeofenceAlarm", "Failed to remove all geofences", exception)
                }
            true
        } catch (e: Exception) {
            android.util.Log.e("GeofenceAlarm", "Error removing all geofences", e)
            false
        }
    }
    
    /**
     * 위치 권한 확인
     */
    private fun hasLocationPermission(): Boolean {
        val fineLocation = ContextCompat.checkSelfPermission(
            context, 
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        
        val backgroundLocation = ContextCompat.checkSelfPermission(
            context, 
            Manifest.permission.ACCESS_BACKGROUND_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        
        return fineLocation && backgroundLocation
    }
    
    /**
     * 지오펜싱 상태 확인 및 업데이트
     * @param locationSnapshot 현재 위치
     */
    suspend fun checkGeofenceStatus(locationSnapshot: LocationSnapshot) = withContext(Dispatchers.IO) {
        try {
            // 현재 등록된 지오펜싱 알람들 확인
            val activeGeofences = getActiveGeofenceAlarms()
            
            for (geofenceData in activeGeofences) {
                val distance = calculateDistance(
                    locationSnapshot.latitude,
                    locationSnapshot.longitude,
                    geofenceData.latitude,
                    geofenceData.longitude
                )
                
                val isInRange = distance <= geofenceData.radius
                
                // 지오펜싱 상태에 따른 알람 트리거 로직
                when (geofenceData.transitionType) {
                    Geofence.GEOFENCE_TRANSITION_ENTER -> {
                        if (isInRange) {
                            triggerGeofenceAlarm(geofenceData.alarmId, "ENTER")
                        }
                    }
                    Geofence.GEOFENCE_TRANSITION_EXIT -> {
                        if (!isInRange) {
                            triggerGeofenceAlarm(geofenceData.alarmId, "EXIT")
                        }
                    }
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("GeofenceAlarm", "Failed to check geofence status", e)
        }
    }
    
    /**
     * 지오펜싱 알람 트리거
     */
    private suspend fun triggerGeofenceAlarm(alarmId: String, transitionType: String) {
        try {
            android.util.Log.d("GeofenceAlarm", "Geofence alarm triggered: $alarmId, type: $transitionType")
            
            // 알람 트리거 로직 (나중에 AlarmEngine과 연동)
            // AlarmEngine.triggerAlarm(alarmId, "GEOFENCE_$transitionType")
            
        } catch (e: Exception) {
            android.util.Log.e("GeofenceAlarm", "Failed to trigger geofence alarm: $alarmId", e)
        }
    }
    
    /**
     * 활성 지오펜싱 알람 목록 조회
     * @return 활성 지오펜싱 알람 목록
     */
    private suspend fun getActiveGeofenceAlarms(): List<GeofenceAlarmData> = withContext(Dispatchers.IO) {
        try {
            // Room DB에서 조회 (나중에 구현)
            // geofenceAlarmDao.getAllActive()
            
            // 임시로 빈 리스트 반환
            emptyList()
        } catch (e: Exception) {
            android.util.Log.e("GeofenceAlarm", "Failed to get active geofence alarms", e)
            emptyList()
        }
    }
    
    /**
     * 두 지점 간의 거리 계산 (Haversine 공식)
     */
    private fun calculateDistance(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Float {
        val earthRadius = 6371000.0 // 지구 반지름 (미터)
        
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        
        val a = kotlin.math.sin(dLat / 2) * kotlin.math.sin(dLat / 2) +
                kotlin.math.cos(Math.toRadians(lat1)) * kotlin.math.cos(Math.toRadians(lat2)) *
                kotlin.math.sin(dLon / 2) * kotlin.math.sin(dLon / 2)
        
        val c = 2 * kotlin.math.atan2(kotlin.math.sqrt(a), kotlin.math.sqrt(1 - a))
        
        return (earthRadius * c).toFloat()
    }
    
    /**
     * 지오펜싱 이벤트를 받을 PendingIntent 생성
     */
    private fun createGeofencePendingIntent(alarmId: String): PendingIntent {
        val intent = Intent(context, GeofenceReceiver::class.java).apply {
            putExtra("alarmId", alarmId)
            putExtra("geofenceEvent", "triggered")
        }
        
        return PendingIntent.getBroadcast(
            context,
            alarmId.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}

/**
 * 지오펜싱 이벤트 데이터 클래스
 */
data class GeofenceAlarmData(
    val alarmId: String,
    val latitude: Double,
    val longitude: Double,
    val radius: Float,
    val transitionType: Int,
    val createdAt: Long = System.currentTimeMillis()
)
