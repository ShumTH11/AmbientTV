package com.ambienttv.data.generation

import com.ambienttv.data.datasource.GenerationDataSource
import com.ambienttv.domain.model.ContentCategory
import com.ambienttv.domain.model.ContentItem
import com.ambienttv.domain.model.ContentSource
import com.ambienttv.domain.model.ContentTag
import com.ambienttv.domain.model.GenerationStatus
import com.ambienttv.domain.model.LicenseType
import com.ambienttv.domain.model.MediaResult
import com.ambienttv.domain.model.MediaType
import com.ambienttv.domain.model.MediaMetadata
import com.ambienttv.domain.preset.DefaultCategories
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import java.util.UUID
import javax.inject.Inject

/**
 * Implementation of GenerationDataSource that communicates with AI generation APIs.
 *
 * Currently provides a placeholder implementation that returns error results with
 * fallback content. In production, this would integrate with Suno, MusicGen,
 * Stable Audio, Runway, Stable Video, or Pika APIs.
 */
class GenerationDataSourceImpl @Inject constructor(
    private val okHttpClient: OkHttpClient,
    private val json: Json
) : GenerationDataSource {

    override suspend fun generateMusic(prompt: String): MediaResult {
        return withContext(Dispatchers.IO) {
            delay(100)
            val category = inferCategoryFromPrompt(prompt)
            val fallbackItem = createFallbackItem(
                type = MediaType.AUDIO,
                category = category,
                prompt = prompt
            )
            MediaResult.Error(
                message = "AI music generation not yet configured. Provide a provider API key to enable.",
                fallback = fallbackItem
            )
        }
    }

    override suspend fun generateVideo(prompt: String): MediaResult {
        return withContext(Dispatchers.IO) {
            delay(100)
            val category = inferCategoryFromPrompt(prompt)
            val fallbackItem = createFallbackItem(
                type = MediaType.VIDEO,
                category = category,
                prompt = prompt
            )
            MediaResult.Error(
                message = "AI video generation not yet configured. Provide a provider API key to enable.",
                fallback = fallbackItem
            )
        }
    }

    override suspend fun checkStatus(generationId: String): GenerationStatus {
        return GenerationStatus.Failed(
            generationId = generationId,
            reason = "AI generation is not configured. No active generation jobs."
        )
    }

    override fun pollStatus(generationId: String): Flow<GenerationStatus> = flow {
        emit(GenerationStatus.Pending(generationId))
        delay(POLL_INTERVAL_MS)
        emit(GenerationStatus.Failed(generationId, "Generation polling not available without configured provider."))
    }

    /**
     * Generates an image from a text prompt.
     * Placeholder implementation — returns error with fallback.
     */
    override suspend fun generateImage(prompt: String): MediaResult {
        return withContext(Dispatchers.IO) {
            delay(100)
            val category = inferCategoryFromPrompt(prompt)
            val fallbackItem = createFallbackItem(
                type = MediaType.VIDEO,
                category = category,
                prompt = prompt
            ).copy(
                id = "ai_image_${UUID.randomUUID()}",
                type = MediaType.VIDEO,
                uri = "placeholder://image/$prompt"
            )
            MediaResult.Error(
                message = "AI image generation not yet configured. Provide a provider API key to enable.",
                fallback = fallbackItem
            )
        }
    }

    /**
     * Infers a content category from the text prompt using keyword matching.
     */
    private fun inferCategoryFromPrompt(prompt: String): ContentCategory {
        val lower = prompt.lowercase()
        return when {
            lower.contains("christmas") || lower.contains("holiday") || lower.contains("festive")
                || lower.contains("xmas") || lower.contains("santa") || lower.contains("snow")
                || lower.contains("winter") && lower.contains("joy") ->
                DefaultCategories.CHRISTMAS
            lower.contains("fantasy") || lower.contains("medieval") || lower.contains("castle")
                || lower.contains("dragon") || lower.contains("magic") || lower.contains("enchant")
                || lower.contains("wizard") || lower.contains("knight") ->
                DefaultCategories.FANTASY
            lower.contains("cyberpunk") || lower.contains("sci-fi") || lower.contains("futuristic")
                || lower.contains("neon") || lower.contains("tech") || lower.contains("blade")
                || lower.contains("matrix") || lower.contains("space") && lower.contains("city") ->
                DefaultCategories.CYBERPUNK
            lower.contains("steampunk") || lower.contains("victorian") || lower.contains("steam")
                || lower.contains("industrial") || lower.contains("gear") || lower.contains("clockwork")
                || lower.contains("brass") || lower.contains("copper") ->
                DefaultCategories.STEAMPUNK
            lower.contains("nature") || lower.contains("ambient") || lower.contains("relax")
                || lower.contains("calm") || lower.contains("forest") || lower.contains("ocean")
                || lower.contains("rain") || lower.contains("peaceful") ->
                DefaultCategories.NATURE
            else -> DefaultCategories.NATURE
        }
    }

    /**
     * Creates a fallback content item with local placeholder properties.
     */
    private fun createFallbackItem(
        type: MediaType,
        category: ContentCategory,
        prompt: String
    ): ContentItem {
        val prefix = when (type) {
            MediaType.VIDEO -> "video"
            MediaType.AUDIO -> "audio"
        }
        return ContentItem(
            id = "ai_${prefix}_${UUID.randomUUID()}",
            type = type,
            source = ContentSource.AI_GENERATED,
            uri = "placeholder://$prefix/$prompt",
            title = "AI $prefix: ${prompt.take(50)}",
            tags = category.defaultTags,
            category = category,
            licenseType = LicenseType.PROPRIETARY,
            metadata = MediaMetadata(
                durationMs = if (type == MediaType.VIDEO) 5000 else 30000,
                mood = category.defaultTags.find { it.key == "mood" }?.value,
                colorPalette = category.defaultTags
                    .find { it.key == "colorPalette" }?.value?.split(",")
                    ?: emptyList()
            )
        )
    }

    companion object {
        private const val POLL_INTERVAL_MS = 2000L
        private const val TIMEOUT_MS = 30000L
    }
}
