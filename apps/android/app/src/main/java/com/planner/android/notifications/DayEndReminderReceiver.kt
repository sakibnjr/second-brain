package com.planner.android.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.PowerManager
import com.planner.android.data.GamificationManager
import com.planner.android.data.database.AppDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class DayEndReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val pendingResult = goAsync()
        val appContext = context.applicationContext
        val powerManager = appContext.getSystemService(Context.POWER_SERVICE) as PowerManager
        val wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "SecondBrain:DayEndWakeLock"
        )
        wakeLock.acquire(10_000L)

        CoroutineScope(Dispatchers.IO).launch {
            try {
                GamificationManager.init(appContext)
                val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
                val tasks = AppDatabase.getDatabase(appContext).taskDao().getAllTasksFlow().first()
                val pendingTodayCount = tasks.count { task ->
                    task.deletedAt == null &&
                        task.status != "completed" &&
                        (task.dueAt == null || task.dueAt.take(10) <= todayStr)
                }

                if (pendingTodayCount > 0) {
                    val streak = GamificationManager.state.value.currentStreak
                    val streakNote = if (streak > 0) {
                        "Finish before midnight to keep your ${streak}-day streak alive!"
                    } else {
                        "Complete a task before midnight to start your daily streak!"
                    }
                    ReminderScheduler.showNotification(
                        context = appContext,
                        title = "🌙 11 PM Check-in: $pendingTodayCount task${if (pendingTodayCount > 1) "s" else ""} left",
                        body = streakNote,
                        notificationId = DAY_END_NOTIFICATION_ID
                    )
                }
            } finally {
                // Always schedule tomorrow's 11:00 PM check-in
                ReminderScheduler.scheduleDayEndReminder(appContext)
                if (wakeLock.isHeld) {
                    wakeLock.release()
                }
                pendingResult.finish()
            }
        }
    }

    companion object {
        const val DAY_END_NOTIFICATION_ID = 11_00_23
    }
}
