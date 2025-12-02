package com.alarm_project.alarm.data.local.repository

import androidx.room.withTransaction
import com.alarm_project.alarm.data.local.AlarmRoomDatabase
import com.alarm_project.alarm.data.local.entity.AlarmEntity
import com.alarm_project.alarm.data.local.entity.AlarmSetEntity
import com.alarm_project.alarm.data.local.entity.AlarmSetTemplateEntity
import com.alarm_project.alarm.data.local.entity.AlarmTemplateEntity
import com.alarm_project.alarm.data.local.entity.CategoryEntity
import com.alarm_project.alarm.data.local.entity.DDayEntity
import com.alarm_project.alarm.data.local.entity.GeoFenceHistoryEntity
import com.alarm_project.alarm.data.local.entity.GeoFenceZoneEntity
import com.alarm_project.alarm.data.local.entity.GeoFenceZoneWithHistory
import com.alarm_project.alarm.data.local.entity.TodoAlarmRelationEntity
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
    private val todoAlarmRelationDao = database.todoAlarmRelationDao()
    private val alarmSetTemplateDao = database.alarmSetTemplateDao()
    private val alarmTemplateDao = database.alarmTemplateDao()
    private val geoFenceZoneDao = database.geoFenceZoneDao()
    private val geoFenceHistoryDao = database.geoFenceHistoryDao()
    private val categoryDao = database.categoryDao()

    fun observeTodos(): Flow<List<TodoEntity>> = todoDao.observeAll()
    fun observeAlarms(): Flow<List<AlarmEntity>> = alarmDao.observeAll()
    fun observeAlarmSets(): Flow<List<AlarmSetEntity>> = alarmSetDao.observeAll()
    fun observeDDays(): Flow<List<DDayEntity>> = dDayDao.observeAll()
    fun observeTodoAlarmRelations(todoId: Long): Flow<List<TodoAlarmRelationEntity>> =
        todoAlarmRelationDao.observeByTodoId(todoId)
    fun observeAlarmSetTemplates(): Flow<List<AlarmSetTemplateEntity>> =
        alarmSetTemplateDao.observeAll()
    fun observeAlarmTemplates(templateId: String): Flow<List<AlarmTemplateEntity>> =
        alarmTemplateDao.observeByTemplateId(templateId)
    fun observeGeoFenceZones(): Flow<List<GeoFenceZoneEntity>> = geoFenceZoneDao.observeAll()
    fun observeCategories(): Flow<List<CategoryEntity>> = categoryDao.observeAll()

    suspend fun getTodos(): List<TodoEntity> = withContext(ioDispatcher) { todoDao.getAll() }

    suspend fun getAlarms(): List<AlarmEntity> = withContext(ioDispatcher) { alarmDao.getAll() }

    suspend fun getAlarmSets(): List<AlarmSetEntity> = withContext(ioDispatcher) { alarmSetDao.getAll() }

    suspend fun getDDays(): List<DDayEntity> = withContext(ioDispatcher) { dDayDao.getAll() }

    suspend fun getTodoAlarmRelations(todoId: Long): List<TodoAlarmRelationEntity> =
        withContext(ioDispatcher) { todoAlarmRelationDao.getByTodoId(todoId) }

    suspend fun getAllTodoAlarmRelations(): List<TodoAlarmRelationEntity> =
        withContext(ioDispatcher) { todoAlarmRelationDao.getAll() }

    suspend fun getAlarmSetTemplates(): List<AlarmSetTemplateEntity> =
        withContext(ioDispatcher) { alarmSetTemplateDao.getAll() }

    suspend fun getAlarmTemplates(templateId: String): List<AlarmTemplateEntity> =
        withContext(ioDispatcher) { alarmTemplateDao.getByTemplateId(templateId) }

    suspend fun getGeoFenceZone(id: Long): GeoFenceZoneEntity? =
        withContext(ioDispatcher) { geoFenceZoneDao.findById(id) }

    suspend fun getGeoFenceZoneByAlarm(alarmId: String): GeoFenceZoneEntity? =
        withContext(ioDispatcher) { geoFenceZoneDao.findByAlarmId(alarmId) }

    suspend fun getActiveGeoFenceZones(): List<GeoFenceZoneEntity> =
        withContext(ioDispatcher) { geoFenceZoneDao.getActiveZones() }

    suspend fun getGeoFenceZones(): List<GeoFenceZoneEntity> =
        withContext(ioDispatcher) { geoFenceZoneDao.getAll() }

    suspend fun getGeoFenceZoneWithHistory(id: Long): GeoFenceZoneWithHistory? =
        withContext(ioDispatcher) { geoFenceZoneDao.getZoneWithHistory(id) }

    suspend fun getGeoFenceHistories(): List<GeoFenceHistoryEntity> =
        withContext(ioDispatcher) { geoFenceHistoryDao.getAll() }

    suspend fun getCategories(): List<CategoryEntity> = withContext(ioDispatcher) { categoryDao.getAll() }

    suspend fun findCategoryById(id: Long): CategoryEntity? =
        withContext(ioDispatcher) { categoryDao.findById(id) }

    suspend fun upsertCategory(entity: CategoryEntity): Long = withContext(ioDispatcher) {
        categoryDao.upsert(entity)
    }

    suspend fun deleteCategoryById(id: Long) = withContext(ioDispatcher) {
        categoryDao.deleteById(id)
    }

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

    suspend fun assignAlarmsToSet(ids: List<String>, setId: String?) = withContext(ioDispatcher) {
        if (ids.isEmpty()) return@withContext
        alarmDao.updateSetForIds(ids, setId)
    }

    suspend fun upsertAlarmSetTemplate(entity: AlarmSetTemplateEntity) = withContext(ioDispatcher) {
        alarmSetTemplateDao.upsert(entity)
    }

    suspend fun replaceAlarmTemplates(entities: List<AlarmTemplateEntity>) = withContext(ioDispatcher) {
        if (entities.isEmpty()) return@withContext
        database.withTransaction {
            alarmTemplateDao.deleteByTemplateId(entities.first().templateId)
            alarmTemplateDao.upsertAll(entities)
        }
    }

    suspend fun deleteAlarmTemplatesByTemplate(templateId: String) = withContext(ioDispatcher) {
        alarmTemplateDao.deleteByTemplateId(templateId)
    }

    suspend fun deleteAlarmSetTemplate(templateId: String) = withContext(ioDispatcher) {
        database.withTransaction {
            alarmTemplateDao.deleteByTemplateId(templateId)
            alarmSetTemplateDao.deleteById(templateId)
        }
    }

    suspend fun replaceTodoAlarmRelations(
        todoId: Long,
        relations: List<TodoAlarmRelationEntity>,
    ) = withContext(ioDispatcher) {
        database.withTransaction {
            todoAlarmRelationDao.deleteByTodoId(todoId)
            if (relations.isNotEmpty()) {
                todoAlarmRelationDao.upsertAll(relations)
            }
        }
    }

    suspend fun upsertDDay(entity: DDayEntity): Long = withContext(ioDispatcher) {
        dDayDao.upsert(entity)
    }

    suspend fun deleteTodo(todoId: Long) = withContext(ioDispatcher) {
        database.withTransaction {
            val existing = todoDao.findById(todoId)
            if (existing != null) {
                existing.ddayId?.let { ddayId ->
                    dDayDao.deleteById(ddayId)
                }
                existing.alarmId?.let { alarmId ->
                    alarmDao.deleteById(alarmId)
                }
                todoAlarmRelationDao.deleteByTodoId(todoId)
                todoDao.deleteById(todoId)
            }
        }
    }

    suspend fun deleteAlarm(alarmId: String) = withContext(ioDispatcher) {
        database.withTransaction {
            alarmDao.deleteById(alarmId)
            todoAlarmRelationDao.deleteByAlarmId(alarmId)
        }
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

    suspend fun insertGeoFenceZone(zone: GeoFenceZoneEntity): Long = withContext(ioDispatcher) {
        geoFenceZoneDao.insert(zone)
    }

    suspend fun updateGeoFenceZone(zone: GeoFenceZoneEntity) = withContext(ioDispatcher) {
        geoFenceZoneDao.update(zone)
    }

    suspend fun deleteGeoFenceZoneByAlarm(alarmId: String) = withContext(ioDispatcher) {
        geoFenceZoneDao.deleteByAlarmId(alarmId)
    }

    suspend fun deleteGeoFenceZone(zone: GeoFenceZoneEntity) = withContext(ioDispatcher) {
        geoFenceZoneDao.delete(zone)
    }

    suspend fun setGeoFenceZoneActive(id: Long, active: Boolean) = withContext(ioDispatcher) {
        geoFenceZoneDao.updateActive(id, active)
    }

    suspend fun insertGeoFenceHistory(entry: GeoFenceHistoryEntity): Long = withContext(ioDispatcher) {
        geoFenceHistoryDao.insert(entry)
    }

    suspend fun latestGeoFenceStates(zoneId: Long, limit: Int = 1) =
        withContext(ioDispatcher) { geoFenceHistoryDao.getLatestByZone(zoneId, limit) }

    suspend fun clearHistoryForZone(zoneId: Long) = withContext(ioDispatcher) {
        geoFenceHistoryDao.deleteByZone(zoneId)
    }
}
