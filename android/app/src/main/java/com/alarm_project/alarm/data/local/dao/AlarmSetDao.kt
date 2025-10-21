package com.alarm_project.alarm.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.alarm_project.alarm.data.local.entity.AlarmSetEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface AlarmSetDao {
    @Query("SELECT * FROM AlarmSet ORDER BY label ASC")
    fun observeAll(): Flow<List<AlarmSetEntity>>

    @Query("SELECT * FROM AlarmSet WHERE id = :id LIMIT 1")
    suspend fun findById(id: String): AlarmSetEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: AlarmSetEntity)

    @Update
    suspend fun update(entity: AlarmSetEntity)

    @Delete
    suspend fun delete(entity: AlarmSetEntity)

    @Query("SELECT * FROM AlarmSet ORDER BY id ASC")
    suspend fun getAll(): List<AlarmSetEntity>
}
