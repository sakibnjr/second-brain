package com.planner.android.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.PowerManager

class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val taskId = intent.getStringExtra("task_id") ?: return
        val title = intent.getStringExtra("task_title") ?: "Task Reminder"
        val desc = intent.getStringExtra("task_desc") ?: ""
        val priority = intent.getStringExtra("task_priority") ?: "medium"

        val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        val wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "SecondBrain:ReminderWakeLock"
        )

        wakeLock.acquire(5_000L)
        try {
            val prioritySuffix = if (priority == "high") " [HIGH]" else ""
            val bodyText = if (desc.isNotBlank()) desc else "Scheduled task reminder in Second Brain."

            ReminderScheduler.showNotification(
                context = context,
                title = "⏰ $title$prioritySuffix",
                body = bodyText,
                notificationId = taskId.hashCode()
            )
        } finally {
            if (wakeLock.isHeld) {
                wakeLock.release()
            }
        }
    }
}
