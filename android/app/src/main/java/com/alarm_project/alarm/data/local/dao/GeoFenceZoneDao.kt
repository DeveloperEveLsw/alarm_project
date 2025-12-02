package com.alarm_project.alarm.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Update
import com.alarm_project.alarm.data.local.entity.GeoFenceZoneEntity
import com.alarm_project.alarm.data.local.entity.GeoFenceZoneWithHistory
import kotlinx.coroutines.flow.Flow

@Dao
interface GeoFenceZoneDao {
    @Query("SELECT * FROM GeoFenceZone ORDER BY id DESC")
    fun observeAll(): Flow<List<GeoFenceZoneEntity>>

    @Query("SELECT * FROM GeoFenceZone ORDER BY id DESC")
    suspend fun getAll(): List<GeoFenceZoneEntity>

    @Query("SELECT * FROM GeoFenceZone WHERE is_active = 1 ORDER BY id DESC")
    suspend fun getActiveZones(): List<GeoFenceZoneEntity>

    @Query("SELECT * FROM GeoFenceZone WHERE id = :id")
    suspend fun findById(id: Long): GeoFenceZoneEntity?

    @Query("SELECT * FROM GeoFenceZone WHERE alarm_id = :alarmId LIMIT 1")
    suspend fun findByAlarmId(alarmId: String): GeoFenceZoneEntity?

    @Insert
    suspend fun insert(zone: GeoFenceZoneEntity): Long

    @Update
    suspend fun update(zone: GeoFenceZoneEntity)

    @Delete
    suspend fun delete(zone: GeoFenceZoneEntity)

    @Query("DELETE FROM GeoFenceZone WHERE alarm_id = :alarmId")
    suspend fun deleteByAlarmId(alarmId: String)

    @Query("UPDATE GeoFenceZone SET is_active = :active WHERE id = :id")
    suspend fun updateActive(id: Long, active: Boolean)

    @Transaction
    @Query("SELECT * FROM GeoFenceZone WHERE id = :id")
    suspend fun getZoneWithHistory(id: Long): GeoFenceZoneWithHistory?
}
