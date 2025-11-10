package com.alarm_project.alarm

import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlin.math.*

/**
 * 위치 조건 기반 알람 관리자
 * 특정 장소에서만 알람이 울리도록 하는 기능
 */
class LocationBasedAlarmManager(private val context: Context) {
    
    private val locationProvider = LocationProvider(context)
    
    /**
     * 위치 조건 설정
     * @param alarmId 알람 ID
     * @param requiredLocation 필요한 위치
     * @param radius 허용 반경 (미터)
     * @param conditionType 조건 타입 (IN_LOCATION, OUT_OF_LOCATION, ANYWHERE)
     */
    suspend fun setLocationCondition(
        alarmId: String,
        requiredLocation: LocationSnapshot,
        radius: Float = 100f, // 기본 100미터
        conditionType: LocationConditionType = LocationConditionType.IN_LOCATION
    ): Boolean = withContext(Dispatchers.IO) {
        
        try {
            val condition = LocationCondition(
                alarmId = alarmId,
                requiredLocation = requiredLocation,
                radius = radius,
                conditionType = conditionType,
                createdAt = System.currentTimeMillis()
            )
            
            // Room DB에 저장 (나중에 구현)
            // locationConditionDao.insert(condition)
            
            Log.d("LocationBasedAlarm", "Location condition set for alarm: $alarmId")
            true
        } catch (e: Exception) {
            Log.e("LocationBasedAlarm", "Failed to set location condition for alarm: $alarmId", e)
            false
        }
    }
    
    /**
     * 위치 조건 확인
     * @param alarmId 알람 ID
     * @return 위치 조건 만족 여부
     */
    suspend fun checkLocationCondition(alarmId: String): Boolean = withContext(Dispatchers.IO) {
        
        try {
            // Room DB에서 조건 조회 (나중에 구현)
            // val condition = locationConditionDao.getByAlarmId(alarmId)
            // if (condition == null) return@withContext true // 조건이 없으면 항상 만족
            
            // 임시로 하드코딩된 조건 사용
            val condition = getHardcodedCondition(alarmId)
            if (condition == null) return@withContext true
            
            val currentLocation = locationProvider.getFreshLocation()
            if (currentLocation == null) {
                Log.w("LocationBasedAlarm", "Current location not available for alarm: $alarmId")
                return@withContext false
            }
            
            val distance = calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                condition.requiredLocation.latitude,
                condition.requiredLocation.longitude
            )
            
            val isInRange = distance <= condition.radius
            
            val conditionMet = when (condition.conditionType) {
                LocationConditionType.IN_LOCATION -> isInRange
                LocationConditionType.OUT_OF_LOCATION -> !isInRange
                LocationConditionType.ANYWHERE -> true
            }
            
            Log.d("LocationBasedAlarm", 
                "Location condition check for alarm: $alarmId, " +
                "distance: ${distance}m, radius: ${condition.radius}m, " +
                "condition met: $conditionMet"
            )
            
            conditionMet
            
        } catch (e: Exception) {
            Log.e("LocationBasedAlarm", "Failed to check location condition for alarm: $alarmId", e)
            false
        }
    }
    
    /**
     * 위치 조건 제거
     * @param alarmId 알람 ID
     */
    suspend fun removeLocationCondition(alarmId: String): Boolean = withContext(Dispatchers.IO) {
        
        try {
            // Room DB에서 제거 (나중에 구현)
            // locationConditionDao.deleteByAlarmId(alarmId)
            
            Log.d("LocationBasedAlarm", "Location condition removed for alarm: $alarmId")
            true
        } catch (e: Exception) {
            Log.e("LocationBasedAlarm", "Failed to remove location condition for alarm: $alarmId", e)
            false
        }
    }
    
    /**
     * 모든 위치 조건 조회
     */
    suspend fun getAllLocationConditions(): List<LocationCondition> = withContext(Dispatchers.IO) {
        
        try {
            // Room DB에서 조회 (나중에 구현)
            // locationConditionDao.getAll()
            
            // 임시로 빈 리스트 반환
            emptyList()
        } catch (e: Exception) {
            Log.e("LocationBasedAlarm", "Failed to get all location conditions", e)
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
        
        val a = sin(dLat / 2) * sin(dLat / 2) +
                cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
                sin(dLon / 2) * sin(dLon / 2)
        
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))
        
        return (earthRadius * c).toFloat()
    }
    
    /**
     * 임시 하드코딩된 조건 (나중에 DB로 대체)
     */
    private fun getHardcodedCondition(alarmId: String): LocationCondition? {
        // 예시: 특정 알람에 대한 위치 조건
        return when (alarmId) {
            "home_alarm" -> LocationCondition(
                alarmId = alarmId,
                requiredLocation = LocationSnapshot(
                    latitude = 37.5665, // 서울시청
                    longitude = 126.9780,
                    accuracyMeters = 10f,
                    ageMillis = 0,
                    provider = "hardcoded"
                ),
                radius = 200f,
                conditionType = LocationConditionType.IN_LOCATION,
                createdAt = System.currentTimeMillis()
            )
            else -> null
        }
    }
}

/**
 * 위치 조건 타입
 */
enum class LocationConditionType {
    IN_LOCATION,      // 특정 위치 내에서만 알람
    OUT_OF_LOCATION,  // 특정 위치 밖에서만 알람
    ANYWHERE          // 위치 무관하게 알람
}

/**
 * 위치 조건 데이터 클래스
 */
data class LocationCondition(
    val alarmId: String,
    val requiredLocation: LocationSnapshot,
    val radius: Float,
    val conditionType: LocationConditionType,
    val createdAt: Long
)

