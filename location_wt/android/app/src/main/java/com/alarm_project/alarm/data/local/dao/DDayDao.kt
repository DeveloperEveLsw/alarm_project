package com.alarm_project.alarm.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.alarm_project.alarm.data.local.entity.DDayEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface DDayDao {
    @Query("SELECT * FROM Dday ORDER BY target_date ASC")
    fun observeAll(): Flow<List<DDayEntity>>

    @Query("SELECT * FROM Dday WHERE id = :id LIMIT 1")
    suspend fun findById(id: Long): DDayEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: DDayEntity): Long

    @Update
    suspend fun update(entity: DDayEntity)

    @Delete
    suspend fun delete(entity: DDayEntity)

    @Query("DELETE FROM Dday WHERE id = :id")
    suspend fun deleteById(id: Long)

    @Query("SELECT * FROM Dday ORDER BY id ASC")
    suspend fun getAll(): List<DDayEntity>
}
