package com.planner.android.ui.components

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.content.Context
import android.text.format.DateFormat
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.planner.android.notifications.ReminderScheduler
import com.planner.android.ui.utils.DateUtils
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

private fun formatUtcIso(millis: Long): String {
    return SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }.format(Date(millis))
}

private fun formatCompactDateTime(isoStr: String?): String {
    val millis = ReminderScheduler.parseTimestampMillis(isoStr) ?: return DateUtils.formatIsoTimestamp(isoStr)
    val cal = Calendar.getInstance().apply { timeInMillis = millis }
    val today = Calendar.getInstance()
    val tomorrow = Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, 1) }

    val timeStr = SimpleDateFormat("h:mm a", Locale.getDefault()).format(cal.time)
    return when {
        cal.get(Calendar.YEAR) == today.get(Calendar.YEAR) &&
            cal.get(Calendar.DAY_OF_YEAR) == today.get(Calendar.DAY_OF_YEAR) -> "Today, $timeStr"
        cal.get(Calendar.YEAR) == tomorrow.get(Calendar.YEAR) &&
            cal.get(Calendar.DAY_OF_YEAR) == tomorrow.get(Calendar.DAY_OF_YEAR) -> "Tomorrow, $timeStr"
        else -> SimpleDateFormat("MMM d, h:mm a", Locale.getDefault()).format(cal.time)
    }
}

fun launchReminderDateTimePicker(
    context: Context,
    initialIso: String? = null,
    onPickedIso: (String) -> Unit
) {
    val initialCal = Calendar.getInstance()
    val parsedMillis = ReminderScheduler.parseTimestampMillis(initialIso)
    if (parsedMillis != null && parsedMillis > System.currentTimeMillis()) {
        initialCal.timeInMillis = parsedMillis
    } else {
        initialCal.add(Calendar.MINUTE, 15)
        initialCal.set(Calendar.SECOND, 0)
        initialCal.set(Calendar.MILLISECOND, 0)
    }

    DatePickerDialog(
        context,
        { _, year, month, dayOfMonth ->
            TimePickerDialog(
                context,
                { _, hourOfDay, minute ->
                    val pickedCal = Calendar.getInstance().apply {
                        set(Calendar.YEAR, year)
                        set(Calendar.MONTH, month)
                        set(Calendar.DAY_OF_MONTH, dayOfMonth)
                        set(Calendar.HOUR_OF_DAY, hourOfDay)
                        set(Calendar.MINUTE, minute)
                        set(Calendar.SECOND, 0)
                        set(Calendar.MILLISECOND, 0)
                    }
                    if (pickedCal.timeInMillis <= System.currentTimeMillis()) {
                        Toast.makeText(
                            context,
                            "Reminder must be set for a future time",
                            Toast.LENGTH_SHORT
                        ).show()
                    } else {
                        onPickedIso(formatUtcIso(pickedCal.timeInMillis))
                    }
                },
                initialCal.get(Calendar.HOUR_OF_DAY),
                initialCal.get(Calendar.MINUTE),
                DateFormat.is24HourFormat(context)
            ).show()
        },
        initialCal.get(Calendar.YEAR),
        initialCal.get(Calendar.MONTH),
        initialCal.get(Calendar.DAY_OF_MONTH)
    ).apply {
        datePicker.minDate = System.currentTimeMillis() - 1000
    }.show()
}

private fun launchDueDatePicker(
    context: Context,
    currentDueIso: String?,
    onPickedIso: (String) -> Unit
) {
    val baseCal = Calendar.getInstance()
    ReminderScheduler.parseTimestampMillis(currentDueIso)?.let { baseCal.timeInMillis = it }
    val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    DatePickerDialog(
        context,
        { _, y, m, d ->
            val picked = Calendar.getInstance().apply {
                set(Calendar.YEAR, y)
                set(Calendar.MONTH, m)
                set(Calendar.DAY_OF_MONTH, d)
            }
            onPickedIso("${dateFormat.format(picked.time)}T23:59:59Z")
        },
        baseCal.get(Calendar.YEAR),
        baseCal.get(Calendar.MONTH),
        baseCal.get(Calendar.DAY_OF_MONTH)
    ).show()
}

private fun launchDueTimePicker(
    context: Context,
    currentDueIso: String?,
    onPickedIso: (String) -> Unit
) {
    val baseCal = Calendar.getInstance()
    val parsedDue = ReminderScheduler.parseTimestampMillis(currentDueIso)
    if (parsedDue != null && currentDueIso?.endsWith("T23:59:59Z") == false) {
        baseCal.timeInMillis = parsedDue
    } else if (!currentDueIso.isNullOrBlank()) {
        val parts = currentDueIso.take(10).split("-")
        if (parts.size == 3) {
            baseCal.set(
                parts[0].toIntOrNull() ?: baseCal.get(Calendar.YEAR),
                (parts[1].toIntOrNull() ?: 1) - 1,
                parts[2].toIntOrNull() ?: baseCal.get(Calendar.DAY_OF_MONTH)
            )
        }
    }

    TimePickerDialog(
        context,
        { _, hourOfDay, minute ->
            baseCal.set(Calendar.HOUR_OF_DAY, hourOfDay)
            baseCal.set(Calendar.MINUTE, minute)
            baseCal.set(Calendar.SECOND, 0)
            onPickedIso(formatUtcIso(baseCal.timeInMillis))
        },
        baseCal.get(Calendar.HOUR_OF_DAY),
        baseCal.get(Calendar.MINUTE),
        DateFormat.is24HourFormat(context)
    ).show()
}

@Composable
fun DueDateRow(
    dueAtIso: String?,
    onDueChange: (String?) -> Unit
) {
    val context = LocalContext.current
    var showMenu by remember { mutableStateOf(false) }
    val dateFormat = remember { SimpleDateFormat("yyyy-MM-dd", Locale.US) }

    val valueText = when {
        dueAtIso.isNullOrBlank() -> "Not set"
        dueAtIso.endsWith("T23:59:59Z") -> {
            val smart = DateUtils.parseSmartDueDate(dueAtIso)
            smart?.label ?: dueAtIso.take(10)
        }
        else -> formatCompactDateTime(dueAtIso)
    }

    Box(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { showMenu = true }
                .padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Icon(
                    Icons.Default.CalendarToday,
                    contentDescription = null,
                    tint = if (dueAtIso.isNullOrBlank()) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(18.dp)
                )
                Text(
                    text = "Due",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Row(
                modifier = Modifier.weight(1f),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.End
            ) {
                Text(
                    text = valueText,
                    fontSize = 12.sp,
                    fontWeight = if (dueAtIso.isNullOrBlank()) FontWeight.Normal else FontWeight.SemiBold,
                    color = if (dueAtIso.isNullOrBlank()) MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f) else MaterialTheme.colorScheme.primary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    textAlign = TextAlign.End,
                    modifier = Modifier.weight(1f, fill = false)
                )
                Spacer(modifier = Modifier.width(6.dp))
                if (!dueAtIso.isNullOrBlank()) {
                    IconButton(
                        onClick = { onDueChange(null) },
                        modifier = Modifier.size(22.dp)
                    ) {
                        Icon(
                            Icons.Default.Close,
                            contentDescription = "Clear due date",
                            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.45f),
                            modifier = Modifier.size(14.dp)
                        )
                    }
                } else {
                    Icon(
                        Icons.Default.KeyboardArrowDown,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }

        DropdownMenu(
            expanded = showMenu,
            onDismissRequest = { showMenu = false }
        ) {
            DropdownMenuItem(
                text = { Text("Today", fontSize = 13.sp) },
                leadingIcon = { Icon(Icons.Default.Today, null, modifier = Modifier.size(18.dp)) },
                onClick = {
                    showMenu = false
                    onDueChange("${dateFormat.format(Date())}T23:59:59Z")
                }
            )
            DropdownMenuItem(
                text = { Text("Tomorrow", fontSize = 13.sp) },
                leadingIcon = { Icon(Icons.Default.Event, null, modifier = Modifier.size(18.dp)) },
                onClick = {
                    showMenu = false
                    val cal = Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, 1) }
                    onDueChange("${dateFormat.format(cal.time)}T23:59:59Z")
                }
            )
            DropdownMenuItem(
                text = { Text("Pick Date...", fontSize = 13.sp) },
                leadingIcon = { Icon(Icons.Default.CalendarMonth, null, modifier = Modifier.size(18.dp)) },
                onClick = {
                    showMenu = false
                    launchDueDatePicker(context, dueAtIso) { onDueChange(it) }
                }
            )
            DropdownMenuItem(
                text = { Text("Pick Time...", fontSize = 13.sp) },
                leadingIcon = { Icon(Icons.Default.AccessTime, null, modifier = Modifier.size(18.dp)) },
                onClick = {
                    showMenu = false
                    launchDueTimePicker(context, dueAtIso) { onDueChange(it) }
                }
            )
        }
    }
}

@Composable
fun ReminderRow(
    reminderAtIso: String?,
    onReminderChange: (String?) -> Unit
) {
    val context = LocalContext.current
    var showMenu by remember { mutableStateOf(false) }

    val triggerMillis = ReminderScheduler.parseTimestampMillis(reminderAtIso)
    val isInPast = triggerMillis != null && triggerMillis <= System.currentTimeMillis()
    val accentColor = if (isInPast) Color(0xFFEF4444) else Color(0xFFD97706)

    val valueText = when {
        reminderAtIso.isNullOrBlank() -> "Off"
        isInPast -> "Past · ${formatCompactDateTime(reminderAtIso)}"
        else -> formatCompactDateTime(reminderAtIso)
    }

    Box(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { showMenu = true }
                .padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Icon(
                    if (reminderAtIso.isNullOrBlank()) Icons.Default.NotificationsNone else Icons.Default.NotificationsActive,
                    contentDescription = null,
                    tint = if (reminderAtIso.isNullOrBlank()) MaterialTheme.colorScheme.onSurfaceVariant else accentColor,
                    modifier = Modifier.size(18.dp)
                )
                Text(
                    text = "Reminder",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Row(
                modifier = Modifier.weight(1f),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.End
            ) {
                Text(
                    text = valueText,
                    fontSize = 12.sp,
                    fontWeight = if (reminderAtIso.isNullOrBlank()) FontWeight.Normal else FontWeight.SemiBold,
                    color = if (reminderAtIso.isNullOrBlank()) MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f) else accentColor,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    textAlign = TextAlign.End,
                    modifier = Modifier.weight(1f, fill = false)
                )
                Spacer(modifier = Modifier.width(6.dp))
                if (!reminderAtIso.isNullOrBlank()) {
                    IconButton(
                        onClick = { onReminderChange(null) },
                        modifier = Modifier.size(22.dp)
                    ) {
                        Icon(
                            Icons.Default.Close,
                            contentDescription = "Turn off reminder",
                            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.45f),
                            modifier = Modifier.size(14.dp)
                        )
                    }
                } else {
                    Icon(
                        Icons.Default.KeyboardArrowDown,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }

        DropdownMenu(
            expanded = showMenu,
            onDismissRequest = { showMenu = false }
        ) {
            DropdownMenuItem(
                text = { Text("In 10 minutes", fontSize = 13.sp) },
                leadingIcon = { Icon(Icons.Default.Notifications, null, modifier = Modifier.size(18.dp)) },
                onClick = {
                    showMenu = false
                    val cal = Calendar.getInstance().apply {
                        add(Calendar.MINUTE, 10)
                        set(Calendar.SECOND, 0)
                    }
                    onReminderChange(formatUtcIso(cal.timeInMillis))
                }
            )
            DropdownMenuItem(
                text = { Text("In 30 minutes", fontSize = 13.sp) },
                leadingIcon = { Icon(Icons.Default.Notifications, null, modifier = Modifier.size(18.dp)) },
                onClick = {
                    showMenu = false
                    val cal = Calendar.getInstance().apply {
                        add(Calendar.MINUTE, 30)
                        set(Calendar.SECOND, 0)
                    }
                    onReminderChange(formatUtcIso(cal.timeInMillis))
                }
            )
            DropdownMenuItem(
                text = { Text("In 1 hour", fontSize = 13.sp) },
                leadingIcon = { Icon(Icons.Default.Notifications, null, modifier = Modifier.size(18.dp)) },
                onClick = {
                    showMenu = false
                    val cal = Calendar.getInstance().apply {
                        add(Calendar.HOUR_OF_DAY, 1)
                        set(Calendar.SECOND, 0)
                    }
                    onReminderChange(formatUtcIso(cal.timeInMillis))
                }
            )
            DropdownMenuItem(
                text = { Text("Tomorrow 9:00 AM", fontSize = 13.sp) },
                leadingIcon = { Icon(Icons.Default.WbSunny, null, modifier = Modifier.size(18.dp)) },
                onClick = {
                    showMenu = false
                    val cal = Calendar.getInstance().apply {
                        add(Calendar.DAY_OF_YEAR, 1)
                        set(Calendar.HOUR_OF_DAY, 9)
                        set(Calendar.MINUTE, 0)
                        set(Calendar.SECOND, 0)
                    }
                    onReminderChange(formatUtcIso(cal.timeInMillis))
                }
            )
            HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
            DropdownMenuItem(
                text = { Text("Pick Date & Time...", fontSize = 13.sp, fontWeight = FontWeight.SemiBold) },
                leadingIcon = { Icon(Icons.Default.AccessTime, null, modifier = Modifier.size(18.dp)) },
                onClick = {
                    showMenu = false
                    launchReminderDateTimePicker(context, reminderAtIso) { pickedIso ->
                        onReminderChange(pickedIso)
                    }
                }
            )
        }
    }
}

@Composable
fun ScheduleReminderCard(
    dueAtIso: String?,
    onDueChange: ((String?) -> Unit)? = null,
    reminderAtIso: String?,
    onReminderChange: (String?) -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.25f),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f))
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            if (onDueChange != null) {
                DueDateRow(
                    dueAtIso = dueAtIso,
                    onDueChange = onDueChange
                )
                HorizontalDivider(
                    color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f),
                    modifier = Modifier.padding(horizontal = 14.dp)
                )
            }
            ReminderRow(
                reminderAtIso = reminderAtIso,
                onReminderChange = onReminderChange
            )
        }
    }
}
