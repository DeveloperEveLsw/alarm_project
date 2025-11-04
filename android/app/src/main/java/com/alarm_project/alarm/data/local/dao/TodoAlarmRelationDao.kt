package com.alarm_project.alarm.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.alarm_project.alarm.data.local.entity.TodoAlarmRelationEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface TodoAlarmRelationDao {
    @Query(
        "SELECT * FROM TodoAlarmRelation WHERE todo_id = :todoId ORDER BY order_index ASC, id ASC",
    )
    fun observeByTodoId(todoId: Long): Flow<List<TodoAlarmRelationEntity>>

    @Query(
        "SELECT * FROM TodoAlarmRelation WHERE todo_id = :todoId ORDER BY order_index ASC, id ASC",
    )
    suspend fun getByTodoId(todoId: Long): List<TodoAlarmRelationEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: TodoAlarmRelationEntity): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(entities: List<TodoAlarmRelationEntity>)

    @Query("SELECT * FROM TodoAlarmRelation ORDER BY todo_id ASC, order_index ASC, id ASC")
    suspend fun getAll(): List<TodoAlarmRelationEntity>

    @Query("DELETE FROM TodoAlarmRelation WHERE todo_id = :todoId")
    suspend fun deleteByTodoId(todoId: Long)

    @Query("DELETE FROM TodoAlarmRelation WHERE alarm_id = :alarmId")
    suspend fun deleteByAlarmId(alarmId: String)
}
