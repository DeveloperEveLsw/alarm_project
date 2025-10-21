package com.alarm_project.alarm

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import androidx.core.content.ContextCompat

/**
 * 배터리 최적화 및 백그라운드 안정화 관리자
 * 위치 기반 서비스가 배터리 절약 모드에서도 정상 작동하도록 보장
 */
class BatteryOptimizationManager(private val context: Context) {
    
    private val powerManager = ContextCompat.getSystemService(context, PowerManager::class.java)
    private val activityManager = ContextCompat.getSystemService(context, ActivityManager::class.java)
    
    /**
     * 배터리 최적화 상태 확인
     * @return true: 최적화됨, false: 최적화되지 않음
     */
    fun isBatteryOptimized(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            powerManager?.isIgnoringBatteryOptimizations(context.packageName) == false
        } else {
            false
        }
    }
    
    /**
     * 배터리 최적화 해제 요청
     * 사용자가 수동으로 설정에서 해제해야 함
     */
    fun requestBatteryOptimizationExemption() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:${context.packageName}")
                }
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                context.startActivity(intent)
                Log.d("BatteryOptimization", "Battery optimization exemption requested")
            } catch (e: Exception) {
                Log.e("BatteryOptimization", "Failed to request battery optimization exemption", e)
            }
        }
    }
    
    /**
     * 배터리 설정 페이지로 이동
     */
    fun openBatterySettings() {
        try {
            val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            context.startActivity(intent)
            Log.d("BatteryOptimization", "Battery settings opened")
        } catch (e: Exception) {
            Log.e("BatteryOptimization", "Failed to open battery settings", e)
        }
    }
    
    /**
     * 백그라운드 앱 제한 상태 확인
     * @return true: 제한됨, false: 제한되지 않음
     */
    fun isBackgroundRestricted(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            activityManager?.isBackgroundRestricted == true
        } else {
            false
        }
    }
    
    /**
     * 백그라운드 앱 설정 페이지로 이동
     */
    fun openBackgroundAppSettings() {
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:${context.packageName}")
            }
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            context.startActivity(intent)
            Log.d("BatteryOptimization", "Background app settings opened")
        } catch (e: Exception) {
            Log.e("BatteryOptimization", "Failed to open background app settings", e)
        }
    }
    
    /**
     * 위치 서비스 최적화 권장사항 제공
     */
    fun getLocationServiceOptimizationTips(): List<String> {
        val tips = mutableListOf<String>()
        
        if (isBatteryOptimized()) {
            tips.add("배터리 최적화를 해제하여 백그라운드 위치 추적이 정상 작동하도록 설정하세요.")
        }
        
        if (isBackgroundRestricted()) {
            tips.add("백그라운드 앱 제한을 해제하여 위치 기반 알람이 정상 작동하도록 설정하세요.")
        }
        
        tips.add("정확한 위치 서비스를 위해 GPS를 켜두세요.")
        tips.add("배터리 절약 모드에서는 위치 정확도가 떨어질 수 있습니다.")
        tips.add("Wi-Fi 및 모바일 데이터를 켜두면 위치 정확도가 향상됩니다.")
        
        return tips
    }
    
    /**
     * 현재 배터리 상태 정보 수집
     */
    fun getBatteryStatus(): BatteryStatus {
        val batteryIntent = context.registerReceiver(null, android.content.IntentFilter(android.content.Intent.ACTION_BATTERY_CHANGED))
        val batteryLevel = batteryIntent?.let { intent ->
            val level = intent.getIntExtra(android.os.BatteryManager.EXTRA_LEVEL, -1)
            val scale = intent.getIntExtra(android.os.BatteryManager.EXTRA_SCALE, -1)
            if (level >= 0 && scale > 0) level.toDouble() / scale else 0.0
        } ?: 0.0
        
        val isPowerSaveMode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            powerManager?.isPowerSaveMode ?: false
        } else {
            false
        }
        
        return BatteryStatus(
            level = batteryLevel,
            isPowerSaveMode = isPowerSaveMode,
            isBatteryOptimized = isBatteryOptimized(),
            isBackgroundRestricted = isBackgroundRestricted()
        )
    }
}

/**
 * 배터리 상태 정보
 */
data class BatteryStatus(
    val level: Double, // 0.0 ~ 1.0
    val isPowerSaveMode: Boolean,
    val isBatteryOptimized: Boolean,
    val isBackgroundRestricted: Boolean
)
