package com.alarm_project.alarm

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.content.ContextCompat

object AlarmEngineModuleHelper {
    fun sendDismiss(context: Context, alarmId: String) {
        sendCommand(context, DismissCommand(alarmId))
    }

    fun sendSnooze(context: Context, alarmId: String, minutes: Int? = null) {
        sendCommand(context, SnoozeCommand(alarmId, minutes))
    }

    fun sendStopNative(context: Context) {
        sendCommand(context, StopNativeCommand("native"))
    }

    fun createCommandPendingIntent(
        context: Context,
        requestCode: Int,
        command: EngineCommand,
    ): PendingIntent {
        val flagsBase = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        val flags = flagsBase or PendingIntent.FLAG_UPDATE_CURRENT
        val intent = buildCommandIntent(context, command)
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            PendingIntent.getForegroundService(context, requestCode, intent, flags)
        } else {
            PendingIntent.getService(context, requestCode, intent, flags)
        }
    }

    private fun sendCommand(context: Context, command: EngineCommand) {
        val intent = buildCommandIntent(context, command)
        ContextCompat.startForegroundService(context, intent)
    }

    private fun buildCommandIntent(context: Context, command: EngineCommand): Intent {
        val commandJson = AlarmJson.encodeCommand(command)
        return Intent(context, AlarmService::class.java).apply {
            action = AlarmConstants.ACTION_COMMAND
            putExtra(AlarmConstants.EXTRA_COMMAND_JSON, commandJson)
        }
    }
}
