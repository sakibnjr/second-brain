package com.planner.android

import android.Manifest
import android.app.DatePickerDialog
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.planner.android.data.GamificationManager
import com.planner.android.data.database.AppDatabase
import com.planner.android.data.repository.IdeaRepository
import com.planner.android.data.repository.LearningRepository
import com.planner.android.data.repository.TaskRepository
import com.planner.android.notifications.ReminderScheduler
import com.planner.android.sync.LocalAuthServer
import com.planner.android.sync.SupabaseClient
import com.planner.android.sync.SyncWorker
import com.planner.android.ui.components.ScheduleReminderCard
import com.planner.android.ui.screens.*
import com.planner.android.ui.theme.SecondBrainTheme
import com.planner.android.ui.viewmodels.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class MainActivity : ComponentActivity() {

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { _ -> }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 1. Setup Notification Channel, Gamification & Request Android 13+ Permission
        GamificationManager.init(applicationContext)
        ReminderScheduler.createNotificationChannel(applicationContext)
        ReminderScheduler.scheduleDayEndReminder(applicationContext)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        // 2. Initialize local-first SQLite persistence & repositories
        val database = AppDatabase.getDatabase(applicationContext)
        val taskRepository = TaskRepository(
            database.taskDao(),
            database.mutationQueueDao(),
            applicationContext
        )
        val ideaRepository = IdeaRepository(
            database.ideaDao(),
            database.mutationQueueDao(),
            applicationContext
        )
        val learningRepository = LearningRepository(
            database.learningDao(),
            database.mutationQueueDao(),
            applicationContext
        )

        // 3. Initialize Supabase Auth & WorkManager Cloud Sync
        val supabaseClient = SupabaseClient.getInstance(applicationContext)
        SyncWorker.schedulePeriodicSync(applicationContext)
        supabaseClient.scheduleDebouncedSync(1000)

        // Reschedule any pending task alarms
        lifecycleScope.launch {
            ReminderScheduler.rescheduleAllFromDatabase(applicationContext)
        }

        // Handle Google OAuth deep link if launched via redirect
        handleDeepLink(intent)

        setContent {
            SecondBrainTheme {
                MainScreen(
                    database = database,
                    taskRepository = taskRepository,
                    ideaRepository = ideaRepository,
                    learningRepository = learningRepository,
                    supabaseClient = supabaseClient
                )
            }
        }
    }

    override fun onResume() {
        super.onResume()
        val supabaseClient = SupabaseClient.getInstance(applicationContext)
        if (supabaseClient.userProfile.value.isLoggedIn) {
            supabaseClient.scheduleDebouncedSync(1000)
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleDeepLink(intent)
    }

    private fun handleDeepLink(intent: Intent?) {
        val uri = intent?.data ?: return
        if (uri.scheme == "secondbrain" && (uri.host == "auth-callback" || uri.host.isNullOrBlank())) {
            LocalAuthServer.stop()
            val supabaseClient = SupabaseClient.getInstance(applicationContext)
            lifecycleScope.launch {
                supabaseClient.handleOAuthCallback(uri)
                SyncWorker.enqueueImmediateSync(applicationContext)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    database: AppDatabase,
    taskRepository: TaskRepository,
    ideaRepository: IdeaRepository,
    learningRepository: LearningRepository,
    supabaseClient: SupabaseClient
) {
    // 0 = Home, 1 = Tasks, 2 = Ideas, 3 = Learning, 4 = Settings
    var selectedItem by remember { mutableStateOf(0) }
    var previousItem by remember { mutableStateOf(0) }
    var showUniversalQuickAdd by remember { mutableStateOf(false) }
    var showAddIdeaDialog by remember { mutableStateOf(false) }
    var showAddCourseDialog by remember { mutableStateOf(false) }

    val userProfile by supabaseClient.userProfile.collectAsState()
    val syncStatus by supabaseClient.syncStatus.collectAsState()
    val scope = rememberCoroutineScope()

    // ViewModels with factories
    val dashboardViewModel: DashboardViewModel = viewModel(
        factory = DashboardViewModelFactory(
            taskRepository,
            ideaRepository,
            learningRepository,
            database.mutationQueueDao()
        )
    )
    val taskViewModel: TaskViewModel = viewModel(
        factory = TaskViewModelFactory(taskRepository)
    )
    val ideaViewModel: IdeaViewModel = viewModel(
        factory = IdeaViewModelFactory(ideaRepository)
    )
    val learningViewModel: LearningViewModel = viewModel(
        factory = LearningViewModelFactory(learningRepository)
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        if (selectedItem == 4) {
                            IconButton(onClick = { selectedItem = previousItem }) {
                                Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                            }
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "Settings",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                        } else {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.primary)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text(
                                    text = when (selectedItem) {
                                        0 -> "Second Brain"
                                        1 -> "Tasks & Agenda"
                                        2 -> "Idea Sparks"
                                        3 -> "Learning Tracks"
                                        else -> "Second Brain"
                                    },
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                if (selectedItem != 0) {
                                    Text(
                                        text = when (selectedItem) {
                                            1 -> "Today's priorities and todos"
                                            2 -> "Knowledge vault and notes"
                                            3 -> "Skill acquisition progress"
                                            else -> "Never lose a thought."
                                        },
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f)
                                    )
                                }
                            }
                        }
                    }
                },
                actions = {
                    if (selectedItem != 4) {
                        // 1. Live Sync Pill indicator (Clickable for instant manual sync)
                        Surface(
                            modifier = Modifier.clickable {
                                scope.launch {
                                    supabaseClient.syncNow()
                                }
                            },
                            shape = RoundedCornerShape(12.dp),
                            color = when {
                                syncStatus.state == "syncing" -> Color(0xFFF59E0B).copy(alpha = 0.15f)
                                userProfile.isLoggedIn -> Color(0xFF10B981).copy(alpha = 0.15f)
                                else -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
                            }
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 9.dp, vertical = 5.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(7.dp)
                                        .clip(CircleShape)
                                        .background(
                                            when {
                                                syncStatus.state == "syncing" -> Color(0xFFF59E0B)
                                                userProfile.isLoggedIn -> Color(0xFF10B981)
                                                else -> Color.Gray
                                            }
                                        )
                                )
                                Spacer(modifier = Modifier.width(5.dp))
                                Text(
                                    text = when {
                                        syncStatus.state == "syncing" -> "Syncing"
                                        userProfile.isLoggedIn -> "Synced"
                                        else -> "Local"
                                    },
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = when {
                                        syncStatus.state == "syncing" -> Color(0xFFF59E0B)
                                        userProfile.isLoggedIn -> Color(0xFF10B981)
                                        else -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                                    }
                                )
                            }
                        }
                        Spacer(modifier = Modifier.width(8.dp))

                        // 2. Profile / Settings avatar button
                        Surface(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .clickable {
                                    if (selectedItem != 4) {
                                        previousItem = selectedItem
                                        selectedItem = 4
                                    }
                                },
                            color = if (selectedItem == 4) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                            shape = CircleShape
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                if (userProfile.isLoggedIn && !userProfile.name.isNullOrBlank()) {
                                    Text(
                                        text = userProfile.name.take(1).uppercase(),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp,
                                        color = if (selectedItem == 4) Color.White else MaterialTheme.colorScheme.onSurface
                                    )
                                } else {
                                    Icon(
                                        Icons.Default.Settings,
                                        contentDescription = "Settings",
                                        modifier = Modifier.size(19.dp),
                                        tint = if (selectedItem == 4) Color.White else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                                    )
                                }
                            }
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = if (selectedItem == 0) MaterialTheme.colorScheme.background else MaterialTheme.colorScheme.surface
                )
            )
        },
        bottomBar = {
            // Refined Architectural Bottom Navigation Bar with Centered Primary Capture Button
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.surface,
                tonalElevation = 0.dp,
                shadowElevation = 0.dp
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    HorizontalDivider(
                        thickness = 0.5.dp,
                        color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.7f)
                    )
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .navigationBarsPadding()
                            .height(62.dp)
                            .padding(horizontal = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceAround
                    ) {
                        // Tab 0: Home
                        BottomNavItem(
                            icon = if (selectedItem == 0) Icons.Filled.Home else Icons.Outlined.Home,
                            label = "Home",
                            isSelected = selectedItem == 0
                        ) {
                            selectedItem = 0
                        }

                        // Tab 1: Tasks
                        BottomNavItem(
                            icon = if (selectedItem == 1) Icons.Filled.CheckCircle else Icons.Outlined.CheckCircle,
                            label = "Tasks",
                            isSelected = selectedItem == 1
                        ) {
                            selectedItem = 1
                        }

                        // Centered Crisp Primary Capture Button
                        Surface(
                            modifier = Modifier
                                .size(46.dp)
                                .shadow(
                                    elevation = 4.dp,
                                    shape = CircleShape,
                                    ambientColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.25f),
                                    spotColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.25f)
                                )
                                .clip(CircleShape)
                                .clickable {
                                    when (selectedItem) {
                                        0, 1 -> showUniversalQuickAdd = true
                                        2 -> showAddIdeaDialog = true
                                        3 -> showAddCourseDialog = true
                                        else -> showUniversalQuickAdd = true
                                    }
                                },
                            shape = CircleShape,
                            color = MaterialTheme.colorScheme.primary
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    Icons.Default.Add,
                                    contentDescription = "Add New",
                                    tint = Color.White,
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                        }

                        // Tab 2: Ideas
                        BottomNavItem(
                            icon = if (selectedItem == 2) Icons.Filled.Lightbulb else Icons.Outlined.Lightbulb,
                            label = "Ideas",
                            isSelected = selectedItem == 2
                        ) {
                            selectedItem = 2
                        }

                        // Tab 3: Learning
                        BottomNavItem(
                            icon = if (selectedItem == 3) Icons.Filled.School else Icons.Outlined.School,
                            label = "Learn",
                            isSelected = selectedItem == 3
                        ) {
                            selectedItem = 3
                        }
                    }
                }
            }
        }
    ) { innerPadding ->
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            color = MaterialTheme.colorScheme.background
        ) {
            when (selectedItem) {
                0 -> DashboardScreen(
                    viewModel = dashboardViewModel,
                    userName = if (userProfile.isLoggedIn && !userProfile.name.isNullOrBlank()) userProfile.name else null,
                    onNavigate = { targetTab -> selectedItem = targetTab },
                    onOpenQuickAdd = { showUniversalQuickAdd = true }
                )
                1 -> TasksScreen(viewModel = taskViewModel)
                2 -> IdeasScreen(
                    viewModel = ideaViewModel,
                    showAddDialog = showAddIdeaDialog,
                    onDismissAddDialog = { showAddIdeaDialog = false }
                )
                3 -> LearningScreen(
                    viewModel = learningViewModel,
                    showAddDialog = showAddCourseDialog,
                    onDismissAddDialog = { showAddCourseDialog = false }
                )
                4 -> SettingsScreen(
                    supabaseClient = supabaseClient,
                    mutationQueueDao = database.mutationQueueDao()
                )
            }
        }
    }

    // Universal Quick Add Task Modal Dialog
    if (showUniversalQuickAdd) {
        UniversalQuickAddTaskDialog(
            onDismiss = { showUniversalQuickAdd = false },
            onConfirm = { title, desc, priority, dueAtIso, reminderAtIso ->
                scope.launch {
                    taskRepository.createTask(
                        title = title,
                        description = desc.ifBlank { null },
                        priority = priority,
                        dueAt = dueAtIso,
                        reminderAt = reminderAtIso
                    )
                }
                showUniversalQuickAdd = false
            }
        )
    }
}

@Composable
fun BottomNavItem(
    icon: ImageVector,
    label: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val interactionSource = remember { MutableInteractionSource() }
    val activeColor = MaterialTheme.colorScheme.primary
    val inactiveColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)

    Column(
        modifier = Modifier
            .clickable(
                interactionSource = interactionSource,
                indication = null
            ) { onClick() }
            .padding(horizontal = 8.dp, vertical = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            icon,
            contentDescription = label,
            tint = if (isSelected) activeColor else inactiveColor,
            modifier = Modifier.size(22.dp)
        )
        Spacer(modifier = Modifier.height(3.dp))
        Text(
            text = label,
            fontSize = 11.sp,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
            color = if (isSelected) activeColor else inactiveColor
        )
    }
}

@Composable
fun UniversalQuickAddTaskDialog(
    onDismiss: () -> Unit,
    onConfirm: (title: String, description: String, priority: String, dueAtIso: String?, reminderAtIso: String?) -> Unit
) {
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var priority by remember { mutableStateOf("medium") }
    var reminderAtIso by remember { mutableStateOf<String?>(null) }

    val dateFormat = remember { SimpleDateFormat("yyyy-MM-dd", Locale.US) }
    val todayDateStr = remember { dateFormat.format(Date()) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Surface(
                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f),
                    shape = CircleShape,
                    modifier = Modifier.size(36.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            Icons.Default.Add,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
                Column {
                    Text(
                        text = "Quick Add Task",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Due Today • Edit details anytime",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    placeholder = { Text("What needs to be done? *", fontSize = 13.sp) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    placeholder = { Text("Notes or details (optional)...", fontSize = 12.sp) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    minLines = 2,
                    maxLines = 3
                )

                // Priority Selector
                Text(
                    text = "Priority",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    val priorities = listOf(
                        "low" to "Low",
                        "medium" to "Medium",
                        "high" to "High"
                    )
                    priorities.forEach { (pKey, pLabel) ->
                        val isSelected = priority == pKey
                        FilterChip(
                            selected = isSelected,
                            onClick = { priority = pKey },
                            label = { Text(pLabel, fontSize = 12.sp) },
                            shape = RoundedCornerShape(10.dp),
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = when (pKey) {
                                    "high" -> Color(0xFFEF4444).copy(alpha = 0.2f)
                                    "medium" -> Color(0xFFF59E0B).copy(alpha = 0.2f)
                                    else -> Color(0xFF10B981).copy(alpha = 0.2f)
                                },
                                selectedLabelColor = when (pKey) {
                                    "high" -> Color(0xFFEF4444)
                                    "medium" -> Color(0xFFF59E0B)
                                    else -> Color(0xFF10B981)
                                }
                            )
                        )
                    }
                }

                ScheduleReminderCard(
                    dueAtIso = null,
                    onDueChange = null,
                    reminderAtIso = reminderAtIso,
                    onReminderChange = { reminderAtIso = it }
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (title.isNotBlank()) {
                        // Automatically due for today at 23:59:59 UTC
                        val computedDueIso = "${todayDateStr}T23:59:59Z"
                        onConfirm(title.trim(), description.trim(), priority, computedDueIso, reminderAtIso)
                    }
                },
                enabled = title.isNotBlank(),
                shape = RoundedCornerShape(10.dp)
            ) {
                Text("Save Task")
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
