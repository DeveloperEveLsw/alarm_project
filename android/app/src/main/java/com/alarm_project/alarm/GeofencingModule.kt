package com.alarm_project.alarm

import android.content.Intent
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingClient
import com.google.android.gms.location.GeofencingRequest
import com.google.android.gms.location.LocationServices
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class GeofencingModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val geofencingClient: GeofencingClient by lazy {
        LocationServices.getGeofencingClient(reactContext)
    }

    companion object {
        private const val TAG = "GeofencingModule"
        private const val GEOFENCE_RADIUS_DEFAULT = 100f
        private const val DEFAULT_LOITERING_DELAY_MS = 5 * 60 * 1000L // 기본값: 5분
        @Volatile
        private var instance: GeofencingModule? = null

        fun getInstance(): GeofencingModule? = instance
    }

    init {
        instance = this
    }

    override fun getName(): String = "GeofencingModule"

    @ReactMethod
    fun addGeofence(geofenceData: ReadableMap, promise: Promise) {
        try {
            val geofenceId = geofenceData.getString("id") ?: throw IllegalArgumentException("Geofence ID is required")
            val latitude = geofenceData.getDouble("latitude")
            val longitude = geofenceData.getDouble("longitude")
            val radius = geofenceData.getDouble("radius").toFloat()
            val transitionTypes = geofenceData.getInt("transitionTypes")
            // loiteringDelayMinutes는 선택적 (밀리초 단위로 변환, 기본값: 5분)
            val loiteringDelayMs = if (geofenceData.hasKey("loiteringDelayMinutes")) {
                (geofenceData.getDouble("loiteringDelayMinutes") * 60 * 1000).toLong()
            } else {
                DEFAULT_LOITERING_DELAY_MS
            }

            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val geofenceBuilder = Geofence.Builder()
                        .setRequestId(geofenceId)
                        .setCircularRegion(latitude, longitude, radius)
                        .setExpirationDuration(Geofence.NEVER_EXPIRE)
                        .setTransitionTypes(transitionTypes)

                    // DWELL 트리거가 포함된 경우 loitering delay 설정
                    if ((transitionTypes and Geofence.GEOFENCE_TRANSITION_DWELL) != 0) {
                        geofenceBuilder.setLoiteringDelay(loiteringDelayMs.toInt())
                    }

                    val geofence = geofenceBuilder.build()

                    val geofencingRequest = GeofencingRequest.Builder()
                        .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
                        .addGeofence(geofence)
                        .build()

                    val intent = Intent(reactContext, GeofencingBroadcastReceiver::class.java)
                    val pendingIntent = android.app.PendingIntent.getBroadcast(
                        reactContext,
                        geofenceId.hashCode(),
                        intent,
                        android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_MUTABLE
                    )

                    geofencingClient.addGeofences(geofencingRequest, pendingIntent)
                        .addOnSuccessListener {
                            Log.d(TAG, "Geofence added successfully: $geofenceId")
                            promise.resolve(true)
                        }
                        .addOnFailureListener { exception ->
                            Log.e(TAG, "Failed to add geofence: $geofenceId", exception)
                            promise.reject("GEOFENCE_ADD_ERROR", exception.message, exception)
                        }

                } catch (e: Exception) {
                    Log.e(TAG, "Error adding geofence", e)
                    promise.reject("GEOFENCE_ADD_ERROR", e.message, e)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Invalid geofence data", e)
            promise.reject("INVALID_DATA", e.message, e)
        }
    }

    @ReactMethod
    fun removeGeofence(geofenceId: String, promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                geofencingClient.removeGeofences(listOf(geofenceId))
                    .addOnSuccessListener {
                        Log.d(TAG, "Geofence removed successfully: $geofenceId")
                        promise.resolve(true)
                    }
                    .addOnFailureListener { exception ->
                        Log.e(TAG, "Failed to remove geofence: $geofenceId", exception)
                        promise.reject("GEOFENCE_REMOVE_ERROR", exception.message, exception)
                    }

            } catch (e: Exception) {
                Log.e(TAG, "Error removing geofence", e)
                promise.reject("GEOFENCE_REMOVE_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun removeAllGeofences(promise: Promise) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val intent = Intent(reactContext, GeofencingBroadcastReceiver::class.java)
                val pendingIntent = android.app.PendingIntent.getBroadcast(
                    reactContext,
                    0,
                    intent,
                    android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_MUTABLE
                )

                geofencingClient.removeGeofences(pendingIntent)
                    .addOnSuccessListener {
                        Log.d(TAG, "All geofences removed successfully")
                        promise.resolve(true)
                    }
                    .addOnFailureListener { exception ->
                        Log.e(TAG, "Failed to remove all geofences", exception)
                        promise.reject("GEOFENCE_REMOVE_ALL_ERROR", exception.message, exception)
                    }

            } catch (e: Exception) {
                Log.e(TAG, "Error removing all geofences", e)
                promise.reject("GEOFENCE_REMOVE_ALL_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun getActiveGeofences(promise: Promise) {
        // Note: GeofencingClient doesn't provide a direct way to get active geofences
        // This would need to be tracked manually or through a different approach
        promise.resolve(WritableNativeArray()) // Return empty array for now
    }

    fun emitStationEnterEvent(stationId: String) {
        try {
            val params: WritableMap = Arguments.createMap().apply {
                putString("stationId", stationId)
            }
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("stationEnter", params)
            Log.d(TAG, "Station enter event emitted: $stationId")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to emit station enter event", e)
        }
    }
}
