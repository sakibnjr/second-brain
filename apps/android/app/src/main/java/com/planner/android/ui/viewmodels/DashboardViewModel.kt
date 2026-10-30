package com.planner.android.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.planner.android.data.dao.MutationQueueDao
import com.planner.android.data.models.TaskEntity
import com.planner.android.data.repository.IdeaRepository
import com.planner.android.data.repository.LearningRepository
import com.planner.android.data.repository.TaskRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class DashboardState(
    val todayTasks: List<TaskEntity> = emptyList(),
    val overdueCount: Int = 0,
    val activeLearningCount: Int = 0,
    val ideasCount: Int = 0,
    val pendingSyncCount: Int = 0
)

class DashboardViewModel(
    private val taskRepository: TaskRepository,
    private val ideaRepository: IdeaRepository,
    private val learningRepository: LearningRepository,
    private val mutationQueueDao: MutationQueueDao
) : ViewModel() {

    val uiState: StateFlow<DashboardState> = combine(
        taskRepository.getTodayTasks(),
        taskRepository.getOverdueTasks(),
        learningRepository.activeResources,
        ideaRepository.activeIdeas,
        mutationQueueDao.getPendingCountFlow()
    ) { today, overdue, learning, ideas, pendingCount ->
        DashboardState(
            todayTasks = today,
            overdueCount = overdue.size,
            activeLearningCount = learning.size,
            ideasCount = ideas.size,
            pendingSyncCount = pendingCount
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), DashboardState())

    fun quickAddTask(title: String) {
        if (title.isBlank()) return
        viewModelScope.launch {
            taskRepository.createTask(title = title.trim())
        }
    }

    fun toggleTask(task: TaskEntity) {
        viewModelScope.launch {
            val next = if (task.status == "completed") "todo" else "completed"
            taskRepository.updateTaskStatus(task, next)
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
