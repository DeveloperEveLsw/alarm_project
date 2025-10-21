package com.alarm_project.alarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.location.Location
import android.os.Binder
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * 백그라운드 위치 추적 서비스
 * 지오펜싱과 위치 기반 알람을 위한 지속적인 위치 모니터링
 */
class BackgroundLocationService : Service() {
    
    private val binder = LocationServiceBinder()
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationRequest: LocationRequest
    private lateinit var locationCallback: LocationCallback
    
    private val locationHistoryManager by lazy { LocationHistoryManager(this) }
    private val locationBasedAlarmManager by lazy { LocationBasedAlarmManager(this) }
    private val geofenceAlarmManager by lazy { GeofenceAlarmManager(this) }
    
    private var isTracking = false
    
    companion object {
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "location_tracking_channel"
        private const val CHANNEL_NAME = "위치 추적"
        
        fun startService(context: Context) {
            val intent = Intent(context, BackgroundLocationService::class.java)
            ContextCompat.startForegroundService(context, intent)
        }
        
        fun stopService(context: Context) {
            val intent = Intent(context, BackgroundLocationService::class.java)
            context.stopService(intent)
        }
    }
    
    inner class LocationServiceBinder : Binder() {
        fun getService(): BackgroundLocationService = this@BackgroundLocationService
    }
    
    override fun onCreate() {
        super.onCreate()
        Log.d("BackgroundLocationService", "Service created")
        
        initializeLocationServices()
        createNotificationChannel()
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d("BackgroundLocationService", "Service started")
        startForeground(NOTIFICATION_ID, createNotification())
        startLocationTracking()
        return START_STICKY
    }
    
    override fun onBind(intent: Intent?): IBinder = binder
    
    override fun onDestroy() {
        super.onDestroy()
        Log.d("BackgroundLocationService", "Service destroyed")
        stopLocationTracking()
    }
    
    private fun initializeLocationServices() {
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        
        locationRequest = LocationRequest.Builder(
            Priority.PRIORITY_HIGH_ACCURACY,
            10000L // 10초 간격
        ).apply {
            setMinUpdateIntervalMillis(5000L) // 최소 5초 간격
            setMaxUpdateDelayMillis(15000L) // 최대 15초 지연
            setWaitForAccurateLocation(false)
        }.build()
        
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                super.onLocationResult(result)
                result.lastLocation?.let { location ->
                    handleLocationUpdate(location)
                }
            }
        }
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "위치 기반 알람을 위한 백그라운드 위치 추적"
                setShowBadge(false)
            }
            
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    private fun createNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("위치 추적 중")
            .setContentText("위치 기반 알람이 활성화되어 있습니다")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }
    
    private fun startLocationTracking() {
        if (isTracking) return
        
        try {
            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            )
            isTracking = true
            Log.d("BackgroundLocationService", "Location tracking started")
        } catch (e: SecurityException) {
            Log.e("BackgroundLocationService", "Location permission denied", e)
        } catch (e: Exception) {
            Log.e("BackgroundLocationService", "Failed to start location tracking", e)
        }
    }
    
    private fun stopLocationTracking() {
        if (!isTracking) return
        
        try {
            fusedLocationClient.removeLocationUpdates(locationCallback)
            isTracking = false
            Log.d("BackgroundLocationService", "Location tracking stopped")
        } catch (e: Exception) {
            Log.e("BackgroundLocationService", "Failed to stop location tracking", e)
        }
    }
    
    private fun handleLocationUpdate(location: Location) {
        serviceScope.launch {
            try {
                val locationSnapshot = LocationSnapshot(
                    latitude = location.latitude,
                    longitude = location.longitude,
                    accuracyMeters = location.accuracy,
                    ageMillis = System.currentTimeMillis() - location.time,
                    provider = location.provider ?: "fused"
                )
                
                // 위치 히스토리에 저장
                locationHistoryManager.saveLocationSnapshot(locationSnapshot)
                
                // 위치 기반 알람 조건 확인
                checkLocationBasedAlarms(locationSnapshot)
                
                // 지오펜싱 상태 확인
                checkGeofenceStatus(locationSnapshot)
                
                Log.d("BackgroundLocationService", 
                    "Location updated: ${locationSnapshot.latitude}, ${locationSnapshot.longitude}")
                
            } catch (e: Exception) {
                Log.e("BackgroundLocationService", "Failed to handle location update", e)
            }
        }
    }
    
    private suspend fun checkLocationBasedAlarms(locationSnapshot: LocationSnapshot) {
        try {
            // 모든 활성 알람에 대해 위치 조건 확인
            val activeAlarms = getAllActiveAlarmIds() // 이 함수는 나중에 구현
            for (alarmId in activeAlarms) {
                val conditionMet = locationBasedAlarmManager.checkLocationCondition(alarmId)
                if (conditionMet) {
                    Log.d("BackgroundLocationService", "Location condition met for alarm: $alarmId")
                    // 알람 트리거 로직 (나중에 구현)
                }
            }
        } catch (e: Exception) {
            Log.e("BackgroundLocationService", "Failed to check location based alarms", e)
        }
    }
    
    private suspend fun checkGeofenceStatus(locationSnapshot: LocationSnapshot) {
        try {
            // 지오펜싱 상태 확인 및 업데이트
            geofenceAlarmManager.checkGeofenceStatus(locationSnapshot)
        } catch (e: Exception) {
            Log.e("BackgroundLocationService", "Failed to check geofence status", e)
        }
    }
    
    private fun getAllActiveAlarmIds(): List<String> {
        // 임시로 빈 리스트 반환 (나중에 Room DB에서 조회)
        return emptyList()
    }
    
    /**
     * 서비스 상태 확인
     */
    fun isLocationTrackingActive(): Boolean = isTracking
    
    /**
     * 위치 추적 시작/중지
     */
    fun setLocationTrackingEnabled(enabled: Boolean) {
        if (enabled) {
            startLocationTracking()
        } else {
            stopLocationTracking()
        }
    }
}
