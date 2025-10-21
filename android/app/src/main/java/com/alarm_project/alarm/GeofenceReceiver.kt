package com.alarm_project.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingEvent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * 지오펜싱 이벤트를 받아서 알람을 트리거하는 리시버
 */
class GeofenceReceiver : BroadcastReceiver() {
    
    override fun onReceive(context: Context, intent: Intent) {
        Log.d("GeofenceReceiver", "Geofence event received")
        
        val geofencingEvent = GeofencingEvent.fromIntent(intent)
        if (geofencingEvent.hasError()) {
            Log.e("GeofenceReceiver", "Geofencing event error: ${geofencingEvent.errorCode}")
            return
        }
        
        val transitionType = geofencingEvent.geofenceTransition
        val triggeringGeofences = geofencingEvent.triggeringGeofences
        
        Log.d("GeofenceReceiver", "Transition type: $transitionType, Geofences: ${triggeringGeofences.size}")
        
        when (transitionType) {
            Geofence.GEOFENCE_TRANSITION_ENTER -> {
                Log.d("GeofenceReceiver", "Entered geofence")
                handleGeofenceEnter(context, triggeringGeofences)
            }
            Geofence.GEOFENCE_TRANSITION_EXIT -> {
                Log.d("GeofenceReceiver", "Exited geofence")
                handleGeofenceExit(context, triggeringGeofences)
            }
            Geofence.GEOFENCE_TRANSITION_DWELL -> {
                Log.d("GeofenceReceiver", "Dwelling in geofence")
                handleGeofenceDwell(context, triggeringGeofences)
            }
            else -> {
                Log.w("GeofenceReceiver", "Unknown transition type: $transitionType")
            }
        }
    }
    
    private fun handleGeofenceEnter(context: Context, geofences: List<Geofence>) {
        CoroutineScope(Dispatchers.IO).launch {
            for (geofence in geofences) {
                val alarmId = geofence.requestId
                Log.d("GeofenceReceiver", "Triggering alarm for geofence enter: $alarmId")
                
                // 알람 트리거
                triggerLocationBasedAlarm(context, alarmId, "ENTER")
            }
        }
    }
    
    private fun handleGeofenceExit(context: Context, geofences: List<Geofence>) {
        CoroutineScope(Dispatchers.IO).launch {
            for (geofence in geofences) {
                val alarmId = geofence.requestId
                Log.d("GeofenceReceiver", "Triggering alarm for geofence exit: $alarmId")
                
                // 알람 트리거
                triggerLocationBasedAlarm(context, alarmId, "EXIT")
            }
        }
    }
    
    private fun handleGeofenceDwell(context: Context, geofences: List<Geofence>) {
        CoroutineScope(Dispatchers.IO).launch {
            for (geofence in geofences) {
                val alarmId = geofence.requestId
                Log.d("GeofenceReceiver", "Triggering alarm for geofence dwell: $alarmId")
                
                // 알람 트리거
                triggerLocationBasedAlarm(context, alarmId, "DWELL")
            }
        }
    }
    
    private suspend fun triggerLocationBasedAlarm(context: Context, alarmId: String, triggerType: String) {
        try {
            // 알람 서비스에 위치 기반 알람 트리거 요청
            val intent = Intent(context, AlarmService::class.java).apply {
                action = "TRIGGER_LOCATION_ALARM"
                putExtra("alarmId", alarmId)
                putExtra("triggerType", triggerType)
                putExtra("triggerTime", System.currentTimeMillis())
            }
            
            context.startService(intent)
            Log.d("GeofenceReceiver", "Location-based alarm triggered: $alarmId ($triggerType)")
            
        } catch (e: Exception) {
            Log.e("GeofenceReceiver", "Failed to trigger location-based alarm: $alarmId", e)
        }
    }
}
