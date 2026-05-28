package com.ambienttv.domain.usecase

import com.ambienttv.domain.ai.AIContentAdapter
import com.ambienttv.domain.model.MediaResult
import com.ambienttv.domain.model.MediaType
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject

/**
 * Use case for generating media content using AI.
 * Wraps the AI adapter's generation capability in a Flow-based API for progress tracking.
 */
public class GenerateMediaUseCase @Inject constructor(
    private val aiContentAdapter: AIContentAdapter
) {

    /**
     * Generates media content from a text prompt.
     *
     * @param prompt The text description of the desired content
     * @param type The type of media to generate (video or audio)
     * @return Flow emitting generation progress and final result
     */
    public suspend operator fun invoke(prompt: String, type: MediaType): Flow<MediaResult> = flow {
        emit(MediaResult.InProgress(progress = 0.0f))

        val result = try {
            aiContentAdapter.generateMedia(prompt, type)
        } catch (e: Exception) {
            MediaResult.Error(message = "Generation failed: ${e.message}")
        }

        emit(MediaResult.InProgress(progress = 0.5f))
        emit(result)
    }
}
