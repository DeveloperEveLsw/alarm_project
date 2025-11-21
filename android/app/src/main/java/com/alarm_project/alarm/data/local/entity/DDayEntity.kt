package com.alarm_project.alarm.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "Dday",
    indices = [Index(value = ["todo_id"])]
)
data class DDayEntity(
    @PrimaryKey(autoGenerate = true)
    @ColumnInfo(name = "id")
    val id: Long = 0,
    @ColumnInfo(name = "todo_id")
    val todoId: Long? = null,
    @ColumnInfo(name = "target_date")
    val targetDate: String,
)
