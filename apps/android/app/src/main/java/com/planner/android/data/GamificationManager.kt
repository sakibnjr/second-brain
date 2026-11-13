package com.planner.android.data

import android.content.Context
import com.planner.android.data.models.TaskEntity
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

data class GamificationState(
    val points: Int = 0,
    val currentStreak: Int = 0,
    val bestStreak: Int = 0,
    val level: Int = 1,
    val levelTitle: String = "Starter"
)

object GamificationManager {
    private const val PREFS_NAME = "second_brain_gamification"
    private const val KEY_POINTS = "points"
    private const val KEY_CURRENT_STREAK = "current_streak"
    private const val KEY_BEST_STREAK = "best_streak"
    private const val KEY_LAST_STREAK_DATE = "last_streak_date"

    private val _state = MutableStateFlow(GamificationState())
    val state: StateFlow<GamificationState> = _state.asStateFlow()

    private fun dateStr(daysOffset: Int = 0): String {
        val cal = Calendar.getInstance().apply {
            if (daysOffset != 0) add(Calendar.DAY_OF_YEAR, daysOffset)
        }
        return SimpleDateFormat("yyyy-MM-dd", Locale.US).format(cal.time)
    }

    private fun computeLevel(points: Int): Pair<Int, String> {
        val level = (points / 100) + 1
        val title = when {
            level >= 10 -> "Legend"
            level >= 7 -> "Master"
            level >= 5 -> "Architect"
            level >= 3 -> "Momentum"
            level >= 2 -> "Focused"
            else -> "Starter"
        }
        return level to title
    }

    fun init(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val points = prefs.getInt(KEY_POINTS, 0)
        var streak = prefs.getInt(KEY_CURRENT_STREAK, 0)
        val best = prefs.getInt(KEY_BEST_STREAK, 0)
        val lastDate = prefs.getString(KEY_LAST_STREAK_DATE, null)

        val today = dateStr(0)
        val yesterday = dateStr(-1)
        if (lastDate != null && lastDate != today && lastDate != yesterday) {
            streak = 0
            prefs.edit().putInt(KEY_CURRENT_STREAK, 0).apply()
        }

        val (level, title) = computeLevel(points)
        _state.value = GamificationState(
            points = points,
            currentStreak = streak,
            bestStreak = best,
            level = level,
            levelTitle = title
        )
    }

    fun pointsForPriority(priority: String): Int = when (priority.lowercase()) {
        "high" -> 25
        "medium" -> 15
        else -> 10
    }

    fun onTaskStatusChanged(context: Context, previousTask: TaskEntity, newStatus: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        var points = prefs.getInt(KEY_POINTS, 0)
        var streak = prefs.getInt(KEY_CURRENT_STREAK, 0)
        var best = prefs.getInt(KEY_BEST_STREAK, 0)
        var lastDate = prefs.getString(KEY_LAST_STREAK_DATE, null)

        val taskPoints = pointsForPriority(previousTask.priority)

        if (previousTask.status != "completed" && newStatus == "completed") {
            points += taskPoints
            val today = dateStr(0)
            val yesterday = dateStr(-1)
            if (lastDate != today) {
                streak = if (lastDate == yesterday) streak + 1 else 1
                lastDate = today
                if (streak > best) best = streak
            }
        } else if (previousTask.status == "completed" && newStatus != "completed") {
            points = (points - taskPoints).coerceAtLeast(0)
        }

        prefs.edit()
            .putInt(KEY_POINTS, points)
            .putInt(KEY_CURRENT_STREAK, streak)
            .putInt(KEY_BEST_STREAK, best)
            .putString(KEY_LAST_STREAK_DATE, lastDate)
            .apply()

        val (level, title) = computeLevel(points)
        _state.value = GamificationState(
            points = points,
            currentStreak = streak,
            bestStreak = best,
            level = level,
            levelTitle = title
        )
    }
}

