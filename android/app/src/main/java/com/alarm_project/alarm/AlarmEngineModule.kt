package com.alarm_project.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class AlarmEngineModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val eventReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val rawEvent = intent.getStringExtra(AlarmConstants.EXTRA_EVENT_JSON) ?: return
            emitEvent(rawEvent)
        }
    }
    private var receiverRegistered = false

    override fun getName(): String = "AlarmEngine"

    override fun initialize() {
        super.initialize()
        registerReceiver()
    }

    override fun invalidate() {
        super.invalidate()
        unregisterReceiver()
    }

    @ReactMethod
    fun scheduleExact(specJson: String, promise: Promise) {
        try {
            val spec = AlarmJson.decodeSpec(specJson)
            AlarmStore.save(reactContext, spec)
            AlarmScheduler.schedule(reactContext, spec)
            AlarmDatabase.updateNextTrigger(reactContext, spec.id, spec.fireAt)
            AlarmSyncBridge.notifyStorageChanged(reactContext, spec.id)
            AlarmEventDispatcher.send(reactContext, ScheduledEvent(spec.id, spec.fireAt))
            promise.resolve(null)
        } catch (error: Exception) {
            promise.reject("schedule_error", error)
        }
    }

    @ReactMethod
    fun cancel(alarmId: String, promise: Promise) {
        try {
            AlarmScheduler.cancel(reactContext, alarmId)
            AlarmStore.remove(reactContext, alarmId)
            AlarmDatabase.updateNextTrigger(reactContext, alarmId, null)
            AlarmSyncBridge.notifyStorageChanged(reactContext, alarmId)
            promise.resolve(null)
        } catch (error: Exception) {
            promise.reject("cancel_error", error)
        }
    }

    @ReactMethod
    fun send(commandJson: String, promise: Promise) {
        try {
            // validate command before dispatch to fail fast on malformed json
            AlarmJson.decodeCommand(commandJson)
            val intent = Intent(reactContext, AlarmService::class.java).apply {
                action = AlarmConstants.ACTION_COMMAND
                putExtra(AlarmConstants.EXTRA_COMMAND_JSON, commandJson)
            }
            ContextCompat.startForegroundService(reactContext, intent)
            promise.resolve(null)
        } catch (error: Exception) {
            promise.reject("command_error", error)
        }
    }

    private fun emitEvent(rawEvent: String) {
        reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(AlarmConstants.EVENT_NAME, rawEvent)
    }

    private fun registerReceiver() {
        if (receiverRegistered) return
        val filter = IntentFilter(AlarmConstants.ACTION_ALARM_EVENT)
        reactContext.registerReceiver(eventReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED)
        receiverRegistered = true
    }

    private fun unregisterReceiver() {
        if (!receiverRegistered) return
        runCatching { reactContext.unregisterReceiver(eventReceiver) }
        receiverRegistered = false
    }
}
