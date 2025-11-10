package com.alarm_project.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.location.Location
import android.util.Log
import androidx.core.content.ContextCompat
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingEvent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * 지오펜싱 이벤트를 받아서 알람을 트리거하는 리시버
 */
class GeofenceReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "GeofenceReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "Geofence event received")

        val geofencingEvent = GeofencingEvent.fromIntent(intent)
        if (geofencingEvent == null) {
            Log.w(TAG, "GeofencingEvent is null")
            return
        }

        if (geofencingEvent.hasError()) {
            Log.e(TAG, "Geofencing event error: ${geofencingEvent.errorCode}")
            return
        }

        val transitionType = geofencingEvent.geofenceTransition
        val triggeringGeofences: List<Geofence> = geofencingEvent.triggeringGeofences ?: emptyList()
        val triggeringLocation: Location? = geofencingEvent.triggeringLocation

        Log.d(TAG, "Transition type: $transitionType, Geofences: ${triggeringGeofences.size}")

        when (transitionType) {
            Geofence.GEOFENCE_TRANSITION_ENTER -> handleGeofenceEvent(context, triggeringGeofences, triggeringLocation, "ENTER")
            Geofence.GEOFENCE_TRANSITION_EXIT -> handleGeofenceEvent(context, triggeringGeofences, triggeringLocation, "EXIT")
            Geofence.GEOFENCE_TRANSITION_DWELL -> handleGeofenceEvent(context, triggeringGeofences, triggeringLocation, "DWELL")
            else -> Log.w(TAG, "Unknown transition type: $transitionType")
        }
    }

    private fun handleGeofenceEvent(
        context: Context,
        geofences: List<Geofence>,
        location: Location?,
        transitionLabel: String,
    ) {
        if (geofences.isEmpty()) {
            Log.d(TAG, "No geofences to handle for $transitionLabel")
            return
        }

        CoroutineScope(Dispatchers.IO).launch {
            location?.let {
                Log.d(TAG, "Triggering location: ${it.latitude}, ${it.longitude}")
            }
            triggerLocationBasedAlarm(context, geofences, transitionLabel)
        }
    }

    private fun triggerLocationBasedAlarm(
        context: Context,
        geofences: List<Geofence>,
        transitionLabel: String,
    ) {
        try {
            val intent = Intent(context, AlarmService::class.java).apply {
                action = "com.alarm_project.alarm.GEOFENCE_TRIGGER"
                putExtra("transition", transitionLabel)
                putExtra("ids", geofences.map { it.requestId }.toTypedArray())
                putExtra("triggerTime", System.currentTimeMillis())
            }

            ContextCompat.startForegroundService(context, intent)
            Log.d(TAG, "Location-based alarm triggered for ${geofences.size} geofence(s) ($transitionLabel)")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to trigger location-based alarm ($transitionLabel)", e)
        }
    }
}
