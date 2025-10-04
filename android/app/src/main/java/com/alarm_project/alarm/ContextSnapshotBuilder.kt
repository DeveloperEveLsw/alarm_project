package com.alarm_project.alarm

import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioManager
import android.os.BatteryManager
import android.os.Build
import android.os.PowerManager
import androidx.core.content.ContextCompat
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import java.util.TimeZone
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive

data class LockStateSnapshot(
    val isScreenOn: Boolean,
    val isKeyguardLocked: Boolean,
)

class ContextSnapshotBuilder(private val context: Context) {
    suspend fun build(spec: AlarmSpec, firedAt: Long): ContextSnapshot = coroutineScope {
        val locationDeferred = async { LocationProvider(context).getFreshLocation() }
        val deviceSnapshot = buildDeviceSnapshot()
        val lockStateSnapshot = getLockStateSnapshot()

        ContextSnapshot(
            specId = spec.id,
            firedAtUtc = firedAt,
            receivedAtUtc = System.currentTimeMillis(),
            policy = spec.policy,
            device = deviceSnapshot,
            location = locationDeferred.await(),
            extras = lockStateSnapshot.toJsonExtras(),
        )
    }

    private fun buildDeviceSnapshot(): DeviceSnapshot {
        val audioManager = ContextCompat.getSystemService(context, AudioManager::class.java)
        val powerManager = ContextCompat.getSystemService(context, PowerManager::class.java)

        val batteryStatus = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val batteryLevel = batteryStatus?.let { intent ->
            val level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
            val scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
            if (level >= 0 && scale > 0) level.toDouble() / scale else 0.0
        } ?: 0.0

        val isPowerSave = if (powerManager != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) powerManager.isPowerSaveMode else false
        } else {
            false
        }

        val isScreenOn = powerManager?.isInteractive ?: true
        val musicVolume = audioManager?.getStreamVolume(AudioManager.STREAM_MUSIC) ?: 0
        val musicVolumeMax = audioManager?.getStreamMaxVolume(AudioManager.STREAM_MUSIC) ?: 1
        val ringerMode = when (audioManager?.ringerMode) {
            AudioManager.RINGER_MODE_SILENT -> "silent"
            AudioManager.RINGER_MODE_VIBRATE -> "vibrate"
            AudioManager.RINGER_MODE_NORMAL -> "normal"
            else -> "unknown"
        }

        return DeviceSnapshot(
            timezone = TimeZone.getDefault().id,
            isScreenOn = isScreenOn,
            batteryLevel = batteryLevel,
            isPowerSaveMode = isPowerSave,
            ringerMode = ringerMode,
            musicVolume = musicVolume,
            musicVolumeMax = musicVolumeMax
        )
    }

    fun getLockStateSnapshot(): LockStateSnapshot {
        val keyguardManager = ContextCompat.getSystemService(context, KeyguardManager::class.java)
        val powerManager = ContextCompat.getSystemService(context, PowerManager::class.java)
        val isScreenOn = powerManager?.isInteractive ?: false
        val isKeyguardLocked = keyguardManager?.isKeyguardLocked ?: false
        return LockStateSnapshot(isScreenOn, isKeyguardLocked)
    }

    private fun LockStateSnapshot.toJsonExtras(): Map<String, JsonElement> {
        return mapOf(
            "isScreenOn" to JsonPrimitive(isScreenOn),
            "isKeyguardLocked" to JsonPrimitive(isKeyguardLocked),
        )
    }
}
