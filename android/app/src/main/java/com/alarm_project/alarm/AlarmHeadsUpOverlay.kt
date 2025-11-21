package com.alarm_project.alarm

import android.content.Context
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.text.format.DateFormat
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.TextView
import android.util.Log
import com.alarm_project.R
import java.util.Date
import kotlin.math.abs
import kotlin.math.min

object AlarmHeadsUpOverlay {
    private const val TAG = "AlarmHeadsUpOverlay"
    private val mainHandler = Handler(Looper.getMainLooper())
    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var currentAlarmId: String? = null

    private val autoHideRunnable = Runnable { removeInternal() }

    fun show(context: Context, spec: AlarmSpec): Boolean {
        if (!canDrawOverlays(context)) {
            Log.w(TAG, "show skipped: overlay permission denied")
            return false
        }
        val appContext = context.applicationContext
        mainHandler.post {
            removeInternal()
            val wm = appContext.getSystemService(Context.WINDOW_SERVICE) as WindowManager
            val inflater = LayoutInflater.from(appContext)
            val view = inflater.inflate(R.layout.view_alarm_heads_up_overlay, FrameLayout(appContext), false)
            bindView(view, appContext, spec)

            val layoutParams = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                resolveOverlayType(),
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
                y = appContext.resources.getDimensionPixelSize(R.dimen.alarm_heads_up_overlay_margin_top)
            }

            view.alpha = 0f
            view.translationY = -40f

            windowManager = wm
            overlayView = view
            runCatching {
                wm.addView(view, layoutParams)
            }.onFailure { error ->
                Log.e(TAG, "Failed to add overlay view", error)
                return@post
            }

            Log.d(TAG, "Overlay view attached for alarm ${spec.id}")

            view.animate()
                .alpha(1f)
                .translationY(0f)
                .setDuration(200L)
                .start()

            scheduleAutoHide()
        }
        return true
    }

    fun hide() {
        mainHandler.post { removeInternal() }
    }

    private fun bindView(view: View, context: Context, spec: AlarmSpec) {
        currentAlarmId = spec.id
        val labelView: TextView = view.findViewById(R.id.alarm_heads_up_label)
        val dateView: TextView = view.findViewById(R.id.alarm_heads_up_date)
        val timeView: TextView = view.findViewById(R.id.alarm_heads_up_time)
        val dismissButton: TextView = view.findViewById(R.id.alarm_heads_up_dismiss)
        val snoozeButton: TextView = view.findViewById(R.id.alarm_heads_up_snooze)
        val cardView: View = view.findViewById(R.id.alarm_heads_up_card)

        val label = spec.label?.takeIf { it.isNotBlank() } ?: context.getString(R.string.alarm_heads_up_label)
        labelView.text = label

        val fireDate = Date(spec.fireAt)
        val dateText = DateFormat.format("M월 d일 (E)", fireDate).toString()
        dateView.text = dateText

        val timeText = DateFormat.getTimeFormat(context).format(fireDate)
        timeView.text = timeText

        dismissButton.setOnClickListener {
            currentAlarmId?.let { AlarmEngineModuleHelper.sendDismiss(context, it) }
            hide()
        }

        snoozeButton.setOnClickListener {
            currentAlarmId?.let { AlarmEngineModuleHelper.sendSnooze(context, it) }
            hide()
        }

        enableSwipeToDismiss(cardView, dismissButton, snoozeButton)
    }

    private fun enableSwipeToDismiss(cardView: View, dismissView: View, snoozeView: View) {
        val touchSlop = ViewConfiguration.get(cardView.context).scaledTouchSlop
        var startX = 0f
        var dragging = false
        var ignore = false

        cardView.setOnTouchListener { v, event ->
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    if (isInside(event, dismissView) || isInside(event, snoozeView)) {
                        ignore = true
                        return@setOnTouchListener false
                    }
                    startX = event.rawX
                    dragging = false
                    ignore = false
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    if (ignore) return@setOnTouchListener false
                    val deltaX = event.rawX - startX
                    if (!dragging && kotlin.math.abs(deltaX) > touchSlop) {
                        dragging = true
                    }
                    if (dragging) {
                        v.translationX = deltaX
                        val progress = kotlin.math.min(1f, kotlin.math.abs(deltaX) / v.width)
                        v.alpha = 1f - (0.5f * progress)
                    }
                    true
                }
                MotionEvent.ACTION_UP,
                MotionEvent.ACTION_CANCEL -> {
                    if (ignore) {
                        ignore = false
                        return@setOnTouchListener false
                    }

                    if (dragging) {
                        val deltaX = event.rawX - startX
                        val threshold = v.width * 0.3f
                        if (kotlin.math.abs(deltaX) >= threshold) {
                            val target = if (deltaX > 0) v.width.toFloat() else -v.width.toFloat()
                            v.animate()
                                .translationX(target)
                                .alpha(0f)
                                .setDuration(180L)
                                .withEndAction { hide() }
                                .start()
                        } else {
                            v.animate()
                                .translationX(0f)
                                .alpha(1f)
                                .setDuration(180L)
                                .start()
                        }
                    }
                    dragging = false
                    true
                }
                else -> false
            }
        }
    }

    private fun isInside(event: MotionEvent, view: View): Boolean {
        val location = IntArray(2)
        view.getLocationOnScreen(location)
        val x = event.rawX
        val y = event.rawY
        return x >= location[0] &&
            x <= location[0] + view.width &&
            y >= location[1] &&
            y <= location[1] + view.height
    }

    private fun scheduleAutoHide() {
        mainHandler.removeCallbacks(autoHideRunnable)
        mainHandler.postDelayed(autoHideRunnable, AUTO_HIDE_DELAY_MS)
    }

    private fun removeInternal() {
        mainHandler.removeCallbacks(autoHideRunnable)
        overlayView?.let { view ->
            view.animate().cancel()
            runCatching { windowManager?.removeView(view) }.onFailure {
                Log.w(TAG, "removeView failed", it)
            }
        }
        overlayView = null
        currentAlarmId = null
        windowManager = null
        Log.d(TAG, "Overlay view removed")
    }

    private fun resolveOverlayType(): Int {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }
    }

    fun canDrawOverlays(context: Context): Boolean {
        val granted = Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context)
        if (!granted) {
            Log.d(TAG, "Overlay permission check failed")
        }
        return granted
    }

    private const val AUTO_HIDE_DELAY_MS = 60_000L
}
