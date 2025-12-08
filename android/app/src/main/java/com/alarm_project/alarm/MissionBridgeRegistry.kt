package com.alarm_project.alarm

import android.os.Handler
import android.os.Looper
import java.util.concurrent.CopyOnWriteArraySet

interface MissionCompletionListener {
    fun onMissionCompleted()
}

object MissionBridgeRegistry {
    private val listeners = CopyOnWriteArraySet<MissionCompletionListener>()
    private val mainHandler = Handler(Looper.getMainLooper())

    fun register(listener: MissionCompletionListener) {
        listeners.add(listener)
    }

    fun unregister(listener: MissionCompletionListener) {
        listeners.remove(listener)
    }

    fun notifyMissionCompleted() {
        if (listeners.isEmpty()) return
        mainHandler.post {
            listeners.forEach { it.onMissionCompleted() }
        }
    }
}
