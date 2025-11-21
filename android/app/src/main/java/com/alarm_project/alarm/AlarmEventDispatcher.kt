package com.alarm_project.alarm

import android.content.Context
import android.content.Intent

object AlarmEventDispatcher {
    fun send(context: Context, event: AlarmEvent) {
        val intent = Intent(AlarmConstants.ACTION_ALARM_EVENT)
            .setPackage(context.packageName)
            .putExtra(AlarmConstants.EXTRA_EVENT_JSON, AlarmJson.encodeEvent(event))
        context.sendBroadcast(intent)
    }
}
