package com.alarm_project.alarm.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.alarm_project.alarm.data.local.dao.AlarmDao
import com.alarm_project.alarm.data.local.dao.AlarmSetDao
import com.alarm_project.alarm.data.local.dao.AlarmSetTemplateDao
import com.alarm_project.alarm.data.local.dao.AlarmTemplateDao
import com.alarm_project.alarm.data.local.dao.CategoryDao
import com.alarm_project.alarm.data.local.dao.DDayDao
import com.alarm_project.alarm.data.local.dao.GeoFenceHistoryDao
import com.alarm_project.alarm.data.local.dao.GeoFenceZoneDao
import com.alarm_project.alarm.data.local.dao.TodoAlarmRelationDao
import com.alarm_project.alarm.data.local.dao.TodoDao
import com.alarm_project.alarm.data.local.entity.AlarmEntity
import com.alarm_project.alarm.data.local.entity.AlarmSetEntity
import com.alarm_project.alarm.data.local.entity.DDayEntity
import com.alarm_project.alarm.data.local.entity.TodoAlarmRelationEntity
import com.alarm_project.alarm.data.local.entity.TodoEntity
import com.alarm_project.alarm.data.local.entity.AlarmSetTemplateEntity
import com.alarm_project.alarm.data.local.entity.AlarmTemplateEntity
import com.alarm_project.alarm.data.local.entity.CategoryEntity
import com.alarm_project.alarm.data.local.entity.GeoFenceHistoryEntity
import com.alarm_project.alarm.data.local.entity.GeoFenceZoneEntity

@Database(
    entities = [
        TodoEntity::class,
        AlarmEntity::class,
        AlarmSetEntity::class,
        DDayEntity::class,
        TodoAlarmRelationEntity::class,
        AlarmSetTemplateEntity::class,
        AlarmTemplateEntity::class,
        GeoFenceZoneEntity::class,
        GeoFenceHistoryEntity::class,
        CategoryEntity::class,
    ],
    version = 7,
    exportSchema = true,
)
abstract class AlarmRoomDatabase : RoomDatabase() {
    abstract fun todoDao(): TodoDao
    abstract fun alarmDao(): AlarmDao
    abstract fun alarmSetDao(): AlarmSetDao
    abstract fun dDayDao(): DDayDao
    abstract fun todoAlarmRelationDao(): TodoAlarmRelationDao
    abstract fun alarmSetTemplateDao(): AlarmSetTemplateDao
    abstract fun alarmTemplateDao(): AlarmTemplateDao
    abstract fun geoFenceZoneDao(): GeoFenceZoneDao
    abstract fun geoFenceHistoryDao(): GeoFenceHistoryDao
    abstract fun categoryDao(): CategoryDao

    companion object {
        private const val DATABASE_NAME = "schedule.db"

        @Volatile
        private var instance: AlarmRoomDatabase? = null

        fun getInstance(context: Context): AlarmRoomDatabase {
            return instance ?: synchronized(this) {
                instance ?: buildDatabase(context.applicationContext).also { instance = it }
            }
        }

        private fun buildDatabase(context: Context): AlarmRoomDatabase {
            return Room.databaseBuilder(
                context,
                AlarmRoomDatabase::class.java,
                DATABASE_NAME,
            )
                .fallbackToDestructiveMigration()
                .fallbackToDestructiveMigrationOnDowngrade()
                .build()
        }
    }
}
