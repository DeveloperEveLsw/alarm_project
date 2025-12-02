package com.alarm_project.alarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.alarm_project.R
import java.util.ArrayList
import java.util.Locale

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
        val requiresChallenge = requiresChallenge(spec)
        val alarmActivityIntent = Intent(context, AlarmActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("alarm_id", spec.id)
            putExtra(AlarmConstants.EXTRA_REQUIRES_CHALLENGE, requiresChallenge)
            if (requiresChallenge) {
                putExtra("policy_mode", spec.policy.mode.name.lowercase(Locale.US))
                val policyPayload = spec.metadata?.get("policy_payload") ?: spec.payload?.get("policy_payload")
                policyPayload?.let { putExtra("policy_payload", it) }
                spec.policy.snoozeMinutes?.let { minutes ->
                    putIntegerArrayListExtra("policy_snooze_minutes", ArrayList(minutes))
                }
            }
        }

        val alarmActivityPendingIntent = PendingIntent.getActivity(
            context,
            spec.id.hashCode(),
            alarmActivityIntent,
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
            .setContentIntent(alarmActivityPendingIntent)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(false)
            .setOngoing(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOnlyAlertOnce(true)

        val dismissIntent = AlarmEngineModuleHelper.createCommandPendingIntent(
            context,
            buildActionRequestCode(spec.id, "dismiss"),
            DismissCommand(spec.id)
        )
        val snoozeIntent = AlarmEngineModuleHelper.createCommandPendingIntent(
            context,
            buildActionRequestCode(spec.id, "snooze"),
            SnoozeCommand(spec.id, null)
        )

        builder.addAction(
            NotificationCompat.Action(
                android.R.drawable.ic_menu_recent_history,
                context.getString(R.string.alarm_action_snooze),
                snoozeIntent,
            )
        )
        builder.addAction(
            NotificationCompat.Action(
                android.R.drawable.ic_menu_close_clear_cancel,
                context.getString(R.string.alarm_action_dismiss),
                dismissIntent,
            )
        )

        if (isRinging) {
            builder.setPriority(NotificationCompat.PRIORITY_MAX)
            builder.setFullScreenIntent(alarmActivityPendingIntent, fullScreen)
            builder.setDefaults(NotificationCompat.DEFAULT_VIBRATE)
            if (!fullScreen) {
                val remoteViews = RemoteViews(context.packageName, R.layout.notification_alarm_heads_up).apply {
                    val title = spec.label ?: context.getString(R.string.alarm_notification_heads_up_title)
                    setTextViewText(R.id.alarm_heads_up_title, title)
                    setTextViewText(R.id.alarm_heads_up_message, context.getString(R.string.alarm_notification_heads_up_message))
                    setOnClickPendingIntent(R.id.alarm_heads_up_snooze, snoozeIntent)
                    setOnClickPendingIntent(R.id.alarm_heads_up_dismiss, dismissIntent)
                }
                builder.setStyle(NotificationCompat.DecoratedCustomViewStyle())
                builder.setCustomContentView(remoteViews)
                builder.setCustomHeadsUpContentView(remoteViews)
                builder.setCustomBigContentView(remoteViews)
            }
        } else {
            builder.setPriority(NotificationCompat.PRIORITY_HIGH)
        }

        return builder.build()
    }

    fun notifyEvent(context: Context, notificationId: Int, notification: Notification) {
        NotificationManagerCompat.from(context).notify(notificationId, notification)
    }

    private fun buildActionRequestCode(id: String, suffix: String): Int {
        return (id + suffix).hashCode()
    }

    private fun requiresChallenge(spec: AlarmSpec): Boolean {
        return when (spec.policy.mode) {
            AlarmMode.MATH,
            AlarmMode.SHAKE,
            AlarmMode.PUZZLE -> true
            else -> {
                val metaMode = spec.metadata?.get("policyMode")
                metaMode.equals("math", ignoreCase = true) ||
                    metaMode.equals("shake", ignoreCase = true) ||
                    metaMode.equals("puzzle", ignoreCase = true)
            }
        }
    }
}
