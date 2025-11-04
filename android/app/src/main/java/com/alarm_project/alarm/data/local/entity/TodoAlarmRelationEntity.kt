package com.alarm_project.alarm.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "TodoAlarmRelation",
    indices = [
        Index(value = ["todo_id"]),
        Index(value = ["alarm_id"]),
        Index(value = ["todo_id", "alarm_id"], unique = true),
    ],
    foreignKeys = [
        ForeignKey(
            entity = TodoEntity::class,
            parentColumns = ["id"],
            childColumns = ["todo_id"],
            onDelete = ForeignKey.CASCADE,
        ),
        ForeignKey(
            entity = AlarmEntity::class,
            parentColumns = ["id"],
            childColumns = ["alarm_id"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
)
data class TodoAlarmRelationEntity(
    @PrimaryKey(autoGenerate = true)
    @ColumnInfo(name = "id")
    val id: Long? = null,
    @ColumnInfo(name = "todo_id")
    val todoId: Long,
    @ColumnInfo(name = "alarm_id")
    val alarmId: String,
    @ColumnInfo(name = "offset_minutes")
    val offsetMinutes: Int,
    @ColumnInfo(name = "order_index")
    val orderIndex: Int = 0,
)
