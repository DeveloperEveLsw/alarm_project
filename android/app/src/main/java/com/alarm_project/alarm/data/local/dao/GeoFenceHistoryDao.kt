package com.alarm_project.alarm.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import com.alarm_project.alarm.data.local.entity.GeoFenceHistoryEntity

@Dao
interface GeoFenceHistoryDao {
    @Insert
    suspend fun insert(entry: GeoFenceHistoryEntity): Long

    @Query("SELECT * FROM GeoFenceHistory ORDER BY id DESC")
    suspend fun getAll(): List<GeoFenceHistoryEntity>

    @Query("SELECT * FROM GeoFenceHistory WHERE zone_id = :zoneId ORDER BY id DESC LIMIT :limit")
    suspend fun getLatestByZone(zoneId: Long, limit: Int = 1): List<GeoFenceHistoryEntity>

    @Query("DELETE FROM GeoFenceHistory WHERE zone_id = :zoneId")
    suspend fun deleteByZone(zoneId: Long)
}
