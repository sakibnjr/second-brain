package com.planner.android.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.planner.android.data.models.TaskEntity
import com.planner.android.ui.components.ScheduleReminderCard
import com.planner.android.ui.components.TaskDetailsDialog
import com.planner.android.ui.utils.DateUtils
import com.planner.android.ui.viewmodels.TaskViewModel
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TasksScreen(viewModel: TaskViewModel) {
    val tasks by viewModel.tasks.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val statusFilter by viewModel.statusFilter.collectAsState()

    var showAddDialog by remember { mutableStateOf(false) }
    var detailsTask by remember { mutableStateOf<TaskEntity?>(null) }

    val todayStr = remember {
        SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Spacer(modifier = Modifier.height(2.dp))

            // 1. Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { viewModel.setSearchQuery(it) },
                placeholder = { Text("Search tasks...", fontSize = 13.sp) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                leadingIcon = {
                    Icon(
                        Icons.Default.Search,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp),
                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    )
                },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { viewModel.setSearchQuery("") }) {
                            Icon(Icons.Default.Clear, contentDescription = "Clear", modifier = Modifier.size(16.dp))
                        }
                    }
                }
            )

            // 2. Segmented Filter Bar (iOS / Things 3 style)
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(4.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    val filters = listOf(
                        "all" to "All",
                        "todo" to "To Do",
                        "in_progress" to "Doing",
                        "completed" to "Done"
                    )
                    filters.forEach { (key, label) ->
                        val isSelected = statusFilter == key
                        Surface(
                            modifier = Modifier
                                .weight(1f)
                                .height(32.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .clickable { viewModel.setStatusFilter(key) },
                            color = if (isSelected) MaterialTheme.colorScheme.surface else Color.Transparent,
                            shape = RoundedCornerShape(10.dp),
                            shadowElevation = if (isSelected) 1.dp else 0.dp
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    text = label,
                                    fontSize = 12.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                )
                            }
                        }
                    }
                }
            }

            // 3. Tasks List or Empty State
            if (tasks.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                        modifier = Modifier.padding(24.dp)
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                            modifier = Modifier.size(54.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    Icons.Outlined.CheckCircle,
                                    contentDescription = null,
                                    modifier = Modifier.size(28.dp),
                                    tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.45f)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = if (searchQuery.isNotEmpty()) "No tasks match your search" else "No tasks found",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = if (searchQuery.isNotEmpty())
                                "Try searching with different keywords."
                            else
                                "Tap (+) below to add your first task.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(tasks, key = { it.id }) { task ->
                        TaskCardItem(
                            task = task,
                            onToggle = { viewModel.toggleTaskStatus(task) },
                            onDelete = { viewModel.deleteTask(task.id) },
                            onOpenDetails = { detailsTask = task }
                        )
                    }
                    item {
                        Spacer(modifier = Modifier.height(84.dp)) // Padding for bottom bar & FAB
                    }
                }
            }
        }

        if (detailsTask != null) {
            TaskDetailsDialog(
                task = detailsTask!!,
                onDismiss = { detailsTask = null },
                onToggle = {
                    viewModel.toggleTaskStatus(detailsTask!!)
                    detailsTask = null
                },
                onDelete = {
                    viewModel.deleteTask(detailsTask!!.id)
                    detailsTask = null
                },
                onUpdate = { updated ->
                    viewModel.updateTask(updated)
                    detailsTask = null
                }
            )
        }
    }

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun TaskCardItem(
    task: TaskEntity,
    onToggle: () -> Unit,
    onDelete: () -> Unit,
    onOpenDetails: () -> Unit
) {
    val isCompleted = task.status == "completed"
    val isDark = isSystemInDarkTheme()
    val smartDue = remember(task.dueAt) { DateUtils.parseSmartDueDate(task.dueAt) }

    // Priority color mapping: full card tint + accent border
    val (bgColor, accentColor) = when (task.priority.lowercase()) {
        "high" -> if (isDark) Pair(Color(0xFF2B1417), Color(0xFFEF4444)) else Pair(Color(0xFFFEF2F2), Color(0xFFEF4444))
        "medium" -> if (isDark) Pair(Color(0xFF261D10), Color(0xFFF59E0B)) else Pair(Color(0xFFFFFBEB), Color(0xFFF59E0B))
        else -> if (isDark) Pair(Color(0xFF18181B), Color(0xFF10B981)) else Pair(Color(0xFFFFFFFF), Color(0xFF10B981))
    }

    val currentOnToggle by rememberUpdatedState(onToggle)
    val currentOnDelete by rememberUpdatedState(onDelete)

    val dismissState = rememberSwipeToDismissBoxState(
        confirmValueChange = { dismissValue ->
            dismissValue != SwipeToDismissBoxValue.Settled
        }
    )

    LaunchedEffect(dismissState.currentValue) {
        when (dismissState.currentValue) {
            SwipeToDismissBoxValue.StartToEnd -> {
                currentOnToggle()
                dismissState.reset()
            }
            SwipeToDismissBoxValue.EndToStart -> {
                currentOnDelete()
            }
            SwipeToDismissBoxValue.Settled -> Unit
        }
    }

    SwipeToDismissBox(
        state = dismissState,
        enableDismissFromStartToEnd = true,
        enableDismissFromEndToStart = true,
        backgroundContent = {
            val direction = dismissState.dismissDirection
            val color by animateColorAsState(
                targetValue = when (dismissState.targetValue) {
                    SwipeToDismissBoxValue.StartToEnd -> Color(0xFF10B981) // Green for Complete
                    SwipeToDismissBoxValue.EndToStart -> Color(0xFFEF4444) // Red for Delete
                    SwipeToDismissBoxValue.Settled -> when (direction) {
                        SwipeToDismissBoxValue.StartToEnd -> Color(0xFF10B981).copy(alpha = 0.85f)
                        SwipeToDismissBoxValue.EndToStart -> Color(0xFFEF4444).copy(alpha = 0.85f)
                        else -> Color.Transparent
                    }
                },
                label = "swipeBgColor"
            )

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .clip(RoundedCornerShape(12.dp))
                    .background(color)
                    .padding(horizontal = 16.dp),
                contentAlignment = if (direction == SwipeToDismissBoxValue.StartToEnd) Alignment.CenterStart else Alignment.CenterEnd
            ) {
                if (direction == SwipeToDismissBoxValue.StartToEnd) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "Complete",
                            tint = Color.White,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (isCompleted) "Mark To Do" else "Complete",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                    }
                } else if (direction == SwipeToDismissBoxValue.EndToStart) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "Delete",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Icon(
                            imageVector = Icons.Default.Delete,
                            contentDescription = "Delete",
                            tint = Color.White,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }
        }
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .clickable { onOpenDetails() },
            shape = RoundedCornerShape(16.dp),
            color = if (isCompleted) MaterialTheme.colorScheme.surface.copy(alpha = 0.65f) else MaterialTheme.colorScheme.surface,
            border = BorderStroke(
                width = 1.dp,
                color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f)
            )
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    modifier = Modifier
                        .size(22.dp)
                        .clip(CircleShape)
                        .clickable { onToggle() },
                    shape = CircleShape,
                    color = if (isCompleted) accentColor else Color.Transparent,
                    border = BorderStroke(
                        width = 1.8.dp,
                        color = if (isCompleted) accentColor else accentColor.copy(alpha = 0.75f)
                    )
                ) {
                    if (isCompleted) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                Icons.Default.Check,
                                contentDescription = "Completed",
                                tint = Color.White,
                                modifier = Modifier.size(13.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.weight(1f, fill = false)
                        ) {
                            Text(
                                text = task.title,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Medium,
                                textDecoration = if (isCompleted) TextDecoration.LineThrough else TextDecoration.None,
                                color = if (isCompleted)
                                    MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                                else
                                    MaterialTheme.colorScheme.onSurface,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )

                            if (!task.description.isNullOrBlank()) {
                                Spacer(modifier = Modifier.width(5.dp))
                                Icon(
                                    Icons.Default.Subject,
                                    contentDescription = "Has description",
                                    tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.35f),
                                    modifier = Modifier.size(13.dp)
                                )
                            }
                        }

                        if (smartDue != null && !isCompleted) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = smartDue.label,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = smartDue.color
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.width(4.dp))

                IconButton(
                    onClick = onDelete,
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(
                        Icons.Default.DeleteOutline,
                        contentDescription = "Delete",
                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f),
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun AddTaskDialog(
    onDismiss: () -> Unit,
    onConfirm: (String, String?, String, String?, String?) -> Unit
) {
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var priority by remember { mutableStateOf("medium") }
    var dueAt by remember { mutableStateOf("") }
    var reminderAtIso by remember { mutableStateOf<String?>(null) }

    val dateFormat = remember { SimpleDateFormat("yyyy-MM-dd", Locale.US) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = "New Task",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
            ) {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    placeholder = { Text("Task Title *", fontSize = 13.sp) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    placeholder = { Text("Notes / Details (Optional)", fontSize = 12.sp) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    minLines = 2,
                    maxLines = 3
                )

                Text("Priority:", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("low", "medium", "high").forEach { p ->
                        val isSelected = priority == p
                        FilterChip(
                            selected = isSelected,
                            onClick = { priority = p },
                            label = { Text(p.replaceFirstChar { it.uppercase() }, fontSize = 11.sp) },
                            shape = RoundedCornerShape(8.dp)
                        )
                    }
                }

                // Unified Due Date & Reminder Card
                ScheduleReminderCard(
                    dueAtIso = dueAt.ifBlank { null },
                    onDueChange = { dueAt = it ?: "" },
                    reminderAtIso = reminderAtIso,
                    onReminderChange = { reminderAtIso = it }
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (title.isNotBlank()) {
                        onConfirm(
                            title,
                            description.ifBlank { null },
                            priority,
                            dueAt.ifBlank { null },
                            reminderAtIso
                        )
                    }
                },
                enabled = title.isNotBlank(),
                shape = RoundedCornerShape(10.dp)
            ) {
                Text("Add Task")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        },
        shape = RoundedCornerShape(18.dp)
    )
}
