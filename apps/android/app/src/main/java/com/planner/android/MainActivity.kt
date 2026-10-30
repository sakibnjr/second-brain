package com.planner.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.lifecycle.viewmodel.compose.viewModel
import com.planner.android.data.database.AppDatabase
import com.planner.android.data.repository.IdeaRepository
import com.planner.android.data.repository.LearningRepository
import com.planner.android.data.repository.TaskRepository
import com.planner.android.ui.screens.*
import com.planner.android.ui.theme.SecondBrainTheme
import com.planner.android.ui.viewmodels.*

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize local-first SQLite persistence
        val database = AppDatabase.getDatabase(applicationContext)
        val taskRepository = TaskRepository(database.taskDao(), database.mutationQueueDao())
        val ideaRepository = IdeaRepository(database.ideaDao(), database.mutationQueueDao())
        val learningRepository = LearningRepository(database.learningDao(), database.mutationQueueDao())

        setContent {
            SecondBrainTheme {
                MainScreen(
                    database = database,
                    taskRepository = taskRepository,
                    ideaRepository = ideaRepository,
                    learningRepository = learningRepository
                )
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
    learningRepository: LearningRepository
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
                            text = items[selectedItem],
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Second Brain",
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
                4 -> SettingsScreen()
            }
        }
    }
}
