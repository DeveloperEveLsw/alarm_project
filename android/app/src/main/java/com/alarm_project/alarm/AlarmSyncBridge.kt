package com.alarm_project.alarm

import android.content.Context

object AlarmSyncBridge {
    private const val STORAGE_SCOPE = "storage"

    fun notifyStorageChanged(context: Context, id: String = "*") {
        AlarmEventDispatcher.send(context, SyncEvent(id, STORAGE_SCOPE))
    }
}
