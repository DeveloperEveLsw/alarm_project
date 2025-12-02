package com.alarm_project.alarm.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "GeoFenceZone",
    indices = [
        Index(value = ["is_active"]),
        Index(value = ["alarm_id"], unique = true),
    ],
)
data class GeoFenceZoneEntity(
    @PrimaryKey(autoGenerate = true)
    @ColumnInfo(name = "id")
    val id: Long = 0L,

    @ColumnInfo(name = "name")
    val name: String? = null,

    @ColumnInfo(name = "alarm_id")
    val alarmId: String,

    @ColumnInfo(name = "latitude")
    val latitude: Double,

    @ColumnInfo(name = "longitude")
    val longitude: Double,

    @ColumnInfo(name = "radius")
    val radiusMeters: Int,

    @ColumnInfo(name = "is_active")
    val isActive: Boolean,
)
