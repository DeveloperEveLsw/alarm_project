package com.alarm_project.alarm

/**
 * 공통으로 사용하는 위치 스냅샷 데이터
 *
 * @property latitude 위도
 * @property longitude 경도
 * @property accuracyMeters 위치 정확도 (미터)
 * @property ageMillis 위치가 측정된 시점(UTC epoch millis)
 * @property provider 측정에 사용된 프로바이더
 */
data class LocationSnapshot(
    val latitude: Double,
    val longitude: Double,
    val accuracyMeters: Float,
    val ageMillis: Long,
    val provider: String,
)
