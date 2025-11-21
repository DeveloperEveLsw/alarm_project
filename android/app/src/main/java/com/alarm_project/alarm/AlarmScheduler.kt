package com.alarm_project.alarm

import android.app.AlarmManager.AlarmClockInfo
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import com.alarm_project.MainActivity

object AlarmScheduler {
    fun schedule(context: Context, spec: AlarmSpec) {
        val alarmManager = ContextCompat.getSystemService(context, AlarmManager::class.java)
            ?: throw IllegalStateException("AlarmManager unavailable")

        val triggerAt = spec.fireAt
        val alarmIntent = buildAlarmIntent(context, spec.id)
        val showIntent = PendingIntent.getActivity(
            context,
            spec.id.hashCode(),
            Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("alarm_id", spec.id)
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val alarmClockInfo = AlarmClockInfo(triggerAt, showIntent)

        if (spec.allowWhileIdle) {
            alarmManager.setAlarmClock(alarmClockInfo, alarmIntent)
        } else if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, alarmIntent)
        } else {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, alarmIntent)
        }
    }

    fun cancel(context: Context, id: String) {
        val alarmManager = ContextCompat.getSystemService(context, AlarmManager::class.java)
            ?: return
        val alarmIntent = buildAlarmIntent(context, id)
        alarmManager.cancel(alarmIntent)
    }

    private fun buildAlarmIntent(context: Context, id: String): PendingIntent {
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = AlarmConstants.ACTION_TRIGGER
            putExtra(AlarmConstants.EXTRA_ALARM_ID, id)
        }
        return PendingIntent.getBroadcast(
            context,
            id.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}

