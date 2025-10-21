package com.alarm_project.alarm.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.alarm_project.alarm.data.local.entity.TodoEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface TodoDao {
    @Query("SELECT * FROM Todo ORDER BY created_at DESC")
    fun observeAll(): Flow<List<TodoEntity>>

    @Query("SELECT * FROM Todo WHERE id = :id LIMIT 1")
    suspend fun findById(id: Long): TodoEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: TodoEntity): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(entities: List<TodoEntity>)

    @Query("SELECT * FROM Todo ORDER BY id ASC")
    suspend fun getAll(): List<TodoEntity>

    @Update
    suspend fun update(entity: TodoEntity)

    @Delete
    suspend fun delete(entity: TodoEntity)

    @Query("DELETE FROM Todo WHERE id = :id")
    suspend fun deleteById(id: Long)
}
