package com.planner.android.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Event
import androidx.compose.material.icons.outlined.Lightbulb
import androidx.compose.material.icons.outlined.NotificationsNone
import androidx.compose.material.icons.outlined.School
import androidx.compose.material.icons.outlined.WarningAmber
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.planner.android.data.GamificationManager
import com.planner.android.data.GamificationState
import com.planner.android.data.models.IdeaEntity
import com.planner.android.data.models.LearningResourceEntity
import com.planner.android.data.models.TaskEntity
import com.planner.android.ui.components.TaskDetailsDialog
import com.planner.android.ui.utils.DateUtils
import com.planner.android.ui.viewmodels.DashboardViewModel
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel,
    userName: String? = null,
    onNavigate: (Int) -> Unit,
    onOpenQuickAdd: () -> Unit = {}
) {
    val state by viewModel.uiState.collectAsState()
    val gamification by GamificationManager.state.collectAsState()
    val haptic = LocalHapticFeedback.current
    var detailsTask by remember { mutableStateOf<TaskEntity?>(null) }

    val todayDateFormatted = remember {
        SimpleDateFormat("EEEE, MMMM d", Locale.getDefault()).format(Date())
    }
    val greeting = remember(userName) {
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        val periodGreeting = when (hour) {
            in 5..11 -> "Good morning"
            in 12..16 -> "Good afternoon"
            in 17..21 -> "Good evening"
            else -> "Late focus"
        }
        val firstName = userName?.trim()?.substringBefore(" ")?.takeIf { it.isNotBlank() }
        if (firstName != null) "$periodGreeting, $firstName" else periodGreeting
    }

    val completedCount = state.completedTodayCount
    val pendingCount = state.todayTasks.size
    val totalToday = completedCount + pendingCount
    val progressFloat = if (totalToday > 0) completedCount.toFloat() / totalToday.toFloat() else 0f

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(13.dp),
        contentPadding = PaddingValues(top = 2.dp, bottom = 24.dp)
    ) {
        // 1. Daily Pulse Hero Card (Greeting + Progress Ring + Streak & Level Momentum)
        item {
            DailyPulseHeroCard(
                dateEyebrow = todayDateFormatted.uppercase(),
                greeting = greeting,
                pendingCount = pendingCount,
                completedCount = completedCount,
                totalToday = totalToday,
                progressFloat = progressFloat,
                gamification = gamification
            )
        }

        // 2. Contextual Overdue Alert (Shown only when overdue tasks exist)
        if (state.overdueCount > 0) {
            item {
                OverdueBanner(
                    overdueCount = state.overdueCount,
                    onClick = { onNavigate(1) }
                )
            }
        }

        // 3. Quick Navigation Bento Strip (Today, Ideas, Courses)
        item {
            QuickOverviewBento(
                pendingToday = pendingCount,
                ideasCount = state.ideasCount,
                activeLearningCount = state.activeLearningCount,
                onNavigate = onNavigate
            )
        }

        // 4. Today's Focus Section Header
        item {
            SectionHeaderRow(
                title = "Today's Focus",
                badgeCount = pendingCount.takeIf { it > 0 },
                actionText = "All Tasks →",
                onAction = { onNavigate(1) }
            )
        }

        // 5. Today's Focus Unified Sheet with Inline Quick-Add
        item {
            TodaysFocusSheet(
                tasks = state.todayTasks,
                completedTodayCount = completedCount,
                onToggleTask = { task ->
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    viewModel.toggleTask(task)
                },
                onDeleteTask = { id -> viewModel.deleteTask(id) },
                onOpenDetails = { task -> detailsTask = task },
                onQuickAddInline = { title ->
                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                    viewModel.quickAddTask(title)
                },
                onOpenFullQuickAdd = onOpenQuickAdd
            )
        }

        // 6. Active Learning Track Preview (or Quick Starter)
        if (state.topLearningResource != null) {
            val resource = state.topLearningResource!!
            item {
                SectionHeaderRow(
                    title = "Active Learning",
                    actionText = "Courses →",
                    onAction = { onNavigate(3) }
                )
            }
            item {
                DashboardLearningCard(
                    resource = resource,
                    onProgressDelta = { delta ->
                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        viewModel.updateLearningProgress(resource, delta)
                    },
                    onClick = { onNavigate(3) }
                )
            }
        }

        // 7. Recent Idea Spark Preview
        if (state.latestIdea != null) {
            val idea = state.latestIdea!!
            item {
                SectionHeaderRow(
                    title = "Latest Idea Spark",
                    actionText = "Idea Vault →",
                    onAction = { onNavigate(2) }
                )
            }
            item {
                DashboardIdeaCard(
                    idea = idea,
                    onClick = { onNavigate(2) }
                )
            }
        }

        // 8. Subtle Quick Jump Strip if either Ideas or Learning is still empty
        if (state.topLearningResource == null || state.latestIdea == null) {
            item {
                EmptyModuleShortcuts(
                    showIdeaShortcut = state.latestIdea == null,
                    showLearningShortcut = state.topLearningResource == null,
                    onOpenIdeas = { onNavigate(2) },
                    onOpenLearning = { onNavigate(3) }
                )
            }
        }
    }

    if (detailsTask != null) {
        TaskDetailsDialog(
            task = detailsTask!!,
            onDismiss = { detailsTask = null },
            onToggle = {
                viewModel.toggleTask(detailsTask!!)
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

@Composable
private fun DailyPulseHeroCard(
    dateEyebrow: String,
    greeting: String,
    pendingCount: Int,
    completedCount: Int,
    totalToday: Int,
    progressFloat: Float,
    gamification: GamificationState
) {
    val animatedProgress by animateFloatAsState(
        targetValue = progressFloat,
        animationSpec = tween(durationMillis = 600, easing = FastOutSlowInEasing),
        label = "heroRingProgress"
    )
    val levelProgressTarget = (gamification.points % 100) / 100f
    val animatedLevelProgress by animateFloatAsState(
        targetValue = levelProgressTarget,
        animationSpec = tween(durationMillis = 500, easing = FastOutSlowInEasing),
        label = "levelProgress"
    )
    val isDayComplete = totalToday > 0 && pendingCount == 0
    val ringColor = if (isDayComplete) Color(0xFF10B981) else MaterialTheme.colorScheme.primary
    val trackColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f)

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.75f))
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 18.dp, vertical = 18.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = dateEyebrow,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                        letterSpacing = 0.9.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = greeting,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface,
                        letterSpacing = (-0.3).sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = when {
                            totalToday == 0 -> "Open slate · add a focus task below"
                            pendingCount == 0 -> "All $totalToday tasks done today"
                            else -> "$pendingCount left · $completedCount of $totalToday done"
                        },
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Spacer(modifier = Modifier.width(14.dp))

                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier.size(62.dp)
                ) {
                    Canvas(modifier = Modifier.fillMaxSize()) {
                        val strokeWidth = 5.5.dp.toPx()
                        drawArc(
                            color = trackColor,
                            startAngle = -90f,
                            sweepAngle = 360f,
                            useCenter = false,
                            style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
                        )
                        if (animatedProgress > 0f) {
                            drawArc(
                                color = ringColor,
                                startAngle = -90f,
                                sweepAngle = 360f * animatedProgress,
                                useCenter = false,
                                style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
                            )
                        }
                    }

                    if (isDayComplete) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = "Day complete",
                            tint = Color(0xFF10B981),
                            modifier = Modifier.size(22.dp)
                        )
                    } else {
                        Text(
                            text = "${(progressFloat * 100).toInt()}%",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }

            HorizontalDivider(
                thickness = 0.5.dp,
                color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.65f)
            )

            // Integrated Momentum & Level XP Strip
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 18.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f)
                    ) {
                        Text(
                            text = "🔥 ${gamification.currentStreak}d streak",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(
                            text = "Lv.${gamification.level} ${gamification.levelTitle}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "·",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = "${gamification.points % 100}/100 XP",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }

                SmoothProgressBar(
                    progress = animatedLevelProgress,
                    color = MaterialTheme.colorScheme.primary,
                    trackColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f),
                    height = 4.dp
                )
            }
        }
    }
}

@Composable
private fun OverdueBanner(
    overdueCount: Int,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        color = Color(0xFFEF4444).copy(alpha = 0.08f),
        border = BorderStroke(1.dp, Color(0xFFEF4444).copy(alpha = 0.25f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 11.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Icon(
                    imageVector = Icons.Outlined.WarningAmber,
                    contentDescription = null,
                    tint = Color(0xFFEF4444),
                    modifier = Modifier.size(18.dp)
                )
                Text(
                    text = "$overdueCount overdue ${if (overdueCount == 1) "task" else "tasks"} need attention",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFFDC2626)
                )
            }
            Text(
                text = "Review →",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFFDC2626)
            )
        }
    }
}

@Composable
private fun QuickOverviewBento(
    pendingToday: Int,
    ideasCount: Int,
    activeLearningCount: Int,
    onNavigate: (Int) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        BentoNavTile(
            modifier = Modifier.weight(1f),
            icon = Icons.Outlined.CheckCircle,
            count = "$pendingToday",
            label = "Today",
            isHighlighted = pendingToday > 0,
            onClick = { onNavigate(1) }
        )
        BentoNavTile(
            modifier = Modifier.weight(1f),
            icon = Icons.Outlined.Lightbulb,
            count = "$ideasCount",
            label = "Ideas",
            isHighlighted = false,
            onClick = { onNavigate(2) }
        )
        BentoNavTile(
            modifier = Modifier.weight(1f),
            icon = Icons.Outlined.School,
            count = "$activeLearningCount",
            label = "Courses",
            isHighlighted = false,
            onClick = { onNavigate(3) }
        )
    }
}

@Composable
private fun BentoNavTile(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    count: String,
    label: String,
    isHighlighted: Boolean,
    onClick: () -> Unit
) {
    Surface(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.75f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = CircleShape,
                    color = if (isHighlighted)
                        MaterialTheme.colorScheme.primaryContainer
                    else
                        MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f),
                    modifier = Modifier.size(28.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = icon,
                            contentDescription = label,
                            tint = if (isHighlighted)
                                MaterialTheme.colorScheme.primary
                            else
                                MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(15.dp)
                        )
                    }
                }

                Text(
                    text = count,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (isHighlighted) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                )
            }

            Text(
                text = label,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1
            )
        }
    }
}

@Composable
private fun SectionHeaderRow(
    title: String,
    badgeCount: Int? = null,
    actionText: String,
    onAction: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 2.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
            if (badgeCount != null) {
                Surface(
                    color = MaterialTheme.colorScheme.primaryContainer,
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = "$badgeCount",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp)
                    )
                }
            }
        }

        Text(
            text = actionText,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier
                .clip(RoundedCornerShape(8.dp))
                .clickable(onClick = onAction)
                .padding(horizontal = 6.dp, vertical = 4.dp)
        )
    }
}

@Composable
private fun TodaysFocusSheet(
    tasks: List<TaskEntity>,
    completedTodayCount: Int,
    onToggleTask: (TaskEntity) -> Unit,
    onDeleteTask: (String) -> Unit,
    onOpenDetails: (TaskEntity) -> Unit,
    onQuickAddInline: (String) -> Unit,
    onOpenFullQuickAdd: () -> Unit
) {
    var isAddingInline by remember { mutableStateOf(false) }
    var draftTitle by remember { mutableStateOf("") }
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(isAddingInline) {
        if (isAddingInline) {
            focusRequester.requestFocus()
        }
    }

    fun submitDraft() {
        val trimmed = draftTitle.trim()
        if (trimmed.isNotEmpty()) {
            onQuickAddInline(trimmed)
            draftTitle = ""
            isAddingInline = false
        }
    }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.75f))
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            if (tasks.isEmpty()) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 22.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Surface(
                        shape = CircleShape,
                        color = if (completedTodayCount > 0)
                            Color(0xFF10B981).copy(alpha = 0.12f)
                        else
                            MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f),
                        modifier = Modifier.size(42.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Outlined.CheckCircle,
                                contentDescription = null,
                                tint = if (completedTodayCount > 0) Color(0xFF10B981) else MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(22.dp)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        text = if (completedTodayCount > 0) "All done for today" else "Your focus list is clear",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(3.dp))
                    Text(
                        text = if (completedTodayCount > 0)
                            "$completedTodayCount completed · streak updated"
                        else
                            "Add what matters most for today",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            } else {
                tasks.forEachIndexed { index, task ->
                    key(task.id) {
                        DashboardTaskItem(
                            task = task,
                            onToggle = { onToggleTask(task) },
                            onDelete = { onDeleteTask(task.id) },
                            onOpenDetails = { onOpenDetails(task) }
                        )
                        if (index < tasks.lastIndex) {
                            HorizontalDivider(
                                color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.55f),
                                thickness = 0.5.dp,
                                modifier = Modifier.padding(start = 52.dp, end = 16.dp)
                            )
                        }
                    }
                }
            }

            HorizontalDivider(
                color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.65f),
                thickness = 0.5.dp
            )

            // Zero-Friction Inline Quick-Add Footer
            AnimatedVisibility(visible = isAddingInline) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(10.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f))
                            .padding(horizontal = 12.dp, vertical = 10.dp)
                    ) {
                        if (draftTitle.isEmpty()) {
                            Text(
                                text = "Task title for today...",
                                fontSize = 14.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        BasicTextField(
                            value = draftTitle,
                            onValueChange = { draftTitle = it },
                            modifier = Modifier
                                .fillMaxWidth()
                                .focusRequester(focusRequester),
                            singleLine = true,
                            textStyle = TextStyle(
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium,
                                color = MaterialTheme.colorScheme.onSurface
                            ),
                            cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                            keyboardOptions = KeyboardOptions(
                                capitalization = KeyboardCapitalization.Sentences,
                                imeAction = ImeAction.Done
                            ),
                            keyboardActions = KeyboardActions(onDone = { submitDraft() })
                        )
                    }

                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = if (draftTitle.isNotBlank())
                            MaterialTheme.colorScheme.primary
                        else
                            MaterialTheme.colorScheme.surfaceVariant,
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .clickable(enabled = draftTitle.isNotBlank()) { submitDraft() }
                    ) {
                        Text(
                            text = "Add",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (draftTitle.isNotBlank()) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 9.dp)
                        )
                    }

                    IconButton(
                        onClick = {
                            draftTitle = ""
                            isAddingInline = false
                        },
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Cancel",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }

            if (!isAddingInline) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { isAddingInline = true }
                        .padding(horizontal = 16.dp, vertical = 13.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = MaterialTheme.colorScheme.primaryContainer,
                            modifier = Modifier.size(22.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = Icons.Default.Add,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }
                        Text(
                            text = "Quick add task for today...",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    IconButton(
                        onClick = onOpenFullQuickAdd,
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.Event,
                            contentDescription = "Schedule with options",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(17.dp)
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun DashboardTaskItem(
    task: TaskEntity,
    onToggle: () -> Unit,
    onDelete: () -> Unit,
    onOpenDetails: () -> Unit
) {
    val isCompleted = task.status == "completed"
    val priorityColor = when (task.priority.lowercase()) {
        "high" -> Color(0xFFEF4444)
        "medium" -> MaterialTheme.colorScheme.primary
        else -> MaterialTheme.colorScheme.onSurfaceVariant
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
                    SwipeToDismissBoxValue.StartToEnd -> Color(0xFF10B981)
                    SwipeToDismissBoxValue.EndToStart -> Color(0xFFEF4444)
                    SwipeToDismissBoxValue.Settled -> when (direction) {
                        SwipeToDismissBoxValue.StartToEnd -> Color(0xFF10B981).copy(alpha = 0.85f)
                        SwipeToDismissBoxValue.EndToStart -> Color(0xFFEF4444).copy(alpha = 0.85f)
                        else -> Color.Transparent
                    }
                },
                label = "swipeBgColorDash"
            )

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(color)
                    .padding(horizontal = 18.dp),
                contentAlignment = if (direction == SwipeToDismissBoxValue.StartToEnd) Alignment.CenterStart else Alignment.CenterEnd
            ) {
                if (direction == SwipeToDismissBoxValue.StartToEnd) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "Complete",
                            tint = Color.White,
                            modifier = Modifier.size(19.dp)
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
                            modifier = Modifier.size(19.dp)
                        )
                    }
                }
            }
        }
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onOpenDetails() },
            color = MaterialTheme.colorScheme.surface
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 10.dp, end = 14.dp, top = 8.dp, bottom = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Generous 36dp hit area for effortless thumb tapping
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .clickable { onToggle() },
                    contentAlignment = Alignment.Center
                ) {
                    Surface(
                        modifier = Modifier.size(22.dp),
                        shape = CircleShape,
                        color = if (isCompleted) priorityColor else Color.Transparent,
                        border = BorderStroke(
                            width = 1.8.dp,
                            color = if (isCompleted) priorityColor else priorityColor.copy(alpha = 0.8f)
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
                }

                Spacer(modifier = Modifier.width(6.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = task.title,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        textDecoration = if (isCompleted) TextDecoration.LineThrough else TextDecoration.None,
                        color = if (isCompleted)
                            MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                        else
                            MaterialTheme.colorScheme.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (task.priority.equals("high", ignoreCase = true) && !isCompleted) {
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "High priority",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFFEF4444)
                        )
                    }
                }

                if (!task.reminderAt.isNullOrBlank() && !isCompleted) {
                    Spacer(modifier = Modifier.width(8.dp))
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                Icons.Outlined.NotificationsNone,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(12.dp)
                            )
                            Text(
                                text = DateUtils.formatIsoTimestamp(task.reminderAt).substringAfter("· ").trim(),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun DashboardLearningCard(
    resource: LearningResourceEntity,
    onProgressDelta: (Int) -> Unit,
    onClick: () -> Unit
) {
    val animatedProgress by animateFloatAsState(
        targetValue = (resource.progressPercent / 100f).coerceIn(0f, 1f),
        animationSpec = tween(durationMillis = 450, easing = FastOutSlowInEasing),
        label = "learningCardProgress"
    )

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .clickable { onClick() },
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.75f))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Surface(
                        color = MaterialTheme.colorScheme.primaryContainer,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.size(36.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.Outlined.School,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = resource.title,
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurface,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "${resource.provider?.uppercase() ?: "COURSE"} · ${resource.progressPercent}% complete",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Spacer(modifier = Modifier.width(10.dp))

                Surface(
                    modifier = Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .clickable { onProgressDelta(10) },
                    shape = RoundedCornerShape(10.dp),
                    color = MaterialTheme.colorScheme.primaryContainer
                ) {
                    Text(
                        text = "+10%",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(horizontal = 11.dp, vertical = 6.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            SmoothProgressBar(
                progress = animatedProgress,
                color = MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f),
                height = 5.dp
            )
        }
    }
}

@Composable
private fun SmoothProgressBar(
    progress: Float,
    color: Color,
    trackColor: Color,
    height: androidx.compose.ui.unit.Dp
) {
    val clamped = progress.coerceIn(0f, 1f)
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(height)
            .clip(RoundedCornerShape(height / 2))
            .background(trackColor)
    ) {
        if (clamped > 0f) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(clamped)
                    .fillMaxHeight()
                    .clip(RoundedCornerShape(height / 2))
                    .background(color)
            )
        }
    }
}

@Composable
fun DashboardIdeaCard(
    idea: IdeaEntity,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .clickable { onClick() },
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.75f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.size(36.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Outlined.Lightbulb,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = idea.title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (idea.content.isNotBlank()) {
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = idea.content,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            Spacer(modifier = Modifier.width(8.dp))
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = "Open Idea Vault",
                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.65f),
                modifier = Modifier.size(18.dp)
            )
        }
    }
}

@Composable
private fun EmptyModuleShortcuts(
    showIdeaShortcut: Boolean,
    showLearningShortcut: Boolean,
    onOpenIdeas: () -> Unit,
    onOpenLearning: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        if (showIdeaShortcut) {
            Surface(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(14.dp))
                    .clickable(onClick = onOpenIdeas),
                shape = RoundedCornerShape(14.dp),
                color = MaterialTheme.colorScheme.surface,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.75f))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 11.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.Lightbulb,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = "Capture an idea",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
        if (showLearningShortcut) {
            Surface(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(14.dp))
                    .clickable(onClick = onOpenLearning),
                shape = RoundedCornerShape(14.dp),
                color = MaterialTheme.colorScheme.surface,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.75f))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 11.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.School,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = "Start a course",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}
