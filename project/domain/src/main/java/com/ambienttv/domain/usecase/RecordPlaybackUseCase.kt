package com.ambienttv.domain.usecase

import com.ambienttv.domain.model.ContentPair
import com.ambienttv.domain.repository.HistoryRepository
import javax.inject.Inject

class RecordPlaybackUseCase @Inject constructor(
    private val repository: HistoryRepository
) {
    suspend operator fun invoke(pair: ContentPair, progressMs: Long, durationMs: Long) {
        repository.recordPlayback(pair, progressMs, durationMs)
    }
}
