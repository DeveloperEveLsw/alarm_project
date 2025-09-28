package com.alarm_project.alarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.alarm_project.MainActivity
import com.alarm_project.R

object AlarmNotifications {
    fun ensureChannels(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val manager = context.getSystemService(NotificationManager::class.java) ?: return

        val alarmChannel = NotificationChannel(
            AlarmConstants.NOTIFICATION_CHANNEL_ALARMS,
            context.getString(R.string.alarm_channel_name_alarms),
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = context.getString(R.string.alarm_channel_description_alarms)
            setSound(null, null)
            enableVibration(true)
            lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
        }

        val silentChannel = NotificationChannel(
            AlarmConstants.NOTIFICATION_CHANNEL_SILENT,
            context.getString(R.string.alarm_channel_name_silent),
            NotificationManager.IMPORTANCE_MIN
        ).apply {
            description = context.getString(R.string.alarm_channel_description_silent)
            setSound(null, null)
            enableVibration(false)
        }

        manager.createNotificationChannel(alarmChannel)
        manager.createNotificationChannel(silentChannel)
    }

    fun buildForeground(
        context: Context,
        spec: AlarmSpec,
        isRinging: Boolean,
        fullScreen: Boolean,
        channelOverride: AlarmChannel? = null
    ): Notification {
        ensureChannels(context)
        val targetIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("alarm_id", spec.id)
        }

        val contentIntent = PendingIntent.getActivity(
            context,
            spec.id.hashCode(),
            targetIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val channelId = when (channelOverride ?: spec.channel) {
            AlarmChannel.SILENT -> AlarmConstants.NOTIFICATION_CHANNEL_SILENT
            AlarmChannel.ALARMS -> AlarmConstants.NOTIFICATION_CHANNEL_ALARMS
        }

        val builder = NotificationCompat.Builder(context, channelId)
            .setContentTitle(spec.label ?: context.getString(R.string.alarm_notification_title))
            .setContentText(context.getString(R.string.alarm_notification_body))
            .setSmallIcon(R.drawable.ic_stat_alarm)
            .setContentIntent(contentIntent)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(false)
            .setOngoing(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOnlyAlertOnce(true)

        if (isRinging) {
            builder.setPriority(NotificationCompat.PRIORITY_MAX)
            builder.setFullScreenIntent(contentIntent, fullScreen)
            builder.setDefaults(NotificationCompat.DEFAULT_VIBRATE)
        } else {
            builder.setPriority(NotificationCompat.PRIORITY_HIGH)
        }

        return builder.build()
    }

    fun notifyEvent(context: Context, notificationId: Int, notification: Notification) {
        NotificationManagerCompat.from(context).notify(notificationId, notification)
    }
}
