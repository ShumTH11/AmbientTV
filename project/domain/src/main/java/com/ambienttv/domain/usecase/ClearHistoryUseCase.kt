package com.ambienttv.domain.usecase

import com.ambienttv.domain.repository.HistoryRepository
import javax.inject.Inject

class ClearHistoryUseCase @Inject constructor(
    private val repository: HistoryRepository
) {
    suspend operator fun invoke() {
        repository.clearHistory()
    }
}
