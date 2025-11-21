package com.alarm_project.alarm

import android.content.Context
import android.util.Log
import com.alarm_project.alarm.data.local.AlarmRoomDatabase
import com.alarm_project.alarm.data.local.repository.AlarmLocalDataSource
import kotlinx.coroutines.runBlocking
import java.util.Calendar

object AlarmDatabase {
    private const val TAG = "AlarmDatabase"

    private fun dataSource(context: Context): AlarmLocalDataSource {
        val database = AlarmRoomDatabase.getInstance(context)
        return AlarmLocalDataSource(database)
    }

    fun setEnabled(context: Context, alarmId: String, enabled: Boolean) {
        runBlocking {
            val source = dataSource(context)
            runCatching { source.updateEnabled(alarmId, enabled) }
                .onFailure { error -> Log.w(TAG, "Failed to update enabled for $alarmId", error) }
        }
    }

    fun updateNextTrigger(context: Context, alarmId: String, nextTriggerAt: Long?) {
        runBlocking {
            updateState(context, alarmId, nextTriggerAt != null, nextTriggerAt)
        }
    }

    private suspend fun updateState(
        context: Context,
        alarmId: String,
        enabled: Boolean,
        nextTriggerAt: Long?,
    ) {
        val source = dataSource(context)
        runCatching { source.updateAlarmState(alarmId, enabled, nextTriggerAt) }
            .onFailure { error -> Log.w(TAG, "Failed to update alarm state for $alarmId", error) }
    }

    fun computeNextFireAt(context: Context, alarmId: String, baseTimeMillis: Long): Long? {
        return runBlocking {
            val source = dataSource(context)
            val entity = source.getAlarm(alarmId)
            if (entity == null) {
                Log.d(TAG, "Alarm $alarmId not found when computing next fire")
                return@runBlocking null
            }

            val repeatDays = decodeRepeatMask(entity.repeatDaysMask)
            if (repeatDays.isEmpty()) {
                return@runBlocking null
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
                    set(Calendar.HOUR_OF_DAY, entity.hour)
                    set(Calendar.MINUTE, entity.minute)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }

                if (offset == 0 && candidate.timeInMillis <= baseCalendar.timeInMillis) {
                    continue
                }

                return@runBlocking candidate.timeInMillis
            }

            null
        }
    }

    private fun decodeRepeatMask(mask: Int): List<Int> {
        if (mask == 0) return emptyList()
        val days = mutableListOf<Int>()
        for (day in 0..6) {
            if ((mask shr day) and 0x1 == 1) {
                days += day
            }
        }
        return days
    }
}
