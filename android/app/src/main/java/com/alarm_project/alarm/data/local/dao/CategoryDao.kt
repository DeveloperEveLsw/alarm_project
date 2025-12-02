package com.alarm_project.alarm.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.alarm_project.alarm.data.local.entity.CategoryEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CategoryDao {
    @Query("SELECT * FROM Category ORDER BY id ASC")
    fun observeAll(): Flow<List<CategoryEntity>>

    @Query("SELECT * FROM Category ORDER BY id ASC")
    suspend fun getAll(): List<CategoryEntity>

    @Query("SELECT * FROM Category WHERE id = :id LIMIT 1")
    suspend fun findById(id: Long): CategoryEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: CategoryEntity): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(entities: List<CategoryEntity>)

    @Update
    suspend fun update(entity: CategoryEntity)

    @Delete
    suspend fun delete(entity: CategoryEntity)

    @Query("DELETE FROM Category WHERE id = :id")
    suspend fun deleteById(id: Long)
}
