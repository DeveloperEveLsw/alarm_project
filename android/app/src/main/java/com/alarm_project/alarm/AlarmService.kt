package com.alarm_project.alarm

import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.Ringtone
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.VibrationEffect
import android.os.Vibrator
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.alarm_project.MainActivity
import android.util.Log

class AlarmService : Service() {
    private var currentSpec: AlarmSpec? = null
    private var isForeground = false
    private var ringtone: Ringtone? = null
    private var vibrator: Vibrator? = null
    private var uiReadyTimestamp: Long? = null
    private var lastLockState: LockStateSnapshot? = null
    private val audioFocusListener = AudioManager.OnAudioFocusChangeListener { }
    private var hasAudioFocus = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) { //알람서비스에 Intent가 들어오면 일로옴
                                //트리거면 handleTrigger로
                                //커멘드면 handleCommand로
            AlarmConstants.ACTION_TRIGGER -> handleTrigger(intent)
            AlarmConstants.ACTION_COMMAND -> handleCommand(intent)
        }
        return START_STICKY
    }

    private fun handleTrigger(intent: Intent) { //여기가 알람 트리거 받아서 처리하는 쪽
        val alarmId = intent.getStringExtra(AlarmConstants.EXTRA_ALARM_ID) ?: return
        val spec = intent.getStringExtra(AlarmConstants.EXTRA_SPEC_JSON)?.let {
            runCatching { AlarmJson.decodeSpec(it) }.getOrNull()
        } ?: AlarmStore.get(this, alarmId)

        if (spec == null) {
            AlarmEventDispatcher.send(this, ErrorEvent(alarmId, "spec_missing", "AlarmSpec not found"))
            stopSelf()
            return
        }

        currentSpec = spec

        val lockStateSnapshot = ContextSnapshotBuilder(this).getLockStateSnapshot()
        lastLockState = lockStateSnapshot
        val shouldLaunchFullScreen = shouldForceFullScreen(lockStateSnapshot)

        startRinging(spec, shouldLaunchFullScreen, null, lockStateSnapshot)
    }

    private fun handleCommand(intent: Intent) {
        val raw = intent.getStringExtra(AlarmConstants.EXTRA_COMMAND_JSON) ?: return
        val command = runCatching { AlarmJson.decodeCommand(raw) }.getOrNull() ?: return
        val spec = currentSpec ?: AlarmStore.get(this, command.id)
        if (spec != null) currentSpec = spec

        when (command) {
            is UiReadyCommand -> uiReadyTimestamp = command.timestampUtc
            is RingNativeCommand -> spec?.let { startRinging(it, command.fullScreen, command.channel) }
            is OpenModeUiCommand -> openModeUi(command)
            is SnoozeCommand -> spec?.let { snooze(it, command.minutes) }
            is DismissCommand -> spec?.let { dismiss(it) }
            is StopNativeCommand -> stopRinging()
        }
    }

    private fun startRinging(
        spec: AlarmSpec,
        fullScreen: Boolean,
        channelOverride: AlarmChannel?,
        lockStateOverride: LockStateSnapshot? = null,
    ) {
        val lockState = lockStateOverride ?: lastLockState ?: ContextSnapshotBuilder(this).getLockStateSnapshot()
        lastLockState = lockState
        val resolvedFullScreen = fullScreen || shouldForceFullScreen(lockState)
        val overlayAllowed = !resolvedFullScreen && AlarmHeadsUpOverlay.canDrawOverlays(applicationContext)
        val resolvedChannelOverride = when {
            resolvedFullScreen -> channelOverride
            overlayAllowed -> AlarmChannel.SILENT
            else -> channelOverride
        }
        val useLegacyHeadsUp = !resolvedFullScreen && !overlayAllowed
        Log.d(
            "AlarmService",
            "startRinging overlayAllowed=$overlayAllowed resolvedFullScreen=$resolvedFullScreen useLegacy=$useLegacyHeadsUp",
        )
        setForeground(
            spec,
            isRinging = true,
            fullScreen = resolvedFullScreen,
            channelOverride = resolvedChannelOverride,
            useLegacyHeadsUp = useLegacyHeadsUp,
        )

        val overlayShown = if (overlayAllowed) {
            AlarmHeadsUpOverlay.show(applicationContext, spec)
        } else {
            false
        }

        if (resolvedFullScreen || (overlayAllowed && !overlayShown)) {
            AlarmHeadsUpOverlay.hide()
            launchAlarmActivity(spec)
        }

        val audioManager = ContextCompat.getSystemService(this, AudioManager::class.java)
        val focusResult = audioManager?.requestAudioFocus(
            audioFocusListener,
            AudioManager.STREAM_ALARM,
            AudioManager.AUDIOFOCUS_GAIN_TRANSIENT,
        )
        hasAudioFocus = focusResult == AudioManager.AUDIOFOCUS_REQUEST_GRANTED

        val alarmUri = resolveAlarmUri(spec)
        val attributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()

        ringtone?.stop()
        ringtone = RingtoneManager.getRingtone(applicationContext, alarmUri)?.apply {
            audioAttributes = attributes
            isLooping = true
            play()
        }

        handleVibration(spec)
    }

    private fun setForeground(
        spec: AlarmSpec,
        isRinging: Boolean,
        fullScreen: Boolean,
        channelOverride: AlarmChannel?,
        useLegacyHeadsUp: Boolean,
    ) {
        val notification = AlarmNotifications.buildForeground(
            this,
            spec,
            isRinging,
            fullScreen,
            channelOverride,
            useLegacyHeadsUp,
        )
        if (!isForeground) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    AlarmConstants.NOTIFICATION_ID_FOREGROUND,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK,
                )
            } else {
                startForeground(AlarmConstants.NOTIFICATION_ID_FOREGROUND, notification)
            }
            isForeground = true
        } else {
            AlarmNotifications.notifyEvent(this, AlarmConstants.NOTIFICATION_ID_FOREGROUND, notification)
        }
    }

    private fun snooze(spec: AlarmSpec, explicitMinutes: Int?) {
        val minutes = explicitMinutes
            ?: spec.policy.snoozeMinutes?.firstOrNull()
            ?: 5
        val nextFireAt = System.currentTimeMillis() + minutes * 60_000L
        val updatedSpec = spec.copy(fireAt = nextFireAt)
        AlarmStore.save(this, updatedSpec)
        AlarmScheduler.schedule(this, updatedSpec)
        AlarmDatabase.updateNextTrigger(this, spec.id, nextFireAt)
        AlarmSyncBridge.notifyStorageChanged(this, spec.id)
        AlarmEventDispatcher.send(this, SnoozedEvent(spec.id, nextFireAt, minutes))
        stopRinging()
        stopSelf()
    }

    private fun dismiss(spec: AlarmSpec) {
        val nextFireAt = AlarmDatabase.computeNextFireAt(this, spec.id, spec.fireAt)

        AlarmScheduler.cancel(this, spec.id)
        AlarmStore.remove(this, spec.id)

        val dismissedAt = System.currentTimeMillis()

        if (nextFireAt != null) {
            val nextSpec = spec.copy(fireAt = nextFireAt)
            AlarmStore.save(this, nextSpec)
            AlarmScheduler.schedule(this, nextSpec)
            AlarmDatabase.updateNextTrigger(this, spec.id, nextFireAt)
            AlarmEventDispatcher.send(this, ScheduledEvent(spec.id, nextFireAt))
        } else {
            AlarmDatabase.updateNextTrigger(this, spec.id, null)
        }

        AlarmSyncBridge.notifyStorageChanged(this, spec.id)
        AlarmEventDispatcher.send(this, DismissedEvent(spec.id, dismissedAt))
        stopRinging()
        stopSelf()
    }

    private fun openModeUi(command: OpenModeUiCommand) {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("alarm_id", command.id)
            putExtra("alarm_route", command.route)
            command.seed?.let { putExtra("alarm_seed", it) }
            command.extras?.forEach { (key, value) -> putExtra(key, value) }
        }
        startActivity(intent)
    }

    private fun stopRinging() {
        AlarmHeadsUpOverlay.hide()
        ringtone?.stop()
        ringtone = null
        vibrator?.cancel()
        vibrator = null

        if (hasAudioFocus) {
            val audioManager = ContextCompat.getSystemService(this, AudioManager::class.java)
            audioManager?.abandonAudioFocus(audioFocusListener)
            hasAudioFocus = false
        }
    }

    override fun onDestroy() {
        stopRinging()
        isForeground = false
        super.onDestroy()
    }

    private fun shouldForceFullScreen(lockState: LockStateSnapshot): Boolean {
        return !lockState.isScreenOn || lockState.isKeyguardLocked
    }

    private fun buildAlarmActivityIntent(spec: AlarmSpec): Intent {
        return Intent(this, AlarmActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NO_ANIMATION
            putExtra("alarm_id", spec.id)
            putExtra("alarm_fire_at", spec.fireAt)
            spec.label?.let { putExtra("alarm_label", it) }
        }
    }

    private fun launchAlarmActivity(spec: AlarmSpec) {
        val intent = buildAlarmActivityIntent(spec)
        val resolveInfo = packageManager.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY)
        if (resolveInfo != null) {
            startActivity(intent)
        }
    }

    private fun resolveAlarmUri(spec: AlarmSpec): Uri {
        val fallback = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            ?: Settings.System.DEFAULT_ALARM_ALERT_URI

        val raw = spec.metadata?.get("sound")?.takeIf { it.isNotBlank() && it != "default" }
        if (raw == null) return fallback

        val parsed = runCatching { Uri.parse(raw) }.getOrNull()?.takeIf { !it.scheme.isNullOrBlank() }
        if (parsed == null) {
            Log.w("AlarmService", "Invalid alarm sound uri (missing scheme): $raw")
            return fallback
        }

        val resolver = applicationContext.contentResolver
        val valid = runCatching {
            resolver.openAssetFileDescriptor(parsed, "r")?.use { }
        }.isSuccess
        if (!valid) {
            Log.w("AlarmService", "Alarm sound uri not accessible, falling back: $raw")
            return fallback
        }

        return parsed
    }

    private fun handleVibration(spec: AlarmSpec) {
        val shouldVibrate = spec.metadata?.get("vibrate")?.let { it.equals("true", ignoreCase = true) }
            ?: true
        val vibrator = ContextCompat.getSystemService(this, Vibrator::class.java)
        this.vibrator = vibrator
        if (!shouldVibrate) {
            vibrator?.cancel()
            return
        }

        if (vibrator != null && vibrator.hasVibrator()) {
            val pattern = longArrayOf(0, 800, 600)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(pattern, 0)
            }
        }
    }
}
