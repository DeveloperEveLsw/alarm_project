package com.alarm_project.alarm

import android.content.Context
import android.content.SharedPreferences

private const val PREFS_NAME = "alarm_engine_store"
private const val KEY_IDS = "alarm_ids"

object AlarmStore {
    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun save(context: Context, spec: AlarmSpec) {
        val prefs = prefs(context)
        val ids = prefs.getStringSet(KEY_IDS, mutableSetOf())?.toMutableSet() ?: mutableSetOf()
        ids.add(spec.id)
        prefs.edit()
            .putString(specKey(spec.id), AlarmJson.encodeSpec(spec))
            .putStringSet(KEY_IDS, ids)
            .apply()
    }

    fun get(context: Context, id: String): AlarmSpec? {
        val raw = prefs(context).getString(specKey(id), null) ?: return null
        return runCatching { AlarmJson.decodeSpec(raw) }.getOrNull()
    }

    fun remove(context: Context, id: String) {
        val prefs = prefs(context)
        val ids = prefs.getStringSet(KEY_IDS, mutableSetOf())?.toMutableSet() ?: mutableSetOf()
        ids.remove(id)
        prefs.edit()
            .remove(specKey(id))
            .putStringSet(KEY_IDS, ids)
            .apply()
    }

    fun list(context: Context): List<AlarmSpec> {
        val prefs = prefs(context)
        val ids = prefs.getStringSet(KEY_IDS, emptySet()) ?: emptySet()
        return ids.mapNotNull { id ->
            prefs.getString(specKey(id), null)?.let { raw ->
                runCatching { AlarmJson.decodeSpec(raw) }.getOrNull()
            }
        }
    }

    private fun specKey(id: String): String = "alarm_spec_$id"
}
