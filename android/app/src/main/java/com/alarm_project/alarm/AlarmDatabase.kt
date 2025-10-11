package com.alarm_project.alarm

import android.content.ContentValues
import android.content.Context
import android.database.SQLException
import android.database.sqlite.SQLiteDatabase
import android.util.Log
import org.json.JSONArray
import java.io.File
import java.util.Calendar

object AlarmDatabase {
    private const val TAG = "AlarmDatabase"
    private const val DATABASE_NAME = "schedule.db"
    private const val TABLE_ALARM = "Alarm"

    private data class AlarmRecord(
        val id: String,
        val hour: Int,
        val minute: Int,
        val repeatDays: List<Int>,
    )

    private fun getDatabaseFile(context: Context): File? = context.getDatabasePath(DATABASE_NAME)

    private inline fun withDatabase(context: Context, block: (SQLiteDatabase) -> Unit) {
        val dbFile = getDatabaseFile(context)
        if (dbFile == null || !dbFile.exists()) {
            Log.d(TAG, "Database file not found: ${dbFile?.path ?: "<null>"}")
            return
        }

        var database: SQLiteDatabase? = null
        try {
            database = SQLiteDatabase.openDatabase(dbFile.path, null, SQLiteDatabase.OPEN_READWRITE)
            block(database)
        } catch (error: SQLException) {
            Log.w(TAG, "Failed to operate on database", error)
        } finally {
            runCatching { database?.close() }
        }
    }

    fun setEnabled(context: Context, alarmId: String, enabled: Boolean) {
        withDatabase(context) { db ->
            val values = ContentValues().apply { put("enabled", if (enabled) 1 else 0) }
            val rows = db.update(TABLE_ALARM, values, "id = ?", arrayOf(alarmId))
            if (rows == 0) {
                Log.d(TAG, "No rows updated for alarmId=$alarmId when setting enabled=$enabled")
            }
        }
    }

    fun updateNextTrigger(context: Context, alarmId: String, nextTriggerAt: Long?) {
        withDatabase(context) { db ->
            val values = ContentValues().apply {
                if (nextTriggerAt != null) {
                    put("next_trigger_at", nextTriggerAt)
                    put("enabled", 1)
                } else {
                    put("next_trigger_at", null as Long?)
                    put("enabled", 0)
                }
            }
            val rows = db.update(TABLE_ALARM, values, "id = ?", arrayOf(alarmId))
            if (rows == 0) {
                Log.d(TAG, "No rows updated for alarmId=$alarmId when updating next_trigger_at=$nextTriggerAt")
            }
        }
    }

    fun computeNextFireAt(context: Context, alarmId: String, baseTimeMillis: Long): Long? {
        val record = getAlarmRecord(context, alarmId) ?: return null
        val repeatDays = record.repeatDays.sorted()
        if (repeatDays.isEmpty()) {
            return null
        }

        val baseCalendar = Calendar.getInstance().apply {
            timeInMillis = baseTimeMillis + 1_000
        }
        val today = (baseCalendar.get(Calendar.DAY_OF_WEEK) + 6) % 7

        for (offset in 0..7) {
            val targetDay = (today + offset) % 7
            if (!repeatDays.contains(targetDay)) continue

            val candidate = (baseCalendar.clone() as Calendar).apply {
                add(Calendar.DAY_OF_YEAR, offset)
                set(Calendar.HOUR_OF_DAY, record.hour)
                set(Calendar.MINUTE, record.minute)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }

            if (offset == 0 && candidate.timeInMillis <= baseCalendar.timeInMillis) {
                continue
            }

            return candidate.timeInMillis
        }

        return null
    }

    private fun getAlarmRecord(context: Context, alarmId: String): AlarmRecord? {
        var record: AlarmRecord? = null
        withDatabase(context) { db ->
            val cursor = db.query(
                TABLE_ALARM,
                arrayOf("id", "hour", "minute", "repeat_days"),
                "id = ?",
                arrayOf(alarmId),
                null,
                null,
                null,
                "1",
            )

            cursor.use { c ->
                if (c != null && c.moveToFirst()) {
                    record = AlarmRecord(
                        id = c.getString(c.getColumnIndexOrThrow("id")),
                        hour = c.getInt(c.getColumnIndexOrThrow("hour")),
                        minute = c.getInt(c.getColumnIndexOrThrow("minute")),
                        repeatDays = parseRepeatDays(c.getString(c.getColumnIndexOrThrow("repeat_days"))),
                    )
                }
            }
        }
        return record
    }

    private fun parseRepeatDays(raw: String?): List<Int> {
        if (raw.isNullOrBlank()) return emptyList()
        return runCatching {
            val array = JSONArray(raw)
            List(array.length()) { index -> array.getInt(index) }
        }.getOrElse { error ->
            Log.w(TAG, "Failed to parse repeat_days: $raw", error)
            emptyList()
        }
    }
}
