package com.planner.android.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val taskId = intent.getStringExtra("task_id") ?: return
        val title = intent.getStringExtra("task_title") ?: "Task Reminder"
        val desc = intent.getStringExtra("task_desc") ?: ""
        val priority = intent.getStringExtra("task_priority") ?: "medium"

        val prioritySuffix = if (priority == "high") " [HIGH]" else ""
        val bodyText = if (desc.isNotBlank()) desc else "Scheduled task reminder in Second Brain."

        ReminderScheduler.showNotification(
            context = context,
            title = "⏰ $title$prioritySuffix",
            body = bodyText,
            notificationId = taskId.hashCode()
        )
    }
}
