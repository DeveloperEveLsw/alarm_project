package com.alarm_project.alarm

import android.annotation.SuppressLint
import android.app.Activity
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import com.alarm_project.R

class AlarmActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        applyFullScreenFlags()
        applyLockScreenTraits()
        setContentView(R.layout.activity_alarm)

        val dismissButton: Button = findViewById(R.id.alarmDismissButton)
        val snoozeButton: Button = findViewById(R.id.alarmSnoozeButton)
        val messageView: TextView = findViewById(R.id.alarmMessage)

        val alarmId = intent.getStringExtra("alarm_id") ?: return

        messageView.text = getString(R.string.alarm_running_message)

        dismissButton.setOnClickListener {
            AlarmEngineModuleHelper.sendDismiss(this, alarmId)
            finish()
        }

        snoozeButton.setOnClickListener {
            AlarmEngineModuleHelper.sendSnooze(this, alarmId)
            finish()
        }
    }

    override fun onNewIntent(intent: android.content.Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
    }

    override fun onDestroy() {
        super.onDestroy()
        AlarmEngineModuleHelper.sendStopNative(this)
    }

    private fun applyLockScreenTraits() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
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
