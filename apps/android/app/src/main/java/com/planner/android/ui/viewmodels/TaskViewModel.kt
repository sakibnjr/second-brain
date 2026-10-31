package com.planner.android.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.planner.android.data.models.TaskEntity
import com.planner.android.data.repository.TaskRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class TaskViewModel(private val repository: TaskRepository) : ViewModel() {
    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _statusFilter = MutableStateFlow("all") // all, todo, in_progress, completed
    val statusFilter: StateFlow<String> = _statusFilter.asStateFlow()

    val tasks: StateFlow<List<TaskEntity>> = combine(
        repository.allTasks,
        _searchQuery,
        _statusFilter
    ) { allTasks, query, filter ->
        allTasks.filter { task ->
            val matchesFilter = when (filter) {
                "all" -> true
                else -> task.status == filter
            }
            val matchesQuery = query.isBlank() ||
                    task.title.contains(query, ignoreCase = true) ||
                    (task.description?.contains(query, ignoreCase = true) == true)
            matchesFilter && matchesQuery
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun setStatusFilter(filter: String) {
        _statusFilter.value = filter
    }

    fun createTask(
        title: String,
        description: String? = null,
        priority: String = "medium",
        dueAt: String? = null,
        reminderAt: String? = null
    ) {
        if (title.isBlank()) return
        viewModelScope.launch {
            repository.createTask(
                title = title.trim(),
                description = description?.trim(),
                priority = priority,
                dueAt = dueAt?.ifBlank { null },
                reminderAt = reminderAt?.ifBlank { null }
            )
        }
    }

    fun toggleTaskStatus(task: TaskEntity) {
        viewModelScope.launch {
            val nextStatus = when (task.status) {
                "todo" -> "in_progress"
                "in_progress" -> "completed"
                else -> "todo"
            }
            repository.updateTaskStatus(task, nextStatus)
        }
    }

    fun deleteTask(taskId: String) {
        viewModelScope.launch {
            repository.deleteTask(taskId)
        }
    }
}

class TaskViewModelFactory(private val repository: TaskRepository) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(TaskViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return TaskViewModel(repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
