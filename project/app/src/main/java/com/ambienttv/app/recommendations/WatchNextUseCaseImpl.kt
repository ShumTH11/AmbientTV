package com.ambienttv.app.recommendations

import com.ambienttv.domain.model.ContentPair
import com.ambienttv.domain.usecase.WatchNextUseCase
import javax.inject.Inject

class WatchNextUseCaseImpl @Inject constructor(
    private val helper: WatchNextHelper
) : WatchNextUseCase {

    override suspend fun invoke(pair: ContentPair) {
        helper.add(pair)
    }

    override suspend fun updateProgress(pairId: String, positionMs: Long) {
        helper.updateProgress(pairId, positionMs)
    }

    override suspend fun remove(pairId: String) {
        helper.remove(pairId)
    }
}
