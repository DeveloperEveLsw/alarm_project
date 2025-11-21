package com.alarm_project.alarm.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "Alarm",
    indices = [
        Index(value = ["alarm_set_id"]),
        Index(value = ["dday_id"])
    ]
)
data class AlarmEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: String,
    @ColumnInfo(name = "alarm_set_id")
    val alarmSetId: String? = null,
    @ColumnInfo(name = "dday_id")
    val ddayId: Long? = null,
    @ColumnInfo(name = "label")
    val label: String = "",
    @ColumnInfo(name = "hour")
    val hour: Int,
    @ColumnInfo(name = "minute")
    val minute: Int,
    @ColumnInfo(name = "repeat_days")
    val repeatDaysMask: Int = 0,
    @ColumnInfo(name = "skip_holidays")
    val skipHolidays: Boolean = false,
    @ColumnInfo(name = "sound")
    val sound: String = "",
    @ColumnInfo(name = "vibrate")
    val vibrate: Boolean = true,
    @ColumnInfo(name = "enabled")
    val enabled: Boolean = true,
    @ColumnInfo(name = "next_trigger_at")
    val nextTriggerAt: Long? = null,
    @ColumnInfo(name = "policy_mode")
    val policyMode: String = "normal",
    @ColumnInfo(name = "policy_payload")
    val policyPayload: String? = null,
)
