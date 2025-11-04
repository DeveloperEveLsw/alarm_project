package com.alarm_project.alarm.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.alarm_project.alarm.data.local.entity.AlarmTemplateEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface AlarmTemplateDao {
    @Query(
        "SELECT * FROM AlarmTemplate WHERE template_id = :templateId ORDER BY offset_minutes ASC, id ASC",
    )
    fun observeByTemplateId(templateId: String): Flow<List<AlarmTemplateEntity>>

    @Query(
        "SELECT * FROM AlarmTemplate WHERE template_id = :templateId ORDER BY offset_minutes ASC, id ASC",
    )
    suspend fun getByTemplateId(templateId: String): List<AlarmTemplateEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: AlarmTemplateEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(entities: List<AlarmTemplateEntity>)

    @Update
    suspend fun update(entity: AlarmTemplateEntity)

    @Delete
    suspend fun delete(entity: AlarmTemplateEntity)

    @Query("DELETE FROM AlarmTemplate WHERE template_id = :templateId")
    suspend fun deleteByTemplateId(templateId: String)
}
