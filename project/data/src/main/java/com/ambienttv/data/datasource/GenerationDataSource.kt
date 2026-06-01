package com.ambienttv.data.datasource

import com.ambienttv.domain.model.GenerationStatus
import com.ambienttv.domain.model.MediaResult
import kotlinx.coroutines.flow.Flow

/**
 * Data source for AI-generated media content (music and video generation APIs).
 */
public interface GenerationDataSource {

    /**
     * Generates music from a text prompt using an AI music generation provider.
     */
    public suspend fun generateMusic(prompt: String): MediaResult

    /**
     * Generates a video from a text prompt using an AI video generation provider.
     */
    public suspend fun generateVideo(prompt: String): MediaResult

    /**
     * Checks the status of an ongoing generation request.
     */
    public suspend fun checkStatus(generationId: String): GenerationStatus

    /**
     * Polls the status of a generation request as a flow.
     */
    public fun pollStatus(generationId: String): Flow<GenerationStatus>
    /**
     * Generates an image from a text prompt using an AI image generation provider.
     */
    public suspend fun generateImage(prompt: String): MediaResult
}
