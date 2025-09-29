package com.alarm_project

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import java.util.Calendar

class AlarmModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "AlarmModule"
    }

    @ReactMethod
    fun setAlarm(alarmTime: Double, alarmId: Int, title: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            
            val intent = Intent(context, AlarmReceiver::class.java).apply {
                putExtra("alarmId", alarmId)
                putExtra("title", title)
                putExtra("message", "일정 알림입니다")
            }
            
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                alarmId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            
            // 정확한 시간에 알람 설정
            alarmManager.setExact(
                AlarmManager.RTC_WAKEUP,
                alarmTime.toLong(),
                pendingIntent
            )
            
            promise.resolve("알람이 설정되었습니다")
        } catch (e: Exception) {
            promise.reject("ALARM_ERROR", "알람 설정 실패: ${e.message}", e)
        }
    }

    @ReactMethod
    fun setRepeatingAlarm(
        alarmTime: Double, 
        repeatType: String, 
        alarmId: Int, 
        title: String, 
        promise: Promise
    ) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            
            val intent = Intent(context, AlarmReceiver::class.java).apply {
                putExtra("alarmId", alarmId)
                putExtra("title", title)
                putExtra("message", "반복 일정 알림입니다")
            }
            
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                alarmId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            
            val interval = when (repeatType) {
                "daily" -> AlarmManager.INTERVAL_DAY
                "weekly" -> AlarmManager.INTERVAL_DAY * 7
                "monthly" -> AlarmManager.INTERVAL_DAY * 30
                else -> AlarmManager.INTERVAL_DAY
            }
            
            // 반복 알람 설정
            alarmManager.setRepeating(
                AlarmManager.RTC_WAKEUP,
                alarmTime.toLong(),
                interval,
                pendingIntent
            )
            
            promise.resolve("반복 알람이 설정되었습니다")
        } catch (e: Exception) {
            promise.reject("ALARM_ERROR", "반복 알람 설정 실패: ${e.message}", e)
        }
    }

    @ReactMethod
    fun cancelAlarm(alarmId: Int, promise: Promise) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            
            val intent = Intent(context, AlarmReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                alarmId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            
            alarmManager.cancel(pendingIntent)
            pendingIntent.cancel()
            
            promise.resolve("알람이 취소되었습니다")
        } catch (e: Exception) {
            promise.reject("ALARM_ERROR", "알람 취소 실패: ${e.message}", e)
        }
    }

    @ReactMethod
    fun cancelAllAlarms(promise: Promise) {
        try {
            val context = reactApplicationContext
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            
            // 모든 알람 취소 (실제로는 특정 범위의 ID들을 취소)
            for (i in 1..1000) { // 일반적인 알람 ID 범위
                val intent = Intent(context, AlarmReceiver::class.java)
                val pendingIntent = PendingIntent.getBroadcast(
                    context,
                    i,
                    intent,
                    PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
                )
                
                if (pendingIntent != null) {
                    alarmManager.cancel(pendingIntent)
                    pendingIntent.cancel()
                }
            }
            
            promise.resolve("모든 알람이 취소되었습니다")
        } catch (e: Exception) {
            promise.reject("ALARM_ERROR", "알람 취소 실패: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getActiveAlarms(promise: Promise) {
        try {
            // 현재 활성화된 알람 목록을 반환
            // 실제로는 SharedPreferences나 데이터베이스에서 관리
            promise.resolve("활성 알람 목록을 가져올 수 없습니다 (구현 필요)")
        } catch (e: Exception) {
            promise.reject("ALARM_ERROR", "알람 목록 조회 실패: ${e.message}", e)
        }
    }
}
