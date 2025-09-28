package com.alarm_project.alarm

import android.app.Service
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.core.content.ContextCompat
import com.alarm_project.MainActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class AlarmService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var currentSpec: AlarmSpec? = null
    private var isForeground = false
    private var ringtone: Ringtone? = null
    private var vibrator: Vibrator? = null
    private var uiReadyTimestamp: Long? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            AlarmConstants.ACTION_TRIGGER -> handleTrigger(intent)
            AlarmConstants.ACTION_COMMAND -> handleCommand(intent)
        }
        return START_NOT_STICKY
    }

    private fun handleTrigger(intent: Intent) {
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
        setForeground(spec, isRinging = false, fullScreen = false, channelOverride = null)

        scope.launch {
            val contextSnapshot = withContext(Dispatchers.Default) {
                ContextSnapshotBuilder(this@AlarmService).build(spec, System.currentTimeMillis())
            }
            AlarmEventDispatcher.send(this@AlarmService, FiredEvent(spec.id, contextSnapshot))
        }
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

    private fun startRinging(spec: AlarmSpec, fullScreen: Boolean, channelOverride: AlarmChannel?) {
        setForeground(spec, isRinging = true, fullScreen = fullScreen, channelOverride = channelOverride)

        val audioManager = ContextCompat.getSystemService(this, AudioManager::class.java)
        audioManager?.requestAudioFocus(null, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)

        val alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
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

        val vibrator = ContextCompat.getSystemService(this, Vibrator::class.java)
        this.vibrator = vibrator
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

    private fun setForeground(
        spec: AlarmSpec,
        isRinging: Boolean,
        fullScreen: Boolean,
        channelOverride: AlarmChannel?
    ) {
        val notification = AlarmNotifications.buildForeground(this, spec, isRinging, fullScreen, channelOverride)
        if (!isForeground) {
            startForeground(AlarmConstants.NOTIFICATION_ID_FOREGROUND, notification)
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
        AlarmEventDispatcher.send(this, SnoozedEvent(spec.id, nextFireAt, minutes))
        stopRinging()
        stopSelf()
    }

    private fun dismiss(spec: AlarmSpec) {
        AlarmScheduler.cancel(this, spec.id)
        AlarmStore.remove(this, spec.id)
        AlarmEventDispatcher.send(this, DismissedEvent(spec.id, System.currentTimeMillis()))
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
        ringtone?.stop()
        ringtone = null
        vibrator?.cancel()
        vibrator = null
    }

    override fun onDestroy() {
        stopRinging()
        scope.cancel()
        isForeground = false
        super.onDestroy()
    }
}

