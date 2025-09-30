package com.alarm_project.alarm

import android.Manifest
import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.SparseArray
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import java.util.concurrent.atomic.AtomicInteger

class PermissionModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), PermissionListener {

    // 권한 요청 코드를 만들고 콜백을 보관하는 내부 상태
    private val requestCodeGenerator = AtomicInteger(7000)
    private val pendingCallbacks = SparseArray<(Boolean) -> Unit>()

    override fun getName(): String = "PermissionModule"

    override fun invalidate() {
        super.invalidate()
        clearPendingCallbacks()
    }

    @ReactMethod
    fun checkPostNotifications(promise: Promise) {
        val granted = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            hasPermission(Manifest.permission.POST_NOTIFICATIONS)
        promise.resolve(granted)
    }

    @ReactMethod
    fun requestPostNotifications(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            promise.resolve(true)
            return
        }
        requestPermissionsInternal(arrayOf(Manifest.permission.POST_NOTIFICATIONS),
            onResult = { granted -> promise.resolve(granted) },
            onError = { code, message -> promise.reject(code, message) },
        )
    }

    @ReactMethod
    fun checkFineLocation(promise: Promise) {
        promise.resolve(hasPermission(Manifest.permission.ACCESS_FINE_LOCATION))
    }

    @ReactMethod
    fun requestFineLocation(promise: Promise) {
        requestPermissionsInternal(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION),
            onResult = { granted -> promise.resolve(granted) },
            onError = { code, message -> promise.reject(code, message) },
        )
    }

    @ReactMethod
    fun checkBackgroundLocation(promise: Promise) {
        val granted = Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
            hasPermission(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
        promise.resolve(granted)
    }

    @ReactMethod
    fun requestBackgroundLocation(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            promise.resolve(true)
            return
        }

        // 백그라운드 권한은 정밀 위치 권한이 먼저 허용되어야 함
        fun requestBackgroundOnly() {
            requestPermissionsInternal(arrayOf(Manifest.permission.ACCESS_BACKGROUND_LOCATION),
                onResult = { granted -> promise.resolve(granted) },
                onError = { code, message -> promise.reject(code, message) },
            )
        }

        if (!hasPermission(Manifest.permission.ACCESS_FINE_LOCATION)) {
            requestPermissionsInternal(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION),
                onResult = { fineGranted ->
                    if (!fineGranted) {
                        promise.resolve(false)
                    } else {
                        requestBackgroundOnly()
                    }
                },
                onError = { code, message -> promise.reject(code, message) },
            )
        } else {
            requestBackgroundOnly()
        }
    }

    @ReactMethod
    fun canScheduleExactAlarms(promise: Promise) {
        val granted = if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            true
        } else {
            val alarmManager = reactContext.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            alarmManager?.canScheduleExactAlarms() == true
        }
        promise.resolve(granted)
    }

    @ReactMethod
    fun openScheduleExactAlarmSettings(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            promise.resolve(false)
            return
        }

        // 정확한 알람 권한 설정 화면 진입
        val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
            data = Uri.parse("package:${reactContext.packageName}")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

        val launched = runCatching { reactContext.startActivity(intent) }.isSuccess
        if (!launched) {
            val fallbackIntent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:${reactContext.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            runCatching { reactContext.startActivity(fallbackIntent) }
        }
        promise.resolve(launched)
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray,
    ): Boolean {
        val callback = pendingCallbacks[requestCode] ?: return false
        pendingCallbacks.remove(requestCode)
        val granted = grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }
        callback.invoke(granted)
        return true
    }

    private fun hasPermission(permission: String): Boolean =
        ContextCompat.checkSelfPermission(reactContext, permission) == PackageManager.PERMISSION_GRANTED

    private fun requestPermissionsInternal(
        permissions: Array<String>,
        onResult: (Boolean) -> Unit,
        onError: (String, String) -> Unit,
    ) {
        // 이미 허용된 권한은 요청 목록에서 제외
        val filtered = permissions.filterTo(mutableListOf()) { permission ->
            when (permission) {
                Manifest.permission.POST_NOTIFICATIONS ->
                    Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !hasPermission(permission)
                Manifest.permission.ACCESS_BACKGROUND_LOCATION ->
                    Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && !hasPermission(permission)
                else -> !hasPermission(permission)
            }
        }

        if (filtered.isEmpty()) {
            onResult(true)
            return
        }

        // ReactActivity가 PermissionAwareActivity를 구현해야 런타임 요청 가능
        val activity = currentActivity ?: run {
            onError("no_activity", "Foreground activity not available")
            return
        }

        val permissionAwareActivity = activity as? PermissionAwareActivity ?: run {
            onError("no_permission_aware", "Host activity does not implement PermissionAwareActivity")
            return
        }

        // 요청 코드와 콜백을 저장해 비동기 결과를 JS로 반환
        val requestCode = requestCodeGenerator.incrementAndGet()
        pendingCallbacks.put(requestCode) { granted -> onResult(granted) }

        runCatching {
            permissionAwareActivity.requestPermissions(filtered.toTypedArray(), requestCode, this)
        }.onFailure {
            pendingCallbacks.remove(requestCode)
            onError("request_failed", it.message ?: "Permission request failed")
        }
    }

    // RN 모듈이 파기될 때 미완료 콜백을 모두 실패 처리
    private fun clearPendingCallbacks() {
        for (index in 0 until pendingCallbacks.size()) {
            val callback = pendingCallbacks.valueAt(index)
            callback.invoke(false)
        }
        pendingCallbacks.clear()
    }
}
