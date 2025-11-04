package com.alarm_project.alarm.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "AlarmTemplate",
    indices = [
        Index(value = ["template_id"]),
    ],
    foreignKeys = [
        ForeignKey(
            entity = AlarmSetTemplateEntity::class,
            parentColumns = ["id"],
            childColumns = ["template_id"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
)
data class AlarmTemplateEntity(
    @PrimaryKey(autoGenerate = true)
    @ColumnInfo(name = "id")
    val id: Long? = null,
    @ColumnInfo(name = "template_id")
    val templateId: String,
    @ColumnInfo(name = "label")
    val label: String = "",
    @ColumnInfo(name = "offset_minutes")
    val offsetMinutes: Int,
    @ColumnInfo(name = "repeat_days")
    val repeatDaysMask: Int = 0,
    @ColumnInfo(name = "skip_holidays")
    val skipHolidays: Boolean = false,
    @ColumnInfo(name = "sound")
    val sound: String = "",
    @ColumnInfo(name = "vibrate")
    val vibrate: Boolean = true,
    @ColumnInfo(name = "policy_mode")
    val policyMode: String = "normal",
    @ColumnInfo(name = "policy_payload")
    val policyPayload: String? = null,
)
