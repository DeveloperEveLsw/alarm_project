package com.alarm_project.alarm.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "Todo",
    indices = [
        Index(value = ["due_date"]),
        Index(value = ["dday_id"]),
        Index(value = ["alarm_id"]),
        Index(value = ["alarm_set_id"])
    ]
)
data class TodoEntity(
    @PrimaryKey(autoGenerate = true)
    @ColumnInfo(name = "id")
    val id: Long? = null,
    @ColumnInfo(name = "title")
    val title: String,
    @ColumnInfo(name = "description")
    val description: String? = null,
    @ColumnInfo(name = "due_date")
    val dueDate: String? = null,
    @ColumnInfo(name = "due_time")
    val dueTime: String? = null,
    @ColumnInfo(name = "is_repeating")
    val isRepeating: Boolean = false,
    @ColumnInfo(name = "repeat_type")
    val repeatType: String? = null,
    @ColumnInfo(name = "repeat_weekday")
    val repeatWeekdayMask: Int = 0,
    @ColumnInfo(name = "repeat_day_of_month")
    val repeatDayOfMonth: Int? = null,
    @ColumnInfo(name = "dday_id")
    val ddayId: Long? = null,
    @ColumnInfo(name = "alarm_id")
    val alarmId: String? = null,
    @ColumnInfo(name = "alarm_set_id")
    val alarmSetId: String? = null,
    @ColumnInfo(name = "created_at")
    val createdAt: String? = null,
)
