package com.alarm_project.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != AlarmConstants.ACTION_TRIGGER) return

        val alarmId = intent.getStringExtra(AlarmConstants.EXTRA_ALARM_ID) ?: return
        val spec = AlarmStore.get(context, alarmId)

        val serviceIntent = Intent(context, AlarmService::class.java).apply {
            action = AlarmConstants.ACTION_TRIGGER
            putExtra(AlarmConstants.EXTRA_ALARM_ID, alarmId)
            if (spec != null) {
                putExtra(AlarmConstants.EXTRA_SPEC_JSON, AlarmJson.encodeSpec(spec))
            }
        }
        ContextCompat.startForegroundService(context, serviceIntent)
    }
}
