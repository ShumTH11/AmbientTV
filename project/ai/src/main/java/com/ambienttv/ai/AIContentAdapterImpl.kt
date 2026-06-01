package com.ambienttv.ai

import com.ambienttv.data.datasource.GenerationDataSource
import com.ambienttv.domain.ai.AIContentAdapter
import com.ambienttv.domain.model.AmbientProfile
import com.ambienttv.domain.model.AudioFeatures
import com.ambienttv.domain.model.ContentCategory
import com.ambienttv.domain.model.ContentItem
import com.ambienttv.domain.model.ContentPair
import com.ambienttv.domain.model.LicenseType
import com.ambienttv.domain.model.MatchPriority
import com.ambienttv.domain.model.MediaMetadata
import com.ambienttv.domain.model.MediaResult
import com.ambienttv.domain.model.MediaType
import com.ambienttv.domain.model.VisualFeatures
import com.ambienttv.domain.preset.DefaultCategories
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.withTimeoutOrNull
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.abs

/**
 * Full implementation of [AIContentAdapter] — the intelligent content
 * orchestrator that ties together matching, routing, caching, and
 * environment analysis.
 *
 * This class is the "brain" of AmbientTV's AI layer. It delegates to:
 * - [CategoryMatcher] for scoring video/audio compatibility
 * - [ContentRouter] for resolving content from various sources
 * - [ContentCache] for fast in-memory content retrieval
 */
@Singleton
public class AIContentAdapterImpl @Inject constructor(
    private val categoryMatcher: CategoryMatcher,
    private val contentRouter: ContentRouter,
    private val contentCache: ContentCache,
    private val generationDataSource: GenerationDataSource,
    private val timeAwareCategoryProvider: TimeAwareCategoryProvider
) : AIContentAdapter {

    /**
     * Finds the best matching video/audio pair for a given category.
     *
     * Uses the [ContentRouter] to resolve content from available sources,
     * then uses [CategoryMatcher] to score all video/audio combinations
     * and returns the highest-scoring pair.
     *
     * Results are cached for fast repeated lookups.
     */
    override suspend fun matchContentByCategory(category: ContentCategory): ContentPair {
        val cacheKey = "match_${category.id}"
        contentCache.get(cacheKey)?.let { cachedVideo ->
            // Check if we also have a cached audio
            contentCache.get("${cacheKey}_audio")?.let { cachedAudio ->
                if (cachedVideo.type == MediaType.VIDEO && cachedAudio.type == MediaType.AUDIO) {
                    return ContentPair(
                        video = cachedVideo,
                        audio = cachedAudio,
                        matchScore = 0.95f
                    )
                }
            }
        }

        // Resolve content via router (tries LOCAL → REMOTE → GENERATED → FALLBACK)
        val resolution = contentRouter.resolveContent(category)

        val items = when (resolution) {
            is com.ambienttv.domain.model.ContentResolution.Local -> resolution.items
            is com.ambienttv.domain.model.ContentResolution.Remote -> resolution.items
            is com.ambienttv.domain.model.ContentResolution.Generated -> {
                val generatedItem = (resolution.result as? MediaResult.Success)?.contentItem
                generatedItem?.let { listOf(it) } ?: emptyList()
            }

            is com.ambienttv.domain.model.ContentResolution.Fallback -> {
                return buildFallbackPair(resolution.defaultCategory)
            }
        }

        if (items.isEmpty()) {
            return buildFallbackPair(category)
        }

        val videos = items.filter { it.type == MediaType.VIDEO }
        val audios = items.filter { it.type == MediaType.AUDIO }

        return if (videos.isNotEmpty() && audios.isNotEmpty()) {
            // Use matcher to find the best-scoring pair
            val pairs = categoryMatcher.findBestMatches(videos, audios, category)
            val bestPair = pairs.firstOrNull() ?: buildFallbackPair(category)

            // Cache the result
            contentCache.put(cacheKey, bestPair.video)
            contentCache.put("${cacheKey}_audio", bestPair.audio)

            bestPair
        } else {
            // If only one type is available, use fallback for the other
            val video = videos.firstOrNull() ?: createPlaceholderVideo(category)
            val audio = audios.firstOrNull() ?: createPlaceholderAudio(category)
            val matchResult = categoryMatcher.match(video, audio)

            ContentPair(
                video = video,
                audio = audio,
                matchScore = matchResult.score
            )
        }
    }

    /**
     * Selects the best content item matching the given audio features.
     *
     * TODO: Full implementation — this stub selects the first content item
     * whose BPM and mood approximately match the input audio features.
     * Future implementation will use spectral analysis and more sophisticated
     * music similarity algorithms (e.g., chroma feature comparison,
     * timbral similarity via MFCCs).
     */
    override suspend fun selectContentByAudio(input: AudioFeatures): ContentItem {
        val cacheKey = "audio_select_${input.bpm}_${input.mood}_${input.genre}"
        contentCache.get(cacheKey)?.let { return it }

        // TODO: Replace with full audio fingerprint matching once
        // the audio analysis pipeline is implemented. This stub
        // does basic BPM and mood matching against default categories.
        val targetCategory = when {
            input.mood != null -> {
                DefaultCategories.ALL.find { cat ->
                    cat.defaultTags.any {
                        it.key == "mood" && it.value.equals(input.mood, ignoreCase = true)
                    }
                } ?: DefaultCategories.NATURE
            }

            input.bpm > 120 -> DefaultCategories.CYBERPUNK
            input.bpm > 90 -> DefaultCategories.FANTASY
            input.bpm > 60 -> DefaultCategories.NATURE
            else -> DefaultCategories.CHRISTMAS
        }

        val result = createPlaceholderAudio(targetCategory).copy(
            metadata = MediaMetadata(
                durationMs = 60_000L,
                bpm = input.bpm.toFloat(),
                mood = input.mood,
                era = targetCategory.defaultTags.find { it.key == "era" }?.value
            )
        )

        contentCache.put(cacheKey, result)
        return result
    }

    /**
     * Selects the best content item matching the given visual features.
     *
     * TODO: Full implementation — this stub selects the first content item
     * whose color palette roughly matches the input dominant colors.
     * Future implementation will use proper color histogram comparison,
     * scene type classification, and brightness-aware selection.
     */
    override suspend fun selectContentByVisual(input: VisualFeatures): ContentItem {
        val cacheKey = "visual_select_${input.dominantColors.hashCode()}_${input.sceneType}"
        contentCache.get(cacheKey)?.let { return it }

        // TODO: Replace with full visual analysis matching once
        // the computer vision pipeline is implemented. This stub
        // does basic color palette and scene type matching.
        val targetCategory = when {
            input.sceneType != null -> {
                DefaultCategories.ALL.find { cat ->
                    cat.defaultTags.any {
                        it.key == "genre" && it.value.equals(input.sceneType, ignoreCase = true)
                    }
                } ?: inferCategoryFromColors(input.dominantColors)
            }

            input.dominantColors.isNotEmpty() -> inferCategoryFromColors(input.dominantColors)
            input.brightness > 0.7f -> DefaultCategories.CHRISTMAS
            input.brightness > 0.4f -> DefaultCategories.NATURE
            else -> DefaultCategories.CYBERPUNK
        }

        val result = createPlaceholderVideo(targetCategory).copy(
            metadata = MediaMetadata(
                durationMs = 60_000L,
                mood = targetCategory.defaultTags.find { it.key == "mood" }?.value,
                colorPalette = input.dominantColors,
                resolution = "1920x1080"
            )
        )

        contentCache.put(cacheKey, result)
        return result
    }

    /**
     * Generates new media content from a text prompt.
     *
     * Routes to [com.ambienttv.data.datasource.GenerationDataSource].
     * If generation exceeds 30 seconds, cancels the coroutine and returns
     * a fallback [MediaResult.Error] with a default content item.
     */
    override suspend fun generateMedia(prompt: String, type: MediaType): MediaResult {
        val cacheKey = "gen_${type.name.lowercase()}_${prompt.hashCode()}"
        contentCache.get(cacheKey)?.let { cached ->
            return MediaResult.Success(cached)
        }

        val result = try {
            withTimeoutOrNull(GENERATION_TIMEOUT_MS) {
                when (type) {
                    MediaType.VIDEO -> generationDataSource.generateVideo(prompt)
                    MediaType.AUDIO -> generationDataSource.generateMusic(prompt)
                }
            } ?: MediaResult.Error(
                message = "AI generation timed out after ${GENERATION_TIMEOUT_MS}ms",
                fallback = if (type == MediaType.VIDEO) {
                    createPlaceholderVideo(DefaultCategories.NATURE)
                } else {
                    createPlaceholderAudio(DefaultCategories.NATURE)
                }
            )
        } catch (e: Exception) {
            MediaResult.Error(
                message = "AI generation failed: ${e.message}",
                fallback = if (type == MediaType.VIDEO) {
                    createPlaceholderVideo(DefaultCategories.NATURE)
                } else {
                    createPlaceholderAudio(DefaultCategories.NATURE)
                }
            )
        }

        // Cache successful results
        if (result is MediaResult.Success) {
            contentCache.put(cacheKey, result.contentItem)
        }

        return result
    }

    /**
     * Analyzes the current environment to build an ambient profile.
     *
     * TODO: Full implementation — this stub returns a flow that emits a single
     * [AmbientProfile] with null audio and visual fingerprints. Future
     * implementation will integrate microphone input for audio fingerprinting
     * and camera/light sensor input for visual analysis, emitting periodic
     * profile updates as the environment changes.
     */
    override suspend fun analyzeEnvironment(): Flow<AmbientProfile> = flow {
        val suggested = timeAwareCategoryProvider.suggestCategory()
        emit(
            AmbientProfile(
                audioFingerprint = null,
                visualFingerprint = null,
                suggestedCategory = suggested
            )
        )
    }

    // ── internal helpers ───────────────────────────────────────────────────

    private fun buildFallbackPair(category: ContentCategory): ContentPair {
        val fallbackCategory = DefaultCategories.ALL.find { it.id == category.id }
            ?: DefaultCategories.NATURE

        val video = createPlaceholderVideo(fallbackCategory)
        val audio = createPlaceholderAudio(fallbackCategory)
        val matchResult = categoryMatcher.match(video, audio)

        return ContentPair(
            video = video,
            audio = audio,
            matchScore = matchResult.score.coerceAtLeast(0.30f)
        )
    }

    private fun createPlaceholderVideo(category: ContentCategory): ContentItem {
        return ContentItem(
            id = "placeholder_video_${category.id}",
            type = MediaType.VIDEO,
            source = com.ambienttv.domain.model.ContentSource.LOCAL,
            uri = "android.resource://com.ambienttv.app/raw/${category.id}_video",
            title = "${category.name} (Placeholder Video)",
            tags = category.defaultTags,
            category = category,
            licenseType = LicenseType.FREE,
            metadata = MediaMetadata(
                durationMs = 30_000L,
                mood = category.defaultTags.find { it.key == "mood" }?.value,
                colorPalette = category.defaultTags
                    .find { it.key == "colorPalette" }?.value?.split(",") ?: emptyList()
            )
        )
    }

    private fun createPlaceholderAudio(category: ContentCategory): ContentItem {
        return ContentItem(
            id = "placeholder_audio_${category.id}",
            type = MediaType.AUDIO,
            source = com.ambienttv.domain.model.ContentSource.LOCAL,
            uri = "android.resource://com.ambienttv.app/raw/${category.id}_audio",
            title = "${category.name} (Placeholder Audio)",
            tags = category.defaultTags,
            category = category,
            licenseType = LicenseType.FREE,
            metadata = MediaMetadata(
                durationMs = 30_000L,
                bpm = 60f,
                mood = category.defaultTags.find { it.key == "mood" }?.value
            )
        )
    }

    /**
     * Generates a cover image for a category using AI image generation.
     * Falls back to a predefined placeholder if generation is unavailable.
     */
    override suspend fun generateCoverImage(category: ContentCategory): String? {
        val cacheKey = "cover_${category.id}"
        contentCache.get(cacheKey)?.let { cached ->
            return cached.uri
        }

        val prompt = buildCoverPrompt(category)

        return try {
            val result = withTimeoutOrNull(GENERATION_TIMEOUT_MS) {
                generationDataSource.generateImage(prompt)
            }

            when (result) {
                is MediaResult.Success -> {
                    contentCache.put(cacheKey, result.contentItem)
                    result.contentItem.uri
                }
                else -> getFallbackCoverUrl(category)
            }
        } catch (e: Exception) {
            Timber.e(e, "Cover generation failed for ${category.id}")
            getFallbackCoverUrl(category)
        }
    }

    private fun buildCoverPrompt(category: ContentCategory): String {
        val mood = category.defaultTags.find { it.key == "mood" }?.value ?: "ambient"
        val era = category.defaultTags.find { it.key == "era" }?.value ?: "modern"
        return "Beautiful ${category.name} ambient scene, ${mood} atmosphere, ${era} style, " +
                "cinematic lighting, high quality, 16:9 aspect ratio, no text"
    }

    private fun getFallbackCoverUrl(category: ContentCategory): String {
        return "android.resource://com.ambienttv.app/drawable/${category.id}_cover"
    }

    private fun inferCategoryFromColors(colors: List<String>): ContentCategory {
        val colorSet = colors.map { it.lowercase() }.toSet()

        return when {
            colorSet.any { it in setOf("red", "green", "gold") } ->
                DefaultCategories.CHRISTMAS

            colorSet.any { it in setOf("neon-blue", "purple", "pink") } ||
                    colorSet.any { it.contains("neon") || it.contains("cyber") } ->
                DefaultCategories.CYBERPUNK

            colorSet.any { it in setOf("bronze", "copper") } ->
                DefaultCategories.STEAMPUNK

            colorSet.any { it in setOf("green", "brown") } ->
                DefaultCategories.FANTASY

            colorSet.any { it in setOf("blue", "white") } ->
                DefaultCategories.NATURE

            else -> DefaultCategories.NATURE
        }
    }

    private companion object {
        const val GENERATION_TIMEOUT_MS = 30_000L
    }
}
