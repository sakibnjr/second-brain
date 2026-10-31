package com.planner.android

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.planner.android.data.database.AppDatabase
import com.planner.android.data.repository.IdeaRepository
import com.planner.android.data.repository.LearningRepository
import com.planner.android.data.repository.TaskRepository
import com.planner.android.notifications.ReminderScheduler
import com.planner.android.sync.LocalAuthServer
import com.planner.android.sync.SupabaseClient
import com.planner.android.sync.SyncWorker
import com.planner.android.ui.screens.*
import com.planner.android.ui.theme.SecondBrainTheme
import com.planner.android.ui.viewmodels.*
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { _ -> }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 1. Setup Notification Channel & Request Android 13+ Permission
        ReminderScheduler.createNotificationChannel(applicationContext)
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
        SyncWorker.enqueueImmediateSync(applicationContext)

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
    var selectedItem by remember { mutableStateOf(0) }
    val items = listOf("Dashboard", "Tasks", "Ideas", "Learning", "Settings")
    val icons = listOf(
        Icons.Default.Dashboard,
        Icons.Default.CheckCircle,
        Icons.Default.Lightbulb,
        Icons.Default.School,
        Icons.Default.Settings
    )

    val userProfile by supabaseClient.userProfile.collectAsState()

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
                    Column {
                        Text(
                            text = if (selectedItem == 0 && userProfile.isLoggedIn)
                                "Welcome, ${userProfile.name}"
                            else
                                items[selectedItem],
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Second Brain · Never lose a thought.",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface
            ) {
                items.forEachIndexed { index, item ->
                    NavigationBarItem(
                        icon = { Icon(icons[index], contentDescription = item) },
                        label = { Text(item) },
                        selected = selectedItem == index,
                        onClick = { selectedItem = index }
                    )
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
                    onNavigate = { selectedItem = it }
                )
                1 -> TasksScreen(viewModel = taskViewModel)
                2 -> IdeasScreen(viewModel = ideaViewModel)
                3 -> LearningScreen(viewModel = learningViewModel)
                4 -> SettingsScreen(
                    supabaseClient = supabaseClient,
                    mutationQueueDao = database.mutationQueueDao()
                )
            }
        }
    }
}
