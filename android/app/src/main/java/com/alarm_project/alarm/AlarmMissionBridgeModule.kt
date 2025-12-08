package com.alarm_project.alarm

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AlarmMissionBridgeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "AlarmMissionBridge"

    @ReactMethod
    fun notifyMissionCompleted(promise: Promise) {
        MissionBridgeRegistry.notifyMissionCompleted()
        promise.resolve(null)
    }
}
