package com.ambienttv.domain.usecase

import com.ambienttv.domain.model.HistoryEntry
import com.ambienttv.domain.repository.HistoryRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class GetHistoryUseCase @Inject constructor(
    private val repository: HistoryRepository
) {
    operator fun invoke(): Flow<List<HistoryEntry>> = repository.observeHistory()
}
