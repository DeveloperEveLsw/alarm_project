package com.alarm_project.alarm

import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.ConcurrentLinkedQueue

/**
 * 위치 히스토리 관리자
 * 사용자의 위치 이동 패턴을 분석하고 저장하는 기능
 */
class LocationHistoryManager(private val context: Context) {
    
    private val locationProvider = LocationProvider(context)
    
    // 메모리 기반 위치 히스토리 저장소 (나중에 Room DB로 대체)
    private val locationHistory = ConcurrentLinkedQueue<LocationSnapshot>()
    private val maxHistorySize = 1000 // 최대 1000개 위치 저장
    
    /**
     * 위치 스냅샷 저장
     * @param location 저장할 위치 정보
     */
    suspend fun saveLocationSnapshot(location: LocationSnapshot) = withContext(Dispatchers.IO) {
        try {
            // Room DB에 저장 (나중에 구현)
            // locationHistoryDao.insert(location)
            
            // 메모리에 저장
            locationHistory.offer(location)
            
            // 최대 크기 초과 시 오래된 데이터 제거
            while (locationHistory.size > maxHistorySize) {
                locationHistory.poll()
            }
            
            Log.d("LocationHistory", "Location snapshot saved: ${location.latitude}, ${location.longitude}")
            
        } catch (e: Exception) {
            Log.e("LocationHistory", "Failed to save location snapshot", e)
        }
    }
    
    /**
     * 현재 위치를 자동으로 저장
     */
    suspend fun saveCurrentLocation() = withContext(Dispatchers.IO) {
        try {
            val currentLocation = locationProvider.getFreshLocation()
            if (currentLocation != null) {
                saveLocationSnapshot(currentLocation)
            } else {
                Log.w("LocationHistory", "Current location not available")
            }
        } catch (e: Exception) {
            Log.e("LocationHistory", "Failed to save current location", e)
        }
    }
    
    /**
     * 위치 히스토리 조회
     * @param startTime 시작 시간 (밀리초)
     * @param endTime 종료 시간 (밀리초)
     * @return 해당 시간대의 위치 히스토리
     */
    suspend fun getLocationHistory(startTime: Long, endTime: Long): List<LocationSnapshot> = withContext(Dispatchers.IO) {
        
        try {
            // Room DB에서 조회 (나중에 구현)
            // locationHistoryDao.getByTimeRange(startTime, endTime)
            
            // 메모리에서 조회
            locationHistory.filter { location ->
                location.ageMillis >= startTime && location.ageMillis <= endTime
            }.sortedBy { it.ageMillis }
            
        } catch (e: Exception) {
            Log.e("LocationHistory", "Failed to get location history", e)
            emptyList()
        }
    }
    
    /**
     * 최근 위치 히스토리 조회
     * @param count 조회할 개수
     * @return 최근 위치 히스토리
     */
    suspend fun getRecentLocationHistory(count: Int = 10): List<LocationSnapshot> = withContext(Dispatchers.IO) {
        
        try {
            // Room DB에서 조회 (나중에 구현)
            // locationHistoryDao.getRecent(count)
            
            // 메모리에서 조회
            locationHistory.sortedByDescending { it.ageMillis }.take(count)
            
        } catch (e: Exception) {
            Log.e("LocationHistory", "Failed to get recent location history", e)
            emptyList()
        }
    }
    
    /**
     * 위치 이동 패턴 분석
     * @param days 분석할 일수
     * @return 위치 패턴 분석 결과
     */
    suspend fun analyzeLocationPattern(days: Int = 7): LocationPatternAnalysis = withContext(Dispatchers.IO) {
        
        try {
            val endTime = System.currentTimeMillis()
            val startTime = endTime - (days * 24 * 60 * 60 * 1000L)
            
            val history = getLocationHistory(startTime, endTime)
            
            if (history.isEmpty()) {
                return@withContext LocationPatternAnalysis(
                    totalLocations = 0,
                    averageAccuracy = 0f,
                    mostFrequentArea = null,
                    movementDistance = 0f,
                    analysisPeriod = days
                )
            }
            
            // 가장 자주 방문한 지역 찾기
            val mostFrequentArea = findMostFrequentArea(history)
            
            // 평균 정확도 계산
            val averageAccuracy = history.map { it.accuracyMeters }.average().toFloat()
            
            // 총 이동 거리 계산
            val movementDistance = calculateTotalMovementDistance(history)
            
            LocationPatternAnalysis(
                totalLocations = history.size,
                averageAccuracy = averageAccuracy,
                mostFrequentArea = mostFrequentArea,
                movementDistance = movementDistance,
                analysisPeriod = days
            )
            
        } catch (e: Exception) {
            Log.e("LocationHistory", "Failed to analyze location pattern", e)
            LocationPatternAnalysis(
                totalLocations = 0,
                averageAccuracy = 0f,
                mostFrequentArea = null,
                movementDistance = 0f,
                analysisPeriod = days
            )
        }
    }
    
    /**
     * 위치 히스토리 삭제
     * @param olderThan 이 시간보다 오래된 데이터 삭제
     */
    suspend fun clearOldLocationHistory(olderThan: Long) = withContext(Dispatchers.IO) {
        
        try {
            // Room DB에서 삭제 (나중에 구현)
            // locationHistoryDao.deleteOlderThan(olderThan)
            
            // 메모리에서 삭제
            locationHistory.removeIf { it.ageMillis < olderThan }
            
            Log.d("LocationHistory", "Old location history cleared")
            
        } catch (e: Exception) {
            Log.e("LocationHistory", "Failed to clear old location history", e)
        }
    }
    
    /**
     * 가장 자주 방문한 지역 찾기
     */
    private fun findMostFrequentArea(history: List<LocationSnapshot>): LocationArea? {
        if (history.isEmpty()) return null
        
        // 위치를 격자로 나누어서 가장 자주 방문한 격자 찾기
        val gridSize = 0.001 // 약 100미터 격자
        val gridCounts = mutableMapOf<String, Int>()
        
        for (location in history) {
            val gridKey = "${(location.latitude / gridSize).toInt()},${(location.longitude / gridSize).toInt()}"
            gridCounts[gridKey] = gridCounts.getOrDefault(gridKey, 0) + 1
        }
        
        val mostFrequentGrid = gridCounts.maxByOrNull { it.value }
        if (mostFrequentGrid == null) return null
        
        val (gridLat, gridLon) = mostFrequentGrid.key.split(",").map { it.toInt() }
        val centerLat = gridLat * gridSize
        val centerLon = gridLon * gridSize
        
        return LocationArea(
            latitude = centerLat,
            longitude = centerLon,
            radius = gridSize * 1000, // 격자 크기를 미터로 변환
            visitCount = mostFrequentGrid.value,
            lastVisited = history.maxByOrNull { it.ageMillis }?.ageMillis ?: 0
        )
    }
    
    /**
     * 총 이동 거리 계산
     */
    private fun calculateTotalMovementDistance(history: List<LocationSnapshot>): Float {
        if (history.size < 2) return 0f
        
        var totalDistance = 0f
        for (i in 1 until history.size) {
            val prev = history[i - 1]
            val curr = history[i]
            
            val distance = calculateDistance(
                prev.latitude, prev.longitude,
                curr.latitude, curr.longitude
            )
            totalDistance += distance
        }
        
        return totalDistance
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
}

/**
 * 위치 패턴 분석 결과
 */
data class LocationPatternAnalysis(
    val totalLocations: Int,
    val averageAccuracy: Float,
    val mostFrequentArea: LocationArea?,
    val movementDistance: Float, // 총 이동 거리 (미터)
    val analysisPeriod: Int // 분석 기간 (일)
)

/**
 * 위치 지역 정보
 */
data class LocationArea(
    val latitude: Double,
    val longitude: Double,
    val radius: Double, // 반경 (미터)
    val visitCount: Int, // 방문 횟수
    val lastVisited: Long // 마지막 방문 시간
)

