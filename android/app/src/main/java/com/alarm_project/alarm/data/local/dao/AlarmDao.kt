package com.alarm_project.alarm.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.alarm_project.alarm.data.local.entity.AlarmEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface AlarmDao {
    @Query("SELECT * FROM Alarm ORDER BY hour ASC, minute ASC, id ASC")
    fun observeAll(): Flow<List<AlarmEntity>>

    @Query("SELECT * FROM Alarm WHERE id = :id LIMIT 1")
    suspend fun findById(id: String): AlarmEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: AlarmEntity)

    @Update
    suspend fun update(entity: AlarmEntity)

    @Query("SELECT * FROM Alarm ORDER BY id ASC")
    suspend fun getAll(): List<AlarmEntity>

    @Query("DELETE FROM Alarm WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("DELETE FROM Alarm WHERE id IN (:ids)")
    suspend fun deleteByIds(ids: List<String>)

    @Query("UPDATE Alarm SET enabled = :enabled, next_trigger_at = :nextTriggerAt WHERE id = :id")
    suspend fun updateState(id: String, enabled: Boolean, nextTriggerAt: Long?)

    @Query("UPDATE Alarm SET enabled = :enabled WHERE id = :id")
    suspend fun updateEnabled(id: String, enabled: Boolean)

    @Query("UPDATE Alarm SET alarm_set_id = :setId WHERE id IN (:ids)")
    suspend fun updateSetForIds(ids: List<String>, setId: String?)
}
