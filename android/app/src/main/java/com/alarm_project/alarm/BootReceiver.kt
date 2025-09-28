package com.alarm_project.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != Intent.ACTION_BOOT_COMPLETED) return
        val specs = AlarmStore.list(context)
        specs.forEach { spec ->
            runCatching { AlarmScheduler.schedule(context, spec) }
                .onFailure { error ->
                    AlarmEventDispatcher.send(context, ErrorEvent(spec.id, "boot_reschedule_failed", error.message ?: ""))
                }
        }
    }
}
