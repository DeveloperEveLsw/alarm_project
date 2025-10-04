package com.alarm_project.alarm

import android.app.Activity
import android.content.Intent
import android.media.RingtoneManager
import android.os.Build
import android.net.Uri
import androidx.core.os.BundleCompat
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class RingtonePickerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val requestCode = 7201
    private var pendingPromise: Promise? = null

    private val activityListener: ActivityEventListener = object : BaseActivityEventListener() {
        override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
            if (requestCode != this@RingtonePickerModule.requestCode) return

            val promise = pendingPromise ?: return
            pendingPromise = null

            if (resultCode != Activity.RESULT_OK || data == null) {
                promise.resolve(null)
                return
            }

            val uri: Uri? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                data.getParcelableExtra(RingtoneManager.EXTRA_RINGTONE_PICKED_URI, Uri::class.java)
            } else {
                @Suppress("DEPRECATION")
                data.getParcelableExtra(RingtoneManager.EXTRA_RINGTONE_PICKED_URI)
            }

            promise.resolve(uri?.toString())
        }
    }

    init {
        reactContext.addActivityEventListener(activityListener)
    }

    override fun getName(): String = "RingtonePicker"

    override fun invalidate() {
        super.invalidate()
        pendingPromise?.apply { resolve(null) }
        pendingPromise = null
        reactContext.removeActivityEventListener(activityListener)
    }

    @ReactMethod
    fun pickAlarmTone(currentValue: String?, promise: Promise) {
        val activity = reactContext.currentActivity
        if (activity == null) {
            promise.reject("no_activity", "Foreground activity not available")
            return
        }

        if (pendingPromise != null) {
            promise.reject("in_progress", "Ringtone picker is already in progress")
            return
        }

        val intent = Intent(RingtoneManager.ACTION_RINGTONE_PICKER).apply {
            putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE, RingtoneManager.TYPE_ALARM)
            putExtra(RingtoneManager.EXTRA_RINGTONE_TITLE, "알람음 선택")
            putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_SILENT, false)
            putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_DEFAULT, true)

            currentValue?.let {
                val uri = runCatching { Uri.parse(it) }.getOrNull()
                if (uri != null) {
                    putExtra(RingtoneManager.EXTRA_RINGTONE_EXISTING_URI, uri)
                }
            }
        }

        pendingPromise = promise
        runCatching {
            activity.startActivityForResult(intent, requestCode)
        }.onFailure { error ->
            pendingPromise = null
            promise.reject("launch_failed", error.message)
        }
    }
}
