package com.alarm_project.alarm

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext

/**
 * FusedLocationProvider 를 감싸는 헬퍼.
 * 위치 권한과 단발성 위치 요청을 한 곳에서 처리한다.
 */
class LocationProvider(private val context: Context) {

    private val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)

    suspend fun getFreshLocation(): LocationSnapshot? = withContext(Dispatchers.IO) {
        if (!hasLocationPermission()) return@withContext null

        val latest = runCatching { requestCurrentLocation() }.getOrNull()
        val fallback = if (latest == null) runCatching { requestLastLocation() }.getOrNull() else null

        latest ?: fallback
    }

    fun hasLocationPermission(requireBackground: Boolean = false): Boolean {
        val fineGranted =
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val coarseGranted =
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val backgroundGranted = if (requireBackground && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }

        return (fineGranted || coarseGranted) && backgroundGranted
    }

    @SuppressLint("MissingPermission")
    private suspend fun requestCurrentLocation(): LocationSnapshot? {
        val tokenSource = CancellationTokenSource()
        val location = fusedLocationClient.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, tokenSource.token).await()
        return location?.toSnapshot()
    }

    @SuppressLint("MissingPermission")
    private suspend fun requestLastLocation(): LocationSnapshot? {
        val location = fusedLocationClient.lastLocation.await()
        return location?.toSnapshot()
    }

    private fun android.location.Location.toSnapshot(): LocationSnapshot =
        LocationSnapshot(
            latitude = latitude,
            longitude = longitude,
            accuracyMeters = accuracy,
            ageMillis = System.currentTimeMillis(),
            provider = provider ?: "fused",
        )
}
