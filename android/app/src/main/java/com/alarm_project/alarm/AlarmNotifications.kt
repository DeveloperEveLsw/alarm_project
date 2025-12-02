package com.alarm_project.alarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.alarm_project.R
import java.util.ArrayList
import java.util.Date
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
        channelOverride: AlarmChannel? = null,
        showLegacyHeadsUp: Boolean = false,
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
            spec.label?.let { putExtra("alarm_label", it) }
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

        val hasLabel = !spec.label.isNullOrBlank()
        val fallbackTitle = context.getString(R.string.alarm_notification_title)
        val contentTitle = spec.label?.takeIf { it.isNotBlank() } ?: fallbackTitle

        val builder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.drawable.ic_stat_alarm)
            .setContentIntent(alarmActivityPendingIntent)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(false)
            .setOngoing(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOnlyAlertOnce(true)

        if (isRinging && !fullScreen) {
            builder.setContentTitle(contentTitle)
            builder.setContentText(formatFireTime(context, spec.fireAt))
        } else {
            builder.setContentTitle(contentTitle)
            builder.setContentText(context.getString(R.string.alarm_notification_body))
        }

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

        if (!isRinging || fullScreen) {
            builder.addAction(
                NotificationCompat.Action(
                    android.R.drawable.ic_menu_recent_history,
                    context.getString(R.string.alarm_action_snooze),
                    snoozeIntent,
                )
            )
        }

        builder.addAction(
            NotificationCompat.Action(
                android.R.drawable.ic_menu_close_clear_cancel,
                context.getString(R.string.alarm_action_dismiss),
                dismissIntent,
            )
        )

        if (isRinging && showLegacyHeadsUp && !fullScreen) {
            Log.d("AlarmNotifications", "Using legacy heads-up layout for alarm ${spec.id}")
            val remoteViews = RemoteViews(context.packageName, R.layout.notification_alarm_heads_up).apply {
                setTextViewText(R.id.alarm_heads_up_app_name, contentTitle)
                setTextViewText(R.id.alarm_heads_up_time, formatFireTime(context, spec.fireAt))
                setOnClickPendingIntent(R.id.alarm_heads_up_dismiss, dismissIntent)
            }
            builder.setCustomContentView(remoteViews)
            builder.setCustomHeadsUpContentView(remoteViews)
        }

        if (isRinging) {
            if (channelId == AlarmConstants.NOTIFICATION_CHANNEL_SILENT) {
                builder.setPriority(NotificationCompat.PRIORITY_LOW)
                builder.setDefaults(0)
            } else {
                builder.setPriority(NotificationCompat.PRIORITY_MAX)
                builder.setDefaults(NotificationCompat.DEFAULT_VIBRATE)
            }
            builder.setFullScreenIntent(alarmActivityPendingIntent, fullScreen)
        } else {
            builder.setPriority(NotificationCompat.PRIORITY_HIGH)
        }

        return builder.build().apply {
            // Make sure no custom big layout exists so the expand affordance is hidden
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
                bigContentView = null
            }
        }
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

    private fun formatFireTime(context: Context, fireAt: Long): String {
        val formatter = android.text.format.DateFormat.getTimeFormat(context)
        return formatter.format(Date(fireAt))
    }
}
