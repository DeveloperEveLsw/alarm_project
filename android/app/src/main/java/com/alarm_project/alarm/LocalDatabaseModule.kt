package com.alarm_project.alarm

import androidx.room.withTransaction
import com.alarm_project.alarm.data.local.AlarmRoomDatabase
import com.alarm_project.alarm.data.local.entity.AlarmEntity
import com.alarm_project.alarm.data.local.entity.AlarmSetEntity
import com.alarm_project.alarm.data.local.entity.DDayEntity
import com.alarm_project.alarm.data.local.entity.TodoEntity
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
                val result = Arguments.createMap().apply {
                    putArray("Todo", toWritableArray(source.getTodos(), ::todoToMap))
                    putArray("Dday", toWritableArray(source.getDDays(), ::ddayToMap))
                    putArray("AlarmSet", toWritableArray(source.getAlarmSets(), ::alarmSetToMap))
                    putArray("Alarm", toWritableArray(source.getAlarms(), ::alarmToMap))
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
        if (entity.createdAt != null) putString("created_at", entity.createdAt) else putNull("created_at")
    }

    private fun alarmToMap(entity: AlarmEntity): WritableMap = Arguments.createMap().apply {
        putString("id", entity.id)
        if (entity.alarmSetId != null) putString("alarm_set_id", entity.alarmSetId) else putNull("alarm_set_id")
        if (entity.ddayId != null) putDouble("dday_id", entity.ddayId.toDouble()) else putNull("dday_id")
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

    private fun ddayToMap(entity: DDayEntity): WritableMap = Arguments.createMap().apply {
        putDouble("id", entity.id.toDouble())
        if (entity.todoId != null) putDouble("todo_id", entity.todoId.toDouble()) else putNull("todo_id")
        putString("target_date", entity.targetDate)
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
