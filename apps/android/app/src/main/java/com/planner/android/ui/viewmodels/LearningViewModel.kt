package com.planner.android.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.planner.android.data.models.LearningResourceEntity
import com.planner.android.data.repository.LearningRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class LearningViewModel(private val repository: LearningRepository) : ViewModel() {
    val resources: StateFlow<List<LearningResourceEntity>> = repository.allResources
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val activeCount: StateFlow<Int> = repository.activeResources
        .map { it.size }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    fun createResource(title: String, url: String? = null, provider: String? = null) {
        if (title.isBlank()) return
        viewModelScope.launch {
            repository.createResource(title = title.trim(), url = url?.trim(), provider = provider?.trim())
        }
    }

    fun updateProgress(resourceId: String, progress: Int) {
        viewModelScope.launch {
            repository.updateProgress(resourceId, progress.coerceIn(0, 100))
        }
    }

    fun deleteResource(resourceId: String) {
        viewModelScope.launch {
            repository.deleteResource(resourceId)
        }
    }
}

class LearningViewModelFactory(private val repository: LearningRepository) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(LearningViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return LearningViewModel(repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
