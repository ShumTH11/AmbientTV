package com.ambienttv.feature.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ambienttv.domain.model.ContentPair
import com.ambienttv.domain.model.HistoryEntry
import com.ambienttv.domain.usecase.ClearHistoryUseCase
import com.ambienttv.domain.usecase.GetHistoryUseCase
import com.ambienttv.domain.usecase.RecordPlaybackUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class HistoryViewModel @Inject constructor(
    getHistoryUseCase: GetHistoryUseCase,
    private val clearHistoryUseCase: ClearHistoryUseCase,
    private val recordPlaybackUseCase: RecordPlaybackUseCase
) : ViewModel() {

    val history: StateFlow<List<HistoryEntry>> = getHistoryUseCase()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    fun clearHistory() {
        viewModelScope.launch {
            clearHistoryUseCase()
        }
    }

    fun recordPlayback(pair: ContentPair, progressMs: Long, durationMs: Long) {
        viewModelScope.launch {
            recordPlaybackUseCase(pair, progressMs, durationMs)
        }
    }
}
