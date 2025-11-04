package com.alarm_project.alarm.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.alarm_project.alarm.data.local.entity.AlarmSetTemplateEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface AlarmSetTemplateDao {
    @Query("SELECT * FROM AlarmSetTemplate ORDER BY created_at DESC, label ASC")
    fun observeAll(): Flow<List<AlarmSetTemplateEntity>>

    @Query("SELECT * FROM AlarmSetTemplate ORDER BY created_at DESC, label ASC")
    suspend fun getAll(): List<AlarmSetTemplateEntity>

    @Query("SELECT * FROM AlarmSetTemplate WHERE id = :id LIMIT 1")
    suspend fun findById(id: String): AlarmSetTemplateEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: AlarmSetTemplateEntity)

    @Update
    suspend fun update(entity: AlarmSetTemplateEntity)

    @Delete
    suspend fun delete(entity: AlarmSetTemplateEntity)

    @Query("DELETE FROM AlarmSetTemplate WHERE id = :id")
    suspend fun deleteById(id: String)
}
