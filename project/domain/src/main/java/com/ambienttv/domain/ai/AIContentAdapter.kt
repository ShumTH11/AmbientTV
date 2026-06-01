package com.ambienttv.domain.ai

import com.ambienttv.domain.model.AmbientProfile
import com.ambienttv.domain.model.AudioFeatures
import com.ambienttv.domain.model.ContentCategory
import com.ambienttv.domain.model.ContentItem
import com.ambienttv.domain.model.ContentPair
import com.ambienttv.domain.model.MediaResult
import com.ambienttv.domain.model.MediaType
import com.ambienttv.domain.model.VisualFeatures
import kotlinx.coroutines.flow.Flow

/**
 * Interface for AI-driven content adaptation and generation.
 * Implementations provide AI-powered content matching, selection, and media generation.
 */
public interface AIContentAdapter {

    /**
     * Finds the best matching video/audio pair for a given category using AI analysis.
     *
     * @param category The target content category
     * @return The best matching content pair
     */
    public suspend fun matchContentByCategory(category: ContentCategory): ContentPair

    /**
     * Selects the most appropriate content item based on audio feature analysis.
     *
     * @param input The audio features to match against
     * @return The best matching content item
     */
    public suspend fun selectContentByAudio(input: AudioFeatures): ContentItem

    /**
     * Selects the most appropriate content item based on visual feature analysis.
     *
     * @param input The visual features to match against
     * @return The best matching content item
     */
    public suspend fun selectContentByVisual(input: VisualFeatures): ContentItem

    /**
     * Generates new media content from a text prompt using AI generation.
     *
     * @param prompt The text description of desired content
     * @param type The type of media to generate (video or audio)
     * @return The result of the generation attempt
     */
    public suspend fun generateMedia(prompt: String, type: MediaType): MediaResult

    /**
     * Analyzes the current environment to build an ambient profile.
     *
     * @return Flow emitting ambient profile updates as analysis progresses
     */
    public suspend fun analyzeEnvironment(): Flow<AmbientProfile>

    /**
     * Generates a cover image/thumbnail for a category using AI.
     * Returns a URL or local path to the generated image.
     *
     * @param category The category to generate a cover for
     * @return URL string of the generated cover, or null if generation failed
     */
    public suspend fun generateCoverImage(category: ContentCategory): String?
}
