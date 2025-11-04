package com.alarm_project.alarm.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "AlarmSetTemplate")
data class AlarmSetTemplateEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: String,
    @ColumnInfo(name = "label")
    val label: String,
    @ColumnInfo(name = "default_sound")
    val defaultSound: String,
    @ColumnInfo(name = "default_mode")
    val defaultMode: String,
    @ColumnInfo(name = "created_at")
    val createdAt: String? = null,
)
