package com.alarm_project.alarm.data.local.repository

import com.alarm_project.alarm.data.local.AlarmRoomDatabase
import com.alarm_project.alarm.data.local.entity.AlarmEntity
import com.alarm_project.alarm.data.local.entity.AlarmSetEntity
import com.alarm_project.alarm.data.local.entity.DDayEntity
import com.alarm_project.alarm.data.local.entity.TodoEntity
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext

/**
 * Thin facade over Room that keeps coroutine dispatching and DAO wiring in one place.
 */
class AlarmLocalDataSource(
    private val database: AlarmRoomDatabase,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
) {
    private val todoDao = database.todoDao()
    private val alarmDao = database.alarmDao()
    private val alarmSetDao = database.alarmSetDao()
    private val dDayDao = database.dDayDao()

    fun observeTodos(): Flow<List<TodoEntity>> = todoDao.observeAll()
    fun observeAlarms(): Flow<List<AlarmEntity>> = alarmDao.observeAll()
    fun observeAlarmSets(): Flow<List<AlarmSetEntity>> = alarmSetDao.observeAll()
    fun observeDDays(): Flow<List<DDayEntity>> = dDayDao.observeAll()

    suspend fun getTodos(): List<TodoEntity> = withContext(ioDispatcher) { todoDao.getAll() }

    suspend fun getAlarms(): List<AlarmEntity> = withContext(ioDispatcher) { alarmDao.getAll() }

    suspend fun getAlarmSets(): List<AlarmSetEntity> = withContext(ioDispatcher) { alarmSetDao.getAll() }

    suspend fun getDDays(): List<DDayEntity> = withContext(ioDispatcher) { dDayDao.getAll() }

    suspend fun upsertTodo(entity: TodoEntity): Long = withContext(ioDispatcher) {
        todoDao.upsert(entity)
    }

    suspend fun upsertAlarm(entity: AlarmEntity) = withContext(ioDispatcher) {
        alarmDao.upsert(entity)
    }

    suspend fun getAlarm(id: String): AlarmEntity? = withContext(ioDispatcher) {
        alarmDao.findById(id)
    }

    suspend fun upsertAlarmSet(entity: AlarmSetEntity) = withContext(ioDispatcher) {
        alarmSetDao.upsert(entity)
    }

    suspend fun upsertDDay(entity: DDayEntity): Long = withContext(ioDispatcher) {
        dDayDao.upsert(entity)
    }

    suspend fun deleteAlarm(alarmId: String) = withContext(ioDispatcher) {
        alarmDao.deleteById(alarmId)
    }

    suspend fun deleteAlarms(ids: List<String>) = withContext(ioDispatcher) {
        alarmDao.deleteByIds(ids)
    }

    suspend fun updateEnabled(alarmId: String, enabled: Boolean) = withContext(ioDispatcher) {
        alarmDao.updateEnabled(alarmId, enabled)
    }

    suspend fun updateAlarmState(alarmId: String, enabled: Boolean, nextTriggerAt: Long?) =
        withContext(ioDispatcher) {
            alarmDao.updateState(alarmId, enabled, nextTriggerAt)
        }
}
