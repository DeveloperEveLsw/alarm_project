package com.alarm_project.supabase

import android.content.Context
import android.content.SharedPreferences
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SupabaseStorageModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val prefs: SharedPreferences by lazy {
        reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    override fun getName(): String = MODULE_NAME

    @ReactMethod
    fun getItem(key: String, promise: Promise) {
        try {
            promise.resolve(prefs.getString(key, null))
        } catch (error: Exception) {
            promise.reject("storage_get_error", error)
        }
    }

    @ReactMethod
    fun setItem(key: String, value: String?, promise: Promise) {
        try {
            prefs.edit().apply {
                if (value == null) {
                    remove(key)
                } else {
                    putString(key, value)
                }
            }.apply()
            promise.resolve(null)
        } catch (error: Exception) {
            promise.reject("storage_set_error", error)
        }
    }

    @ReactMethod
    fun removeItem(key: String, promise: Promise) {
        try {
            prefs.edit().remove(key).apply()
            promise.resolve(null)
        } catch (error: Exception) {
            promise.reject("storage_remove_error", error)
        }
    }

    companion object {
        private const val PREFS_NAME = "supabase_session_storage"
        private const val MODULE_NAME = "SupabaseStorage"
    }
}
