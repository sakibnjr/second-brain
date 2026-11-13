package com.planner.android.ui.utils

import androidx.compose.ui.graphics.Color
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

data class SmartDueDate(
    val label: String,
    val badgeText: String,
    val fullDateFormatted: String,
    val color: Color,
    val isOverdue: Boolean,
    val isToday: Boolean,
    val isTomorrow: Boolean,
    val diffDays: Int
)

object DateUtils {

    fun parseSmartDueDate(dueAtIso: String?): SmartDueDate? {
        if (dueAtIso.isNullOrBlank()) return null

        return try {
            val dateStr = dueAtIso.take(10)
            val parts = dateStr.split("-")
            if (parts.size < 3) return null

            val year = parts[0].toIntOrNull() ?: return null
            val month = (parts[1].toIntOrNull() ?: return null) - 1
            val day = parts[2].toIntOrNull() ?: return null

            val dueCal = Calendar.getInstance().apply {
                set(Calendar.YEAR, year)
                set(Calendar.MONTH, month)
                set(Calendar.DAY_OF_MONTH, day)
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }

            val todayCal = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }

            val diffMillis = dueCal.timeInMillis - todayCal.timeInMillis
            val diffDays = Math.round(diffMillis.toDouble() / (1000 * 60 * 60 * 24)).toInt()

            val isOverdue = diffDays < 0
            val isToday = diffDays == 0
            val isTomorrow = diffDays == 1

            val dayOfWeekFormat = SimpleDateFormat("EEEE", Locale.getDefault())
            val monthDayFormat = SimpleDateFormat("MMM d", Locale.getDefault())
            val fullFormat = SimpleDateFormat("EEEE, MMMM d, yyyy", Locale.getDefault())

            val fullDateStr = fullFormat.format(dueCal.time)

            val (label, badgeText, color) = when {
                isOverdue -> {
                    val badge = if (diffDays == -1) "⚠️ Overdue (Yesterday)" else "⚠️ Overdue (${monthDayFormat.format(dueCal.time)})"
                    Triple("Overdue", badge, Color(0xFFEF4444))
                }
                isToday -> {
                    Triple("Today", "📅 Today", Color(0xFFD97706))
                }
                isTomorrow -> {
                    Triple("Tomorrow", "📅 Tomorrow", Color(0xFF2563EB))
                }
                diffDays in 2..6 -> {
                    val dayName = dayOfWeekFormat.format(dueCal.time)
                    Triple(dayName, "📅 $dayName", Color(0xFF7C3AED))
                }
                else -> {
                    val dateFormatted = monthDayFormat.format(dueCal.time)
                    Triple(dateFormatted, "📅 $dateFormatted", Color(0xFF64748B))
                }
            }

            SmartDueDate(
                label = label,
                badgeText = badgeText,
                fullDateFormatted = fullDateStr,
                color = color,
                isOverdue = isOverdue,
                isToday = isToday,
                isTomorrow = isTomorrow,
                diffDays = diffDays
            )
        } catch (e: Exception) {
            null
        }
    }

    fun formatIsoTimestamp(isoStr: String?): String {
        if (isoStr.isNullOrBlank()) return "N/A"
        return try {
            val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }
            val date = isoFormat.parse(isoStr.take(19)) ?: return isoStr.take(10)
            SimpleDateFormat("MMM d, yyyy · h:mm a", Locale.getDefault()).format(date)
        } catch (e: Exception) {
            isoStr.take(10)
        }
    }
}
