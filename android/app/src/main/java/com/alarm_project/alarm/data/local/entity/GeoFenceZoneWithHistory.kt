package com.alarm_project.alarm.data.local.entity

import androidx.room.Embedded
import androidx.room.Relation

data class GeoFenceZoneWithHistory(
    @Embedded val zone: GeoFenceZoneEntity,
    @Relation(
        parentColumn = "id",
        entityColumn = "zone_id",
    )
    val history: List<GeoFenceHistoryEntity>,
)
