package com.ambienttv.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ambienttv.domain.model.ContentCategory
import com.ambienttv.domain.usecase.GetCategoriesUseCase
import com.ambienttv.domain.usecase.GetSmartSuggestionUseCase
import com.ambienttv.domain.usecase.SyncCatalogUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel for the Category Browser screen.
 *
 * Exposes a reactive list of content categories and loading state.
 * Categories are loaded as a Flow from [GetCategoriesUseCase] and
 * collected into a [StateFlow] for Compose consumption.
 *
 * @param getCategoriesUseCase Use case for retrieving all available content categories
 */
@HiltViewModel
class CategoryBrowserViewModel @Inject constructor(
    private val getCategoriesUseCase: GetCategoriesUseCase,
    getSmartSuggestionUseCase: GetSmartSuggestionUseCase,
    private val syncCatalogUseCase: SyncCatalogUseCase
) : ViewModel() {

    private val _categories = MutableStateFlow<List<ContentCategory>>(emptyList())

    /**
     * Flow of all available content categories.
     * Emits an empty list initially, then populates when data is loaded.
     */
    val categories: StateFlow<List<ContentCategory>> = _categories.asStateFlow()

    private val _isLoading = MutableStateFlow(true)

    /**
     * Whether categories are currently being loaded.
     * True until the first emission from the use case is received.
     */
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    /**
     * Time-aware / environment-aware category suggestion.
     * May be null while loading or if no suggestion is available.
     */
    val smartSuggestion: StateFlow<ContentCategory?> = getSmartSuggestionUseCase()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = null
        )

    init {
        viewModelScope.launch {
            syncCatalogUseCase()
        }
        loadCategories()
    }

    private fun loadCategories() {
        getCategoriesUseCase()
            .onStart {
                _isLoading.value = true
            }
            .onEach { categoryList ->
                _categories.value = categoryList
                _isLoading.value = false
            }
            .catch { _ ->
                // On error, emit empty list and stop loading
                _categories.value = emptyList()
                _isLoading.value = false
            }
            .launchIn(viewModelScope)
    }

    /**
     * Forces a refresh of the categories list.
     * Re-subscribes to the use case Flow.
     */
    fun refresh() {
        loadCategories()
    }
}
