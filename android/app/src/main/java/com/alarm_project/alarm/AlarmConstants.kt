package com.alarm_project.alarm

object AlarmConstants {
    const val ACTION_TRIGGER = "com.alarm_project.alarm.ACTION_TRIGGER"
    const val ACTION_COMMAND = "com.alarm_project.alarm.ACTION_COMMAND"
    const val ACTION_ALARM_EVENT = "com.alarm_project.alarm.ACTION_ALARM_EVENT"

    const val EXTRA_ALARM_ID = "extra_alarm_id"
    const val EXTRA_COMMAND_JSON = "extra_command_json"
    const val EXTRA_SPEC_JSON = "extra_spec_json"
    const val EXTRA_EVENT_JSON = "extra_event_json"

    const val EVENT_NAME = "AlarmEvent"

    const val NOTIFICATION_CHANNEL_ALARMS = "alarms"
    const val NOTIFICATION_CHANNEL_SILENT = "silent"
    const val NOTIFICATION_ID_FOREGROUND = 20240229
}
