package com.alarm_project.alarm

import android.annotation.SuppressLint
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class AlarmChallengeActivity : ReactActivity() {
    private var alarmId: String? = null
    private var eventReceiver: BroadcastReceiver? = null

    override fun getMainComponentName(): String = "alarm_challenge"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {
            override fun getLaunchOptions(): Bundle? {
                return buildLaunchOptions()
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        alarmId = intent.getStringExtra("alarm_id")
        applyFullScreenFlags()
        applyLockScreenTraits()
        registerEventReceiver()
    }

    override fun onDestroy() {
        super.onDestroy()
        unregisterEventReceiver()
        AlarmEngineModuleHelper.sendStopNative(this)
    }

    private fun buildLaunchOptions(): Bundle {
        val options = Bundle()
        intent.getStringExtra("alarm_id")?.let { options.putString("alarmId", it) }
        intent.getStringExtra("policy_mode")?.let { options.putString("policyMode", it) }
        intent.getStringExtra("policy_payload")?.let { options.putString("policyPayload", it) }
        intent.getIntegerArrayListExtra("policy_snooze_minutes")?.let { options.putIntegerArrayList("snoozeMinutes", it) }
        return options
    }

    private fun registerEventReceiver() {
        if (eventReceiver != null) return
        val filter = IntentFilter(AlarmConstants.ACTION_ALARM_EVENT)
        eventReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                val rawEvent = intent?.getStringExtra(AlarmConstants.EXTRA_EVENT_JSON) ?: return
                val event = runCatching { AlarmJson.decodeEvent(rawEvent) }.getOrNull() ?: return
                if (event.id != alarmId) {
                    return
                }
                when (event) {
                    is DismissedEvent,
                    is SnoozedEvent,
                    is ErrorEvent -> finish()
                    else -> {}
                }
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(eventReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("DEPRECATION")
            registerReceiver(eventReceiver, filter)
        }
    }

    private fun unregisterEventReceiver() {
        if (eventReceiver == null) return
        runCatching { unregisterReceiver(eventReceiver) }
        eventReceiver = null
    }

    private fun applyLockScreenTraits() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
            )
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD)
    }

    @SuppressLint("InlinedApi")
    private fun applyFullScreenFlags() {
        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
        )
    }
}
