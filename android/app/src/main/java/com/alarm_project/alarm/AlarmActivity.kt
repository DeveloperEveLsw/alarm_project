package com.alarm_project.alarm

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.alarm_project.R
import com.facebook.react.ReactFragment
import com.facebook.react.modules.core.DefaultHardwareBackBtnHandler

class AlarmActivity : AppCompatActivity(), MissionCompletionListener, DefaultHardwareBackBtnHandler {
    private lateinit var dismissButton: Button
    private lateinit var snoozeButton: Button
    private lateinit var buttonGroup: View
    private lateinit var challengeContainer: FrameLayout
    private lateinit var labelView: TextView

    private var alarmId: String? = null
    private var missionActive = false
    private var missionRegistered = false
    private var challengeFragment: ReactFragment? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        applyFullScreenFlags()
        applyLockScreenTraits()
        setContentView(R.layout.activity_alarm)

        dismissButton = findViewById(R.id.alarmDismissButton)
        snoozeButton = findViewById(R.id.alarmSnoozeButton)
        buttonGroup = findViewById(R.id.alarmButtonGroup)
        challengeContainer = findViewById(R.id.alarmChallengeContainer)

        labelView = findViewById(R.id.alarmLabel)

        alarmId = intent.getStringExtra("alarm_id")
        val currentAlarmId = alarmId ?: run {
            finish()
            return
        }
        val alarmLabel = intent.getStringExtra("alarm_label")
        labelView.text = alarmLabel?.takeIf { it.isNotBlank() } ?: getString(R.string.alarm_default_label)

        dismissButton.setOnClickListener {
            AlarmEngineModuleHelper.sendDismiss(this, currentAlarmId)
            finish()
        }

        snoozeButton.setOnClickListener {
            AlarmEngineModuleHelper.sendSnooze(this, currentAlarmId)
            finish()
        }

        val requiresChallenge = intent.getBooleanExtra(AlarmConstants.EXTRA_REQUIRES_CHALLENGE, false)
        if (requiresChallenge) {
            startMissionInterface(currentAlarmId, intent)
        }
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
        intent ?: return
        val newAlarmId = intent.getStringExtra("alarm_id") ?: return
        alarmId = newAlarmId
        intent.getStringExtra("alarm_label")?.let { label ->
            if (label.isNotBlank()) {
                labelView.text = label
            }
        }
        val requiresChallenge = intent.getBooleanExtra(AlarmConstants.EXTRA_REQUIRES_CHALLENGE, false)
        if (requiresChallenge) {
            startMissionInterface(newAlarmId, intent)
        }
    }

    override fun onDestroy() {
        if (missionRegistered) {
            MissionBridgeRegistry.unregister(this)
            missionRegistered = false
        }
        super.onDestroy()
        AlarmEngineModuleHelper.sendStopNative(this)
    }

    override fun onBackPressed() {
        if (missionActive) {
            return
        }
        super.onBackPressed()
    }

    override fun invokeDefaultOnBackPressed() {
        super.onBackPressed()
    }

    override fun onMissionCompleted() {
        runOnUiThread {
            challengeContainer.visibility = View.GONE
            challengeFragment?.let {
                supportFragmentManager.beginTransaction()
                    .remove(it)
                    .commitAllowingStateLoss()
            }
            challengeFragment = null
            buttonGroup.visibility = View.VISIBLE
            missionActive = false
            if (missionRegistered) {
                MissionBridgeRegistry.unregister(this)
                missionRegistered = false
            }
        }
    }

    private fun startMissionInterface(alarmId: String, sourceIntent: Intent) {
        buttonGroup.visibility = View.GONE
        challengeContainer.visibility = View.VISIBLE
        missionActive = true
        if (!missionRegistered) {
            MissionBridgeRegistry.register(this)
            missionRegistered = true
        }
        val props = Bundle().apply {
            putString("alarmId", alarmId)
            sourceIntent.getStringExtra("policy_mode")?.let { putString("policyMode", it) }
            sourceIntent.getStringExtra("policy_payload")?.let { putString("policyPayload", it) }
            sourceIntent.getIntegerArrayListExtra("policy_snooze_minutes")?.let { minutes ->
                putIntegerArrayList("snoozeMinutes", minutes)
            }
            putBoolean("nativeHosted", true)
        }

        if (challengeFragment == null) {
            challengeFragment = ReactFragment.Builder()
                .setComponentName("alarm_challenge")
                .setLaunchOptions(props)
                .build()
            supportFragmentManager
                .beginTransaction()
                .replace(R.id.alarmChallengeContainer, challengeFragment!!, "alarm_challenge_fragment")
                .commitAllowingStateLoss()
        }
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
