package com.planner.android.ui.components

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.text.format.DateFormat
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.planner.android.data.models.TaskEntity
import com.planner.android.notifications.ReminderScheduler
import com.planner.android.ui.utils.DateUtils
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun TaskDetailsDialog(
    task: TaskEntity,
    onDismiss: () -> Unit,
    onToggle: () -> Unit,
    onDelete: () -> Unit,
    onUpdate: (TaskEntity) -> Unit = {}
) {
    val context = LocalContext.current
    var isEditing by remember { mutableStateOf(false) }

    // Edit state holders
    var editTitle by remember(task) { mutableStateOf(task.title) }
    var editDesc by remember(task) { mutableStateOf(task.description ?: "") }
    var editPriority by remember(task) { mutableStateOf(task.priority) }
    var editDueAt by remember(task) { mutableStateOf(task.dueAt ?: "") }
    var editReminderAt by remember(task) { mutableStateOf(task.reminderAt ?: "") }

    val isCompleted = task.status == "completed"
    val isDark = isSystemInDarkTheme()
    val smartDue = DateUtils.parseSmartDueDate(task.dueAt)

    val dateFormat = remember { SimpleDateFormat("yyyy-MM-dd", Locale.US) }
    val todayDateStr = remember { dateFormat.format(Date()) }
    val calTomorrow = remember { Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, 1) } }
    val tomorrowDateStr = remember { dateFormat.format(calTomorrow.time) }

    val (priorityBg, priorityColor, priorityLabel) = when (task.priority.lowercase()) {
        "high" -> Triple(Color(0xFFEF4444).copy(alpha = 0.15f), Color(0xFFEF4444), "High Priority")
        "medium" -> Triple(Color(0xFFF59E0B).copy(alpha = 0.15f), Color(0xFFF59E0B), "Medium Priority")
        else -> Triple(Color(0xFF10B981).copy(alpha = 0.15f), Color(0xFF10B981), "Low Priority")
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .wrapContentHeight()
                .padding(vertical = 20.dp),
            shape = RoundedCornerShape(24.dp),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 6.dp,
            shadowElevation = 14.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(22.dp)
            ) {
                // Header Bar
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (!isEditing) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Priority Badge
                            Surface(
                                color = priorityBg,
                                shape = RoundedCornerShape(8.dp),
                                border = BorderStroke(1.dp, priorityColor.copy(alpha = 0.4f))
                            ) {
                                Text(
                                    text = priorityLabel,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = priorityColor,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }

                            // Status Badge
                            Surface(
                                color = if (isCompleted) Color(0xFF10B981).copy(alpha = 0.15f) else MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text(
                                    text = if (isCompleted) "Completed" else "To Do",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isCompleted) Color(0xFF10B981) else MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }
                    } else {
                        Text(
                            text = "Edit Task",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (!isEditing) {
                            IconButton(
                                onClick = { isEditing = true },
                                modifier = Modifier.size(32.dp)
                            ) {
                                Icon(
                                    Icons.Outlined.Edit,
                                    contentDescription = "Edit Task",
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(4.dp))
                        }
                        IconButton(
                            onClick = {
                                if (isEditing) isEditing = false else onDismiss()
                            },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(
                                Icons.Default.Close,
                                contentDescription = "Close",
                                tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Scrollable Body
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f, fill = false)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    if (!isEditing) {
                        // --- VIEW MODE ---

                        // 1. Task Title
                        Text(
                            text = task.title,
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            textDecoration = if (isCompleted) TextDecoration.LineThrough else TextDecoration.None,
                            color = if (isCompleted) MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f) else MaterialTheme.colorScheme.onSurface,
                            lineHeight = 28.sp
                        )

                        // 2. Due Date Smart Card
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                            color = if (smartDue?.isOverdue == true) {
                                Color(0xFFEF4444).copy(alpha = 0.08f)
                            } else {
                                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f)
                            },
                            border = BorderStroke(
                                1.dp,
                                if (smartDue?.isOverdue == true) Color(0xFFEF4444).copy(alpha = 0.3f)
                                else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)
                            )
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Surface(
                                    shape = CircleShape,
                                    color = if (smartDue != null) smartDue.color.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant,
                                    modifier = Modifier.size(36.dp)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(
                                            imageVector = if (smartDue?.isOverdue == true) Icons.Default.WarningAmber else Icons.Default.CalendarToday,
                                            contentDescription = null,
                                            tint = smartDue?.color ?: MaterialTheme.colorScheme.onSurfaceVariant,
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.width(12.dp))

                                Column {
                                    Text(
                                        text = if (smartDue != null) {
                                            when {
                                                smartDue.isOverdue -> "Overdue Schedule"
                                                smartDue.isToday -> "Due Today"
                                                smartDue.isTomorrow -> "Due Tomorrow"
                                                smartDue.diffDays in 2..6 -> "Due this ${smartDue.label}"
                                                else -> "Due on ${smartDue.label}"
                                            }
                                        } else "No Due Date Scheduled",
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = smartDue?.color ?: MaterialTheme.colorScheme.onSurface
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = smartDue?.fullDateFormatted ?: "Tap the edit icon above to set a target date",
                                        fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                    )
                                }
                            }
                        }

                        // 3. Reminder Banner (always interactive in View Mode)
                        if (!task.reminderAt.isNullOrBlank()) {
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        launchReminderDateTimePicker(context, task.reminderAt) { pickedIso ->
                                            onUpdate(task.copy(reminderAt = pickedIso))
                                        }
                                    },
                                shape = RoundedCornerShape(12.dp),
                                color = Color(0xFFF59E0B).copy(alpha = 0.10f),
                                border = BorderStroke(1.dp, Color(0xFFF59E0B).copy(alpha = 0.25f))
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 12.dp, vertical = 9.dp)
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            Icons.Default.NotificationsActive,
                                            contentDescription = null,
                                            tint = Color(0xFFF59E0B),
                                            modifier = Modifier.size(16.dp)
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Column {
                                            Text(
                                                text = "Reminder Scheduled",
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = Color(0xFFD97706)
                                            )
                                            Text(
                                                text = DateUtils.formatIsoTimestamp(task.reminderAt),
                                                fontSize = 10.sp,
                                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.65f)
                                            )
                                        }
                                    }
                                    Icon(
                                        Icons.Outlined.Edit,
                                        contentDescription = "Change reminder",
                                        tint = Color(0xFFD97706),
                                        modifier = Modifier.size(15.dp)
                                    )
                                }
                            }
                        } else {
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        launchReminderDateTimePicker(context, null) { pickedIso ->
                                            onUpdate(task.copy(reminderAt = pickedIso))
                                        }
                                    },
                                shape = RoundedCornerShape(12.dp),
                                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.06f),
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.2f))
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 12.dp, vertical = 10.dp)
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            Icons.Default.NotificationsNone,
                                            contentDescription = null,
                                            tint = MaterialTheme.colorScheme.primary,
                                            modifier = Modifier.size(16.dp)
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Column {
                                            Text(
                                                text = "Set Reminder",
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = MaterialTheme.colorScheme.primary
                                            )
                                            Text(
                                                text = "Tap to schedule a notification alarm",
                                                fontSize = 10.sp,
                                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                            )
                                        }
                                    }
                                    Icon(
                                        Icons.Default.AddAlarm,
                                        contentDescription = "Set reminder",
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }
                        }

                        // 4. Notes & Details Section
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.25f),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(14.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        Icons.Default.Subject,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "Notes & Details",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.75f)
                                    )
                                }

                                Spacer(modifier = Modifier.height(8.dp))

                                if (!task.description.isNullOrBlank()) {
                                    Text(
                                        text = task.description,
                                        fontSize = 13.sp,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.85f),
                                        lineHeight = 20.sp
                                    )
                                } else {
                                    Text(
                                        text = "No additional notes or description provided for this task.",
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.45f)
                                    )
                                }
                            }
                        }

                        // 5. Timestamps Footer
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "Created: ${DateUtils.formatIsoTimestamp(task.createdAt)}",
                                fontSize = 10.sp,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.45f)
                            )
                        }

                    } else {
                        // --- EDIT MODE ---

                        // 1. Edit Title
                        OutlinedTextField(
                            value = editTitle,
                            onValueChange = { editTitle = it },
                            label = { Text("Task Title *", fontSize = 12.sp) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        )

                        // 2. Edit Description
                        OutlinedTextField(
                            value = editDesc,
                            onValueChange = { editDesc = it },
                            label = { Text("Notes & Context", fontSize = 12.sp) },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            minLines = 2,
                            maxLines = 4
                        )

                        // 3. Priority Selector (Equal-width clean pills)
                        Text(
                            text = "Priority",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                        )
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            listOf("low" to "Low", "medium" to "Medium", "high" to "High").forEach { (valKey, valLabel) ->
                                val isSelected = editPriority.lowercase() == valKey
                                val chipColor = when (valKey) {
                                    "high" -> Color(0xFFEF4444)
                                    "medium" -> Color(0xFFF59E0B)
                                    else -> Color(0xFF10B981)
                                }
                                Surface(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clip(RoundedCornerShape(10.dp))
                                        .clickable { editPriority = valKey },
                                    shape = RoundedCornerShape(10.dp),
                                    color = if (isSelected) chipColor.copy(alpha = 0.14f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f),
                                    border = BorderStroke(
                                        1.dp,
                                        if (isSelected) chipColor else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)
                                    )
                                ) {
                                    Box(
                                        modifier = Modifier.padding(vertical = 9.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = valLabel,
                                            fontSize = 12.sp,
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                            color = if (isSelected) chipColor else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                                        )
                                    }
                                }
                            }
                        }

                        // 4. Unified Schedule & Reminder Card (Due Date/Time + Reminder)
                        ScheduleReminderCard(
                            dueAtIso = editDueAt.ifBlank { null },
                            onDueChange = { editDueAt = it ?: "" },
                            reminderAtIso = editReminderAt.ifBlank { null },
                            onReminderChange = { editReminderAt = it ?: "" }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(18.dp))

                // Bottom Action Buttons
                if (!isEditing) {
                    // View Mode: Delete + Toggle Complete
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedButton(
                            onClick = onDelete,
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, Color(0xFFEF4444).copy(alpha = 0.4f)),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFEF4444)),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp)
                        ) {
                            Icon(Icons.Default.DeleteOutline, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(text = "Delete", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                        }

                        Button(
                            onClick = onToggle,
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (isCompleted) MaterialTheme.colorScheme.surfaceVariant else Color(0xFF10B981)
                            ),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp)
                        ) {
                            Icon(
                                imageVector = if (isCompleted) Icons.Default.Replay else Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = if (isCompleted) MaterialTheme.colorScheme.onSurfaceVariant else Color.White,
                                modifier = Modifier.size(17.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = if (isCompleted) "Mark as To Do" else "Mark Complete",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isCompleted) MaterialTheme.colorScheme.onSurfaceVariant else Color.White
                            )
                        }
                    }
                } else {
                    // Edit Mode: Cancel + Save Changes
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedButton(
                            onClick = { isEditing = false },
                            modifier = Modifier.weight(0.4f),
                            shape = RoundedCornerShape(12.dp),
                            contentPadding = PaddingValues(vertical = 10.dp)
                        ) {
                            Text("Cancel", fontSize = 12.sp)
                        }

                        Button(
                            onClick = {
                                if (editTitle.isNotBlank()) {
                                    val updated = task.copy(
                                        title = editTitle.trim(),
                                        description = editDesc.trim().ifBlank { null },
                                        priority = editPriority,
                                        dueAt = editDueAt.ifBlank { null },
                                        reminderAt = editReminderAt.ifBlank { null }
                                    )
                                    onUpdate(updated)
                                    isEditing = false
                                }
                            },
                            enabled = editTitle.isNotBlank(),
                            modifier = Modifier.weight(0.6f),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                            contentPadding = PaddingValues(vertical = 10.dp)
                        ) {
                            Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Save Changes", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
