package com.planner.android.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.planner.android.data.dao.MutationQueueDao
import com.planner.android.data.models.IdeaEntity
import com.planner.android.data.models.LearningResourceEntity
import com.planner.android.data.models.TaskEntity
import com.planner.android.data.repository.IdeaRepository
import com.planner.android.data.repository.LearningRepository
import com.planner.android.data.repository.TaskRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class DashboardState(
    val todayTasks: List<TaskEntity> = emptyList(),
    val completedTodayCount: Int = 0,
    val overdueCount: Int = 0,
    val activeLearningCount: Int = 0,
    val topLearningResource: LearningResourceEntity? = null,
    val ideasCount: Int = 0,
    val latestIdea: IdeaEntity? = null,
    val pendingSyncCount: Int = 0
)

class DashboardViewModel(
    private val taskRepository: TaskRepository,
    private val ideaRepository: IdeaRepository,
    private val learningRepository: LearningRepository,
    private val mutationQueueDao: MutationQueueDao
) : ViewModel() {

    private val dateOnlyFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    val uiState: StateFlow<DashboardState> = combine(
        taskRepository.allTasks,
        taskRepository.getOverdueTasks(),
        learningRepository.activeResources,
        ideaRepository.activeIdeas,
        mutationQueueDao.getPendingCountFlow()
    ) { allTasks, overdue, learning, ideas, pendingCount ->
        val todayStr = dateOnlyFormat.format(Date())
        val todayTasks = allTasks.filter {
            it.deletedAt == null && it.status != "completed" && it.dueAt?.startsWith(todayStr) == true
        }
        val completedToday = allTasks.filter {
            it.deletedAt == null && it.status == "completed" && it.updatedAt.startsWith(todayStr)
        }.size

        DashboardState(
            todayTasks = todayTasks,
            completedTodayCount = completedToday,
            overdueCount = overdue.size,
            activeLearningCount = learning.size,
            topLearningResource = learning.firstOrNull(),
            ideasCount = ideas.size,
            latestIdea = ideas.firstOrNull(),
            pendingSyncCount = pendingCount
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), DashboardState())

    fun quickAddTask(title: String) {
        if (title.isBlank()) return
        val todayDue = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date()) + "T23:59:59Z"
        viewModelScope.launch {
            taskRepository.createTask(
                title = title.trim(),
                priority = "medium",
                dueAt = todayDue
            )
        }
    }

    fun toggleTask(task: TaskEntity) {
        viewModelScope.launch {
            val next = if (task.status == "completed") "todo" else "completed"
            taskRepository.updateTaskStatus(task, next)
        }
    }

    fun updateTask(task: TaskEntity) {
        viewModelScope.launch {
            taskRepository.updateTask(task)
        }
    }

    fun deleteTask(id: String) {
        viewModelScope.launch {
            taskRepository.deleteTask(id)
        }
    }

    fun updateLearningProgress(resource: LearningResourceEntity, delta: Int) {
        val newProgress = (resource.progressPercent + delta).coerceIn(0, 100)
        viewModelScope.launch {
            learningRepository.updateProgress(resource.id, newProgress)
        }
    }
}

class DashboardViewModelFactory(
    private val taskRepository: TaskRepository,
    private val ideaRepository: IdeaRepository,
    private val learningRepository: LearningRepository,
    private val mutationQueueDao: MutationQueueDao
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(DashboardViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return DashboardViewModel(taskRepository, ideaRepository, learningRepository, mutationQueueDao) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
