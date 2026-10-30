package com.planner.android.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.planner.android.data.models.IdeaEntity
import com.planner.android.data.repository.IdeaRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

enum class IdeaTab {
    ACTIVE,
    ARCHIVED
}

class IdeaViewModel(private val repository: IdeaRepository) : ViewModel() {
    private val _currentTab = MutableStateFlow(IdeaTab.ACTIVE)
    val currentTab: StateFlow<IdeaTab> = _currentTab.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    val ideas: StateFlow<List<IdeaEntity>> = combine(
        _currentTab,
        _searchQuery,
        repository.activeIdeas,
        repository.archivedIdeas
    ) { tab, query, active, archived ->
        val list = if (tab == IdeaTab.ACTIVE) active else archived
        if (query.isBlank()) {
            list
        } else {
            list.filter { idea ->
                idea.title.contains(query, ignoreCase = true) ||
                        idea.content.contains(query, ignoreCase = true)
            }
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun setTab(tab: IdeaTab) {
        _currentTab.value = tab
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun createIdea(title: String, content: String = "") {
        if (title.isBlank()) return
        viewModelScope.launch {
            repository.createIdea(title = title.trim(), content = content.trim())
        }
    }

    fun toggleArchive(idea: IdeaEntity) {
        viewModelScope.launch {
            repository.toggleArchive(idea)
        }
    }

    fun deleteIdea(ideaId: String) {
        viewModelScope.launch {
            repository.deleteIdea(ideaId)
        }
    }
}

class IdeaViewModelFactory(private val repository: IdeaRepository) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(IdeaViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return IdeaViewModel(repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
