package com.ambienttv.ai

import com.ambienttv.data.datasource.GenerationDataSource
import com.ambienttv.data.datasource.LocalDataSource
import com.ambienttv.data.datasource.RemoteDataSource
import com.ambienttv.domain.model.ContentCategory
import com.ambienttv.domain.model.ContentItem
import com.ambienttv.domain.model.ContentPair
import com.ambienttv.domain.model.ContentResolution
import com.ambienttv.domain.model.LicenseType
import com.ambienttv.domain.model.MatchResult
import com.ambienttv.domain.model.MediaResult
import com.ambienttv.domain.model.MediaType
import com.ambienttv.domain.model.MediaMetadata
import com.ambienttv.domain.preset.DefaultCategories
import kotlinx.coroutines.withTimeoutOrNull
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Intelligent content router that resolves content for a given category by
 * trying sources in priority order:
 *
 *   LOCAL → REMOTE → GENERATED → FALLBACK
 *
 * Each source is attempted with a timeout. If all fail, a fallback pair
 * from [DefaultCategories] is returned.
 */
@Singleton
public class ContentRouter @Inject constructor(
    private val localDataSource: LocalDataSource,
    private val remoteDataSource: RemoteDataSource,
    private val generationDataSource: GenerationDataSource
) {

    /**
     * Resolves content for the given category by trying each source in order.
     *
     * @return [ContentResolution] indicating which source succeeded.
     */
    public suspend fun resolveContent(category: ContentCategory): ContentResolution {
        // 1. Try local source first
        val localItems = try {
            val cached = localDataSource.getCachedContent()
            cached.filter { it.category.id == category.id }
        } catch (_: Exception) {
            emptyList()
        }

        if (localItems.isNotEmpty()) {
            return ContentResolution.Local(localItems)
        }

        // 2. Try remote sources
        val remoteItems = try {
            searchRemoteSources(category)
        } catch (_: Exception) {
            emptyList()
        }

        if (remoteItems.isNotEmpty()) {
            return ContentResolution.Remote(remoteItems)
        }

        // 3. Try AI generation
        val generatedResult = try {
            withTimeoutOrNull(GENERATION_TIMEOUT_MS) {
                generationDataSource.generateVideo(
                    "Ambient ${category.name} video background"
                )
            }
        } catch (_: Exception) {
            null
        }

        if (generatedResult is MediaResult.Success) {
            return ContentResolution.Generated(generatedResult)
        }

        // 4. Fallback to default category content
        return ContentResolution.Fallback(
            defaultCategory = DefaultCategories.ALL.find { it.id == category.id }
                ?: DefaultCategories.NATURE
        )
    }

    /**
     * Resolves content with guaranteed fallback — never throws.
     * Tries each source in order with timeout protection and returns
     * a [ContentPair] from the best available source.
     *
     * @return A [ContentPair] ready for playback.
     */
    public suspend fun resolveWithFallback(category: ContentCategory): ContentPair {
        // 1. Try local with timeout
        val localResult = withTimeoutOrNull(SOURCE_TIMEOUT_MS) {
            try {
                val cached = localDataSource.getCachedContent()
                cached.filter { it.category.id == category.id }
            } catch (_: Exception) {
                null
            }
        }

        val localItems = localResult ?: emptyList()
        val video = localItems.find { it.type == MediaType.VIDEO }
        val audio = localItems.find { it.type == MediaType.AUDIO }

        if (video != null && audio != null) {
            return ContentPair(
                video = video,
                audio = audio,
                matchScore = 0.85f
            )
        }

        // 2. Try remote with timeout
        val remoteItems = withTimeoutOrNull(SOURCE_TIMEOUT_MS) {
            try {
                searchRemoteSources(category)
            } catch (_: Exception) {
                emptyList()
            }
        } ?: emptyList()

        val remoteVideo = remoteItems.find { it.type == MediaType.VIDEO }
            ?: video
        val remoteAudio = remoteItems.find { it.type == MediaType.AUDIO }
            ?: audio

        if (remoteVideo != null && remoteAudio != null) {
            return ContentPair(
                video = remoteVideo,
                audio = remoteAudio,
                matchScore = 0.70f
            )
        }

        // 3. Try generation with timeout
        val generatedVideo = withTimeoutOrNull(GENERATION_TIMEOUT_MS) {
            try {
                generationDataSource.generateVideo(
                    "Ambient ${category.name} seamless looping video"
                )
            } catch (_: Exception) {
                null
            }
        }

        val generatedAudio = withTimeoutOrNull(GENERATION_TIMEOUT_MS) {
            try {
                generationDataSource.generateMusic(
                    "Ambient background music for ${category.name}, seamless loop"
                )
            } catch (_: Exception) {
                null
            }
        }

        val genVideoItem = (generatedVideo as? MediaResult.Success)?.contentItem
        val genAudioItem = (generatedAudio as? MediaResult.Success)?.contentItem

        if (genVideoItem != null && genAudioItem != null) {
            return ContentPair(
                video = genVideoItem,
                audio = genAudioItem,
                matchScore = 0.60f
            )
        }

        // 4. Construct fallback pair from default category
        return buildFallbackPair(category)
    }

    // ── internal helpers ───────────────────────────────────────────────────

    private suspend fun searchRemoteSources(category: ContentCategory): List<ContentItem> {
        val results = mutableListOf<ContentItem>()

        val queries = listOf(
            category.name,
            category.description,
            category.defaultTags.joinToString(" ") { it.value }
        )

        for (query in queries) {
            try {
                results += remoteDataSource.searchPixabayVideos(query)
            } catch (_: Exception) { /* ignore */ }

            try {
                results += remoteDataSource.searchPexelsVideos(query)
            } catch (_: Exception) { /* ignore */ }

            try {
                results += remoteDataSource.searchInternetArchive(query)
            } catch (_: Exception) { /* ignore */ }

            if (results.isNotEmpty()) break
        }

        return results.distinctBy { it.uri }
    }

    private fun buildFallbackPair(category: ContentCategory): ContentPair {
        val fallbackCategory = DefaultCategories.ALL.find { it.id == category.id }
            ?: DefaultCategories.NATURE

        val fallbackVideo = ContentItem(
            id = "fallback_video_${fallbackCategory.id}",
            type = MediaType.VIDEO,
            source = com.ambienttv.domain.model.ContentSource.LOCAL,
            uri = "android.resource://com.ambienttv.app/raw/fallback_video",
            title = "${fallbackCategory.name} (Fallback Video)",
            tags = fallbackCategory.defaultTags,
            category = fallbackCategory,
            licenseType = LicenseType.FREE,
            metadata = MediaMetadata(
                durationMs = 30_000L,
                mood = fallbackCategory.defaultTags.find { it.key == "mood" }?.value
            )
        )

        val fallbackAudio = ContentItem(
            id = "fallback_audio_${fallbackCategory.id}",
            type = MediaType.AUDIO,
            source = com.ambienttv.domain.model.ContentSource.LOCAL,
            uri = "android.resource://com.ambienttv.app/raw/fallback_audio",
            title = "${fallbackCategory.name} (Fallback Audio)",
            tags = fallbackCategory.defaultTags,
            category = fallbackCategory,
            licenseType = LicenseType.FREE,
            metadata = MediaMetadata(
                durationMs = 30_000L,
                bpm = 60,
                mood = fallbackCategory.defaultTags.find { it.key == "mood" }?.value
            )
        )

        val matcher = CategoryMatcher()
        val matchResult = matcher.match(fallbackVideo, fallbackAudio)

        return ContentPair(
            video = fallbackVideo,
            audio = fallbackAudio,
            matchScore = matchResult.score.coerceAtLeast(0.30f)
        )
    }

    private companion object {
        const val SOURCE_TIMEOUT_MS = 10_000L
        const val GENERATION_TIMEOUT_MS = 30_000L
    }
}
