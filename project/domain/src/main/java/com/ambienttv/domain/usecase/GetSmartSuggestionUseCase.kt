package com.ambienttv.domain.usecase

import com.ambienttv.domain.ai.AIContentAdapter
import com.ambienttv.domain.model.ContentCategory
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject

/**
 * Returns a time-aware / environment-aware category suggestion.
 *
 * The underlying [AIContentAdapter.analyzeEnvironment] considers
 * local time, season, and (in the future) ambient audio/visual signals.
 */
class GetSmartSuggestionUseCase @Inject constructor(
    private val aiContentAdapter: AIContentAdapter
) {
    operator fun invoke(): Flow<ContentCategory?> {
        return kotlinx.coroutines.flow.flow {
            val profile = aiContentAdapter.analyzeEnvironment()
            profile.collect { p ->
                emit(p.suggestedCategory)
            }
        }
    }
}
