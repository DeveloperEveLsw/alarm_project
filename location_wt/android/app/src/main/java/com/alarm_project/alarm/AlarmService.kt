package com.alarm_project.alarm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * Foreground service used to react to geofence transitions.
 * Currently it just surfaces a notification and logs the trigger payload.
 */
class AlarmService : Service() {

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        ensureChannel()
        val payload = intent?.extras
        Log.d(TAG, "Starting AlarmService with extras: $payload")

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Geofence Triggered")
            .setContentText(intent?.action ?: "com.alarm_project.alarm.GEOFENCE_TRIGGER")
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setOngoing(false)
            .build()

        startForeground(NOTIFICATION_ID, notification)

        // TODO: connect to alarm workflow once integration is defined.
        stopSelfResult(startId)
        return START_NOT_STICKY
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(NotificationManager::class.java)
            if (manager?.getNotificationChannel(CHANNEL_ID) == null) {
                manager?.createNotificationChannel(
                    NotificationChannel(
                        CHANNEL_ID,
                        "Geofence Alarm",
                        NotificationManager.IMPORTANCE_LOW,
                    ),
                )
            }
        }
    }

    companion object {
        private const val TAG = "AlarmService"
        private const val CHANNEL_ID = "geo_channel"
        private const val NOTIFICATION_ID = 1002
    }
}
