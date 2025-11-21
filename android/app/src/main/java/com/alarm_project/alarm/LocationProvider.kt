package com.alarm_project.alarm

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import androidx.core.content.ContextCompat
import com.google.android.gms.location.CurrentLocationRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.Tasks
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class LocationProvider(private val context: Context) {
    private val fusedClient = LocationServices.getFusedLocationProviderClient(context)

    suspend fun getFreshLocation(timeoutMillis: Long = 4_000L): LocationSnapshot? = withContext(Dispatchers.IO) {
        if (!hasPermission()) return@withContext null

        val cached = getLastKnown()
        val fresh = getSingleUpdate(timeoutMillis)

        val candidate = listOfNotNull(fresh, cached).minByOrNull { locationAge(it) } ?: return@withContext null
        LocationSnapshot(
            latitude = candidate.latitude,
            longitude = candidate.longitude,
            accuracyMeters = candidate.accuracy,
            ageMillis = locationAge(candidate),
            provider = candidate.provider ?: "fused"
        )
    }

    private fun hasPermission(): Boolean {
        val fine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val coarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        return fine || coarse
    }

    @SuppressLint("MissingPermission")
    private fun getLastKnown(): Location? = try {
        Tasks.await(fusedClient.lastLocation)
    } catch (_: Exception) {
        null
    }

    @SuppressLint("MissingPermission")
    private fun getSingleUpdate(timeoutMillis: Long): Location? = try {
        val request = CurrentLocationRequest.Builder()
            .setDurationMillis(timeoutMillis)
            .setPriority(Priority.PRIORITY_HIGH_ACCURACY)
            .build()
        Tasks.await(fusedClient.getCurrentLocation(request, null))
    } catch (_: Exception) {
        null
    }

    private fun locationAge(location: Location): Long {
        val diff = System.currentTimeMillis() - location.time
        return if (diff >= 0) diff else Long.MAX_VALUE
    }
}
