package com.alarm_project.alarm

import androidx.room.withTransaction
import com.alarm_project.alarm.data.local.AlarmRoomDatabase
import com.alarm_project.alarm.data.local.entity.AlarmEntity
import com.alarm_project.alarm.data.local.entity.AlarmSetEntity
import com.alarm_project.alarm.data.local.entity.AlarmSetTemplateEntity
import com.alarm_project.alarm.data.local.entity.AlarmTemplateEntity
import com.alarm_project.alarm.data.local.entity.DDayEntity
import com.alarm_project.alarm.data.local.entity.TodoAlarmRelationEntity
import com.alarm_project.alarm.data.local.entity.TodoEntity
import com.alarm_project.alarm.data.local.entity.GeoFenceZoneEntity
import com.alarm_project.alarm.data.local.entity.GeoFenceHistoryEntity
import com.alarm_project.alarm.data.local.entity.CategoryEntity
import com.alarm_project.alarm.data.local.repository.AlarmLocalDataSource
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import java.text.ParseException
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.Date

private val dbJson = Json { ignoreUnknownKeys = true }

@Serializable
private data class TodoMutationPayload(
    val id: Long? = null,
    val title: String,
    val dueDate: String? = null,
    val dueTime: String? = null,
    val isRepeating: Boolean = false,
    val repeatType: String? = null,
    val repeatWeekdays: List<Int> = emptyList(),
    val repeatDayOfMonth: Int? = null,
    val alarmId: String? = null,
    val alarmSetId: String? = null,
    val ddayId: Long? = null,
    val isDDay: Boolean = false,
    val categoryId: Long? = null,
)

@Serializable
private data class TodoAlarmRelationMutationPayload(
    val alarmId: String,
    val offsetMinutes: Int,
    val orderIndex: Int? = null,
)

@Serializable
private data class AlarmSetPayload(
    val id: String,
    val label: String,
    val defaultSound: String,
    val defaultMode: String = "normal",
    val createdAt: String? = null,
)

@Serializable
private data class AlarmTemplateEntryPayload(
    val label: String? = null,
    val offsetMinutes: Int,
    val repeatDays: List<Int> = emptyList(),
    val skipHolidays: Boolean = false,
    val sound: String = "",
    val vibrate: Boolean = true,
    val policyMode: String? = null,
    val policyPayload: String? = null,
)

@Serializable
private data class AlarmPersistPayload(
    val id: String,
    val label: String,
    val hour: Int,
    val minute: Int,
    val repeatDays: List<Int> = emptyList(),
    val skipHolidays: Boolean = false,
    val sound: String = "",
    val vibrate: Boolean = true,
    val enabled: Boolean = true,
    val alarmSetId: String? = null,
    val ddayId: Long? = null,
    val policyMode: String? = null,
    val policyPayload: String? = null,
    val nextTriggerAt: Long? = null,
    val categoryId: Long? = null,
)

private fun encodeWeekdays(days: List<Int>): Int {
    var mask = 0
    days.forEach { day ->
        if (day in 0..6) {
            mask = mask or (1 shl day)
        }
    }
    return mask
}

private fun maskHasDay(mask: Int, day: Int): Boolean = ((mask shr day) and 1) == 1

class LocalDatabaseModule(private val appContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(appContext) {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun getName(): String = "LocalDatabase"

    override fun invalidate() {
        super.invalidate()
        scope.cancel()
    }

    private fun dataSource(): AlarmLocalDataSource {
        val database = AlarmRoomDatabase.getInstance(appContext)
        return AlarmLocalDataSource(database)
    }

    @ReactMethod
    fun ensureInitialized(promise: Promise) {
        scope.launch {
            try {
                ensureRoomDatabase()
                withContext(Dispatchers.Main) { promise.resolve(null) }
            } catch (error: Exception) {
                withContext(Dispatchers.Main) { promise.reject("db_init_error", error) }
            }
        }
    }

    @ReactMethod
    fun fetchSnapshot(promise: Promise) {
        scope.launch {
            try {
                val source = dataSource()
                val todos = source.getTodos()
                val dday = source.getDDays()
                val alarmSets = source.getAlarmSets()
                val alarms = source.getAlarms()
                val todoRelations = source.getAllTodoAlarmRelations()
                val alarmSetTemplates = source.getAlarmSetTemplates()
                val alarmTemplateMaps = Arguments.createArray()
                alarmSetTemplates.forEach { template ->
                    val entries = source.getAlarmTemplates(template.id)
                    entries.forEach { entry ->
                        alarmTemplateMaps.pushMap(alarmTemplateToMap(entry))
                    }
                }
                val geoFenceZones = source.getGeoFenceZones()
                val geoFenceHistories = source.getGeoFenceHistories()

                val result = Arguments.createMap().apply {
                    putArray("Todo", toWritableArray(todos, ::todoToMap))
                    putArray("Dday", toWritableArray(dday, ::ddayToMap))
                    putArray("AlarmSet", toWritableArray(alarmSets, ::alarmSetToMap))
                    putArray("Alarm", toWritableArray(alarms, ::alarmToMap))
                    putArray(
                        "TodoAlarmRelation",
                        toWritableArray(todoRelations, ::todoAlarmRelationToMap),
                    )
                    putArray(
                        "AlarmSetTemplate",
                        toWritableArray(alarmSetTemplates, ::alarmSetTemplateToMap),
                    )
                    putArray("AlarmTemplate", alarmTemplateMaps)
                    putArray("GeoFenceZone", toWritableArray(geoFenceZones, ::geoFenceZoneToMap))
                    putArray("GeoFenceHistory", toWritableArray(geoFenceHistories, ::geoFenceHistoryToMap))
                }
                withContext(Dispatchers.Main) { promise.resolve(result) }
            } catch (error: Exception) {
                withContext(Dispatchers.Main) { promise.reject("db_fetch_error", error) }
            }
        }
    }

    @ReactMethod
    fun clearAllTables(promise: Promise) {
        scope.launch {
            try {
                val database = AlarmRoomDatabase.getInstance(appContext)
                database.clearAllTables()
                withContext(Dispatchers.Main) { promise.resolve(null) }
            } catch (error: Exception) {
                withContext(Dispatchers.Main) { promise.reject("db_clear_error", error) }
            }
        }
    }

    @ReactMethod
    fun fetchTodos(promise: Promise) {
        scope.launch {
            try {
                ensureRoomDatabase()
                val source = dataSource()
                val todos = source.getTodos()
                val result = toWritableArray(todos, ::todoToMap)
                withContext(Dispatchers.Main) { promise.resolve(result) }
            } catch (error: Exception) {
                withContext(Dispatchers.Main) { promise.reject("todo_fetch_error", error) }
            }
        }
    }

    @ReactMethod
    fun fetchTodosForDate(targetDate: String, promise: Promise) {
        scope.launch {
            try {
                ensureRoomDatabase()
                val source = dataSource()
                val todos = source.getTodos()
                val filtered = filterTodosForDate(todos, targetDate)
                val result = toWritableArray(filtered, ::todoToMap)
                withContext(Dispatchers.Main) { promise.resolve(result) }
            } catch (error: Exception) {
                withContext(Dispatchers.Main) { promise.reject("todo_fetch_date_error", error) }
            }
        }
    }

    @ReactMethod
    fun fetchTodoAlarmRelations(todoId: Double, promise: Promise) {
        scope.launch {
            try {
                ensureRoomDatabase()
                val source = dataSource()
                val relations = source.getTodoAlarmRelations(todoId.toLong())
                val result = toWritableArray(relations, ::todoAlarmRelationToMap)
                withContext(Dispatchers.Main) { promise.resolve(result) }
            } catch (error: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("todo_alarm_relation_fetch_error", error)
                }
            }
        }
    }

    @ReactMethod
    fun replaceTodoAlarmRelations(todoId: Double, payloadJson: String, promise: Promise) {
        scope.launch {
            try {
                ensureRoomDatabase()
                val payload = dbJson.decodeFromString<List<TodoAlarmRelationMutationPayload>>(payloadJson)
                val todoIdLong = todoId.toLong()
                val relations = payload.mapIndexed { index, relation ->
                    TodoAlarmRelationEntity(
                        id = null,
                        todoId = todoIdLong,
                        alarmId = relation.alarmId,
                        offsetMinutes = relation.offsetMinutes,
                        orderIndex = relation.orderIndex ?: index,
                    )
                }
                val source = dataSource()
                source.replaceTodoAlarmRelations(todoIdLong, relations)
                withContext(Dispatchers.Main) { promise.resolve(null) }
            } catch (error: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("todo_alarm_relation_replace_error", error)
                }
            }
        }
    }

    @ReactMethod
    fun upsertAlarmSet(payloadJson: String, promise: Promise) {
        scope.launch {
            try {
                ensureRoomDatabase()
                val payload = dbJson.decodeFromString<AlarmSetPayload>(payloadJson)
                val source = dataSource()
                source.upsertAlarmSet(
                    AlarmSetEntity(
                        id = payload.id,
                        label = payload.label,
                        defaultSound = payload.defaultSound,
                        defaultMode = payload.defaultMode,
                    ),
                )
                withContext(Dispatchers.Main) { promise.resolve(null) }
            } catch (error: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("alarm_set_upsert_error", error)
                }
            }
        }
    }

    @ReactMethod
    fun assignAlarmsToSet(alarmIds: ReadableArray, alarmSetId: String?, promise: Promise) {
        scope.launch {
            try {
                ensureRoomDatabase()
                val ids = mutableListOf<String>()
                for (index in 0 until alarmIds.size()) {
                    val id = alarmIds.getString(index)
                    if (id != null) {
                        ids.add(id)
                    }
                }
                val source = dataSource()
                source.assignAlarmsToSet(ids, alarmSetId)
                withContext(Dispatchers.Main) { promise.resolve(null) }
            } catch (error: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("alarm_set_assign_error", error)
                }
            }
        }
    }

    @ReactMethod
    fun createAlarmSetTemplate(templateJson: String, entriesJson: String, promise: Promise) {
        scope.launch {
            try {
                ensureRoomDatabase()
                val templatePayload = dbJson.decodeFromString<AlarmSetPayload>(templateJson)
                val entryPayloads = dbJson.decodeFromString<List<AlarmTemplateEntryPayload>>(entriesJson)
                val source = dataSource()
                val template = AlarmSetTemplateEntity(
                    id = templatePayload.id,
                    label = templatePayload.label,
                    defaultSound = templatePayload.defaultSound,
                    defaultMode = templatePayload.defaultMode,
                    createdAt = templatePayload.createdAt ?: isoNow(),
                )

                val entries = entryPayloads.map { entry ->
                    AlarmTemplateEntity(
                        id = null,
                        templateId = templatePayload.id,
                        label = entry.label ?: "",
                        offsetMinutes = entry.offsetMinutes,
                        repeatDaysMask = encodeWeekdays(entry.repeatDays),
                        skipHolidays = entry.skipHolidays,
                        sound = entry.sound,
                        vibrate = entry.vibrate,
                        policyMode = entry.policyMode ?: "normal",
                        policyPayload = entry.policyPayload,
                    )
                }

                source.upsertAlarmSetTemplate(template)
                if (entries.isNotEmpty()) {
                    source.replaceAlarmTemplates(entries)
                } else {
                    source.deleteAlarmTemplatesByTemplate(templatePayload.id)
                }

                withContext(Dispatchers.Main) { promise.resolve(null) }
            } catch (error: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("alarm_template_create_error", error)
                }
            }
        }
    }

    @ReactMethod
    fun fetchAlarmSetTemplates(promise: Promise) {
        scope.launch {
            try {
                ensureRoomDatabase()
                val templates = dataSource().getAlarmSetTemplates()
                val result = toWritableArray(templates, ::alarmSetTemplateToMap)
                withContext(Dispatchers.Main) { promise.resolve(result) }
            } catch (error: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("alarm_template_fetch_error", error)
                }
            }
        }
    }

    @ReactMethod
    fun fetchAlarmTemplates(templateId: String, promise: Promise) {
        scope.launch {
            try {
                ensureRoomDatabase()
                val entries = dataSource().getAlarmTemplates(templateId)
                val result = toWritableArray(entries, ::alarmTemplateToMap)
                withContext(Dispatchers.Main) { promise.resolve(result) }
            } catch (error: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("alarm_template_entries_error", error)
                }
            }
        }
    }

    @ReactMethod
    fun deleteAlarmTemplate(templateId: String, promise: Promise) {
        scope.launch {
            try {
                ensureRoomDatabase()
                val source = dataSource()
                source.deleteAlarmSetTemplate(templateId)
                withContext(Dispatchers.Main) { promise.resolve(null) }
            } catch (error: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject("alarm_template_delete_error", error)
                }
            }
        }
    }

    @ReactMethod
    fun upsertTodo(payloadJson: String, promise: Promise) {
        scope.launch {
            try {
                ensureRoomDatabase()
                val payload = dbJson.decodeFromString<TodoMutationPayload>(payloadJson)
                val entity = upsertTodoInternal(payload)
                val map = todoToMap(entity)
                withContext(Dispatchers.Main) { promise.resolve(map) }
            } catch (error: Exception) {
                withContext(Dispatchers.Main) { promise.reject("todo_upsert_error", error) }
            }
        }
    }

    @ReactMethod
    fun deleteTodo(id: Double, promise: Promise) {
        scope.launch {
            try {
                ensureRoomDatabase()
                val todoId = id.toLong()
                dataSource().deleteTodo(todoId)
                withContext(Dispatchers.Main) { promise.resolve(null) }
            } catch (error: Exception) {
                withContext(Dispatchers.Main) { promise.reject("todo_delete_error", error) }
            }
        }
    }

    @ReactMethod
    fun fetchAlarms(promise: Promise) {
        scope.launch {
            try {
                ensureRoomDatabase()
                val source = dataSource()
                val alarms = source.getAlarms()
                val result = toWritableArray(alarms, ::alarmToMap)
                withContext(Dispatchers.Main) { promise.resolve(result) }
            } catch (error: Exception) {
                withContext(Dispatchers.Main) { promise.reject("alarm_fetch_error", error) }
            }
        }
    }

    @ReactMethod
    fun insertAlarm(payloadJson: String, promise: Promise) {
        scope.launch {
            try {
                ensureRoomDatabase()
                val payload = dbJson.decodeFromString<AlarmPersistPayload>(payloadJson)
                val entity = payload.toEntity()
                dataSource().upsertAlarm(entity)
                withContext(Dispatchers.Main) { promise.resolve(null) }
            } catch (error: Exception) {
                withContext(Dispatchers.Main) { promise.reject("alarm_insert_error", error) }
            }
        }
    }

    @ReactMethod
    fun updateAlarm(payloadJson: String, promise: Promise) {
        scope.launch {
            try {
                ensureRoomDatabase()
                val payload = dbJson.decodeFromString<AlarmPersistPayload>(payloadJson)
                val entity = payload.toEntity()
                dataSource().upsertAlarm(entity)
                withContext(Dispatchers.Main) { promise.resolve(null) }
            } catch (error: Exception) {
                withContext(Dispatchers.Main) { promise.reject("alarm_update_error", error) }
            }
        }
    }

    @ReactMethod
    fun deleteAlarm(id: String, promise: Promise) {
        scope.launch {
            try {
                ensureRoomDatabase()
                dataSource().deleteAlarm(id)
                withContext(Dispatchers.Main) { promise.resolve(null) }
            } catch (error: Exception) {
                withContext(Dispatchers.Main) { promise.reject("alarm_delete_error", error) }
            }
        }
    }

    @ReactMethod
    fun deleteAlarms(ids: ReadableArray, promise: Promise) {
        scope.launch {
            try {
                ensureRoomDatabase()
                val idList = ids.toStringList()
                if (idList.isNotEmpty()) {
                    dataSource().deleteAlarms(idList)
                }
                withContext(Dispatchers.Main) { promise.resolve(null) }
            } catch (error: Exception) {
                withContext(Dispatchers.Main) { promise.reject("alarm_delete_many_error", error) }
            }
        }
    }

    @ReactMethod
    fun setAlarmEnabled(id: String, enabled: Boolean, promise: Promise) {
        scope.launch {
            try {
                ensureRoomDatabase()
                val source = dataSource()
                val current = source.getAlarm(id)
                val nextTrigger = if (enabled) current?.nextTriggerAt else null
                source.updateAlarmState(id, enabled, nextTrigger)
                withContext(Dispatchers.Main) { promise.resolve(null) }
            } catch (error: Exception) {
                withContext(Dispatchers.Main) { promise.reject("alarm_enable_error", error) }
            }
        }
    }

    @ReactMethod
    fun getAlarmById(id: String, promise: Promise) {
        scope.launch {
            try {
                ensureRoomDatabase()
                val entity = dataSource().getAlarm(id)
                val result = entity?.let { alarmToMap(it) }
                withContext(Dispatchers.Main) { promise.resolve(result) }
            } catch (error: Exception) {
                withContext(Dispatchers.Main) { promise.reject("alarm_get_error", error) }
            }
        }
    }

    @ReactMethod
    fun setAlarmGeofenceZone(
        alarmId: String,
        latitude: Double,
        longitude: Double,
        radius: Int,
        placeName: String?,
        promise: Promise,
    ) {
        scope.launch {
            try {
                ensureRoomDatabase()
                val source = dataSource()
                val existing = source.getGeoFenceZoneByAlarm(alarmId)
                val entity = GeoFenceZoneEntity(
                    id = existing?.id ?: 0L,
                    name = placeName,
                    alarmId = alarmId,
                    latitude = latitude,
                    longitude = longitude,
                    radiusMeters = radius,
                    isActive = true,
                )
                val zoneId = if (existing == null) {
                    source.insertGeoFenceZone(entity)
                } else {
                    source.updateGeoFenceZone(entity.copy(id = existing.id))
                    existing.id ?: 0L
                }
                if (zoneId != 0L) {
                    source.insertGeoFenceHistory(
                        GeoFenceHistoryEntity(
                            zoneId = zoneId,
                            isInside = false,
                        ),
                    )
                }
                withContext(Dispatchers.Main) { promise.resolve(null) }
            } catch (error: Exception) {
                withContext(Dispatchers.Main) { promise.reject("db_set_geofence_error", error) }
            }
        }
    }

    @ReactMethod
    fun removeAlarmGeofenceZone(alarmId: String, promise: Promise) {
        scope.launch {
            try {
                ensureRoomDatabase()
                val source = dataSource()
                val existing = source.getGeoFenceZoneByAlarm(alarmId)
                if (existing != null) {
                    source.clearHistoryForZone(existing.id)
                    source.deleteGeoFenceZone(existing)
                }
                withContext(Dispatchers.Main) { promise.resolve(null) }
            } catch (error: Exception) {
                withContext(Dispatchers.Main) { promise.reject("db_remove_geofence_error", error) }
            }
        }
    }

    @ReactMethod
    fun fetchGeoFenceZones(promise: Promise) {
        scope.launch {
            try {
                ensureRoomDatabase()
                val zones = dataSource().getGeoFenceZones()
                val result = toWritableArray(zones, ::geoFenceZoneToMap)
                withContext(Dispatchers.Main) { promise.resolve(result) }
            } catch (error: Exception) {
                withContext(Dispatchers.Main) { promise.reject("db_fetch_geofence_zones_error", error) }
            }
        }
    }

    @ReactMethod
    fun fetchCategories(promise: Promise) {
        scope.launch {
            try {
                ensureRoomDatabase()
                val categories = dataSource().getCategories()
                val result = toWritableArray(categories, ::categoryToMap)
                withContext(Dispatchers.Main) { promise.resolve(result) }
            } catch (error: Exception) {
                withContext(Dispatchers.Main) { promise.reject("db_fetch_categories_error", error) }
            }
        }
    }

    @ReactMethod
    fun createCategory(name: String, color: String, promise: Promise) {
        scope.launch {
            try {
                ensureRoomDatabase()
                val source = dataSource()
                val insertedId = source.upsertCategory(CategoryEntity(name = name, color = color))
                val created = if (insertedId > 0) {
                    source.findCategoryById(insertedId) ?: CategoryEntity(id = insertedId, name = name, color = color)
                } else {
                    CategoryEntity(name = name, color = color)
                }
                withContext(Dispatchers.Main) { promise.resolve(categoryToMap(created)) }
            } catch (error: Exception) {
                withContext(Dispatchers.Main) { promise.reject("db_create_category_error", error) }
            }
        }
    }

    private suspend fun ensureRoomDatabase() {
        try {
            AlarmRoomDatabase.getInstance(appContext).openHelper.writableDatabase
        } catch (error: IllegalStateException) {
            // Existing SQLite schema mismatched; fallback to deleting the legacy database.
            withContext(Dispatchers.IO) {
                appContext.deleteDatabase("schedule.db")
            }
            AlarmRoomDatabase.getInstance(appContext).openHelper.writableDatabase
        }
    }

    private fun <T> toWritableArray(items: List<T>, mapper: (T) -> WritableMap): WritableArray {
        val array = Arguments.createArray()
        items.forEach { item -> array.pushMap(mapper(item)) }
        return array
    }

    private fun todoToMap(entity: TodoEntity): WritableMap = Arguments.createMap().apply {
        if (entity.id != null) putDouble("id", entity.id.toDouble()) else putNull("id")
        putString("title", entity.title)
        if (entity.description != null) putString("description", entity.description) else putNull("description")
        if (entity.dueDate != null) putString("due_date", entity.dueDate) else putNull("due_date")
        if (entity.dueTime != null) putString("due_time", entity.dueTime) else putNull("due_time")
        putBoolean("is_repeating", entity.isRepeating)
        if (entity.repeatType != null) putString("repeat_type", entity.repeatType) else putNull("repeat_type")
        putInt("repeat_weekday", entity.repeatWeekdayMask)
        if (entity.repeatDayOfMonth != null) putInt("repeat_day_of_month", entity.repeatDayOfMonth) else putNull("repeat_day_of_month")
        if (entity.ddayId != null) putDouble("dday_id", entity.ddayId.toDouble()) else putNull("dday_id")
        if (entity.alarmId != null) putString("alarm_id", entity.alarmId) else putNull("alarm_id")
        if (entity.alarmSetId != null) putString("alarm_set_id", entity.alarmSetId) else putNull("alarm_set_id")
        if (entity.categoryId != null) putDouble("category_id", entity.categoryId.toDouble()) else putNull("category_id")
        if (entity.createdAt != null) putString("created_at", entity.createdAt) else putNull("created_at")
    }

    private fun alarmToMap(entity: AlarmEntity): WritableMap = Arguments.createMap().apply {
        putString("id", entity.id)
        if (entity.alarmSetId != null) putString("alarm_set_id", entity.alarmSetId) else putNull("alarm_set_id")
        if (entity.ddayId != null) putDouble("dday_id", entity.ddayId.toDouble()) else putNull("dday_id")
        if (entity.categoryId != null) putDouble("category_id", entity.categoryId.toDouble()) else putNull("category_id")
        putString("label", entity.label)
        putInt("hour", entity.hour)
        putInt("minute", entity.minute)
        putInt("repeat_days", entity.repeatDaysMask)
        putBoolean("skip_holidays", entity.skipHolidays)
        putString("sound", entity.sound)
        putBoolean("vibrate", entity.vibrate)
        putBoolean("enabled", entity.enabled)
        if (entity.nextTriggerAt != null) putDouble("next_trigger_at", entity.nextTriggerAt.toDouble()) else putNull("next_trigger_at")
        putString("policy_mode", entity.policyMode)
        if (entity.policyPayload != null) putString("policy_payload", entity.policyPayload) else putNull("policy_payload")
    }

    private fun alarmSetToMap(entity: AlarmSetEntity): WritableMap = Arguments.createMap().apply {
        putString("id", entity.id)
        putString("label", entity.label)
        putString("default_sound", entity.defaultSound)
        putString("default_mode", entity.defaultMode)
    }

    private fun alarmSetTemplateToMap(entity: AlarmSetTemplateEntity): WritableMap = Arguments.createMap().apply {
        putString("id", entity.id)
        putString("label", entity.label)
        putString("default_sound", entity.defaultSound)
        putString("default_mode", entity.defaultMode)
        if (entity.createdAt != null) putString("created_at", entity.createdAt) else putNull("created_at")
    }

    private fun alarmTemplateToMap(entity: AlarmTemplateEntity): WritableMap = Arguments.createMap().apply {
        if (entity.id != null) putDouble("id", entity.id.toDouble()) else putNull("id")
        putString("template_id", entity.templateId)
        putString("label", entity.label)
        putInt("offset_minutes", entity.offsetMinutes)
        putInt("repeat_days", entity.repeatDaysMask)
        putBoolean("skip_holidays", entity.skipHolidays)
        putString("sound", entity.sound)
        putBoolean("vibrate", entity.vibrate)
        putString("policy_mode", entity.policyMode)
        if (entity.policyPayload != null) putString("policy_payload", entity.policyPayload) else putNull("policy_payload")
    }

    private fun ddayToMap(entity: DDayEntity): WritableMap = Arguments.createMap().apply {
        putDouble("id", entity.id.toDouble())
        if (entity.todoId != null) putDouble("todo_id", entity.todoId.toDouble()) else putNull("todo_id")
        putString("target_date", entity.targetDate)
    }

    private fun todoAlarmRelationToMap(entity: TodoAlarmRelationEntity): WritableMap =
        Arguments.createMap().apply {
            if (entity.id != null) putDouble("id", entity.id.toDouble()) else putNull("id")
            putDouble("todo_id", entity.todoId.toDouble())
            putString("alarm_id", entity.alarmId)
            putInt("offset_minutes", entity.offsetMinutes)
            putInt("order_index", entity.orderIndex)
        }

    private fun geoFenceZoneToMap(entity: GeoFenceZoneEntity): WritableMap = Arguments.createMap().apply {
        if (entity.id != null) putDouble("id", entity.id.toDouble()) else putNull("id")
        if (entity.name != null) putString("name", entity.name) else putNull("name")
        putString("alarm_id", entity.alarmId)
        putDouble("latitude", entity.latitude)
        putDouble("longitude", entity.longitude)
        putInt("radius", entity.radiusMeters)
        putBoolean("is_active", entity.isActive)
    }

    private fun geoFenceHistoryToMap(entity: GeoFenceHistoryEntity): WritableMap = Arguments.createMap().apply {
        if (entity.id != null) putDouble("id", entity.id.toDouble()) else putNull("id")
        putDouble("zone_id", entity.zoneId.toDouble())
        putBoolean("state", entity.isInside)
    }

    private fun categoryToMap(entity: CategoryEntity): WritableMap = Arguments.createMap().apply {
        putDouble("id", entity.id.toDouble())
        putString("name", entity.name)
        putString("color", entity.color)
    }

    private suspend fun upsertTodoInternal(payload: TodoMutationPayload): TodoEntity {
        val database = AlarmRoomDatabase.getInstance(appContext)
        return database.withTransaction {
            val todoDao = database.todoDao()
            val dDayDao = database.dDayDao()

            val repeatMask = encodeWeekdays(payload.repeatWeekdays)
            val entity = TodoEntity(
                id = payload.id,
                title = payload.title,
                description = null,
                dueDate = payload.dueDate,
                dueTime = payload.dueTime,
                isRepeating = payload.isRepeating,
                repeatType = payload.repeatType,
                repeatWeekdayMask = repeatMask,
                repeatDayOfMonth = payload.repeatDayOfMonth,
                ddayId = payload.ddayId,
                alarmId = payload.alarmId,
                alarmSetId = payload.alarmSetId,
                categoryId = payload.categoryId,
                createdAt = null,
            )

            val insertedId = todoDao.upsert(entity)
            val actualId = payload.id ?: insertedId
            var currentTodo = todoDao.findById(actualId) ?: entity.copy(id = actualId)

            if (payload.isDDay) {
                val targetDate = payload.dueDate ?: ""
                val currentDdayId = currentTodo.ddayId
                val updatedDdayId = if (currentDdayId != null) {
                    dDayDao.upsert(DDayEntity(id = currentDdayId, todoId = actualId, targetDate = targetDate))
                    currentDdayId
                } else {
                    dDayDao.upsert(DDayEntity(todoId = actualId, targetDate = targetDate))
                }

                if (currentTodo.ddayId != updatedDdayId) {
                    todoDao.upsert(currentTodo.copy(ddayId = updatedDdayId))
                    currentTodo = todoDao.findById(actualId) ?: currentTodo.copy(ddayId = updatedDdayId)
                }
            } else if (currentTodo.ddayId != null) {
                dDayDao.deleteById(currentTodo.ddayId)
                todoDao.upsert(currentTodo.copy(ddayId = null))
                currentTodo = todoDao.findById(actualId) ?: currentTodo.copy(ddayId = null)
            }

            todoDao.findById(actualId) ?: currentTodo
        }
    }

    private fun isoNow(): String {
        val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        formatter.timeZone = java.util.TimeZone.getTimeZone("UTC")
        return formatter.format(Date())
    }

    private fun filterTodosForDate(todos: List<TodoEntity>, targetDate: String): List<TodoEntity> {
        val calendar = parseDate(targetDate)
        if (calendar != null) {
            val weekday = (calendar.get(Calendar.DAY_OF_WEEK) + 6) % 7
            val dayOfMonth = calendar.get(Calendar.DAY_OF_MONTH)
            return todos.filter { entity ->
                if (entity.isRepeating) {
                    when (entity.repeatType) {
                        "weekly" -> maskHasDay(entity.repeatWeekdayMask, weekday)
                        "monthly" -> entity.repeatDayOfMonth == dayOfMonth
                        else -> false
                    }
                } else {
                    entity.dueDate == targetDate
                }
            }
        }

        return todos.filter { entity -> entity.dueDate == targetDate }
    }

    private fun parseDate(value: String): Calendar? {
        return try {
            val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            val date = formatter.parse(value) ?: return null
            return Calendar.getInstance().apply { time = date }
        } catch (_: ParseException) {
            null
        }
    }

    private fun AlarmPersistPayload.toEntity(): AlarmEntity = AlarmEntity(
        id = id,
        alarmSetId = alarmSetId,
        ddayId = ddayId,
        categoryId = categoryId,
        label = label,
        hour = hour,
        minute = minute,
        repeatDaysMask = encodeWeekdays(repeatDays),
        skipHolidays = skipHolidays,
        sound = sound,
        vibrate = vibrate,
        enabled = enabled,
        nextTriggerAt = nextTriggerAt,
        policyMode = policyMode ?: "normal",
        policyPayload = policyPayload,
    )

    private fun ReadableArray.toStringList(): List<String> {
        val list = mutableListOf<String>()
        for (index in 0 until size()) {
            getString(index)?.let { list.add(it) }
        }
        return list
    }
}
