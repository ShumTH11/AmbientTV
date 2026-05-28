package com.ambienttv.domain.usecase

import com.ambienttv.domain.model.ContentPair

interface WatchNextUseCase {
    suspend operator fun invoke(pair: ContentPair)
    suspend fun updateProgress(pairId: String, positionMs: Long)
    suspend fun remove(pairId: String)
}
