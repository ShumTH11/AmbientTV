package com.ambienttv.ai

import com.ambienttv.domain.model.ContentCategory
import com.ambienttv.domain.model.ContentItem
import com.ambienttv.domain.model.ContentPair
import com.ambienttv.domain.model.ContentTag
import com.ambienttv.domain.model.MatchPriority
import com.ambienttv.domain.model.MatchResult
import com.ambienttv.domain.model.MediaType
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.abs

/**
 * The heart of the AI module — calculates compatibility scores between video
 * and audio content items using a multi-factor scoring algorithm.
 *
 * Scoring tiers:
 * - Exact match (0.9–1.0): category, mood, AND bpm all align
 * - Partial match (0.5–0.89): category matches, some tags align
 * - Fallback (0.0–0.49): no meaningful alignment
 */
@Singleton
public class CategoryMatcher @Inject constructor() {

    /**
     * Computes a match score between a video and an audio content item.
     *
     * Scoring weights:
     * - Category alignment: 0.4
     * - Mood alignment: 0.25
     * - BPM compatibility: 0.2
     * - Tag overlap: 0.15
     *
     * @return MatchResult containing the score, priority tier, and tag analysis.
     */
    public fun match(video: ContentItem, audio: ContentItem): MatchResult {
        // Both items must have matching categories for a non-fallback result
        val categoryScore = scoreCategory(video, audio)

        val moodScore = scoreMood(video, audio)
        val bpmScore = scoreBpm(video, audio)
        val tagScore = scoreTagOverlap(video, audio)

        val totalScore = (categoryScore * CATEGORY_WEIGHT) +
                (moodScore * MOOD_WEIGHT) +
                (bpmScore * BPM_WEIGHT) +
                (tagScore * TAG_WEIGHT)

        val clampedScore = totalScore.coerceIn(0.0f, 1.0f)

        val (priority, matchedTags, mismatchedTags) = when {
            categoryScore >= 1.0f && moodScore >= 0.8f && bpmScore >= 0.8f -> {
                Triple(
                    MatchPriority.EXACT_MATCH,
                    collectMatchedTags(video, audio),
                    collectMismatchedTags(video, audio)
                )
            }

            categoryScore >= 1.0f && (moodScore > 0.0f || tagScore > 0.0f) -> {
                Triple(
                    MatchPriority.PARTIAL_MATCH,
                    collectMatchedTags(video, audio),
                    collectMismatchedTags(video, audio)
                )
            }

            else -> {
                Triple(
                    MatchPriority.FALLBACK,
                    emptyList(),
                    video.tags + audio.tags
                )
            }
        }

        return MatchResult(
            score = clampedScore,
            priority = priority,
            matchedTags = matchedTags,
            mismatchedTags = mismatchedTags
        )
    }

    /**
     * Finds the best video/audio pairs for a given category by computing a
     * cross-product of all combinations, scoring each, and returning them
     * sorted by descending score.
     *
     * @param videos List of video content items
     * @param audios List of audio content items
     * @param category The target content category
     * @return List of content pairs sorted by match score (best first)
     */
    public fun findBestMatches(
        videos: List<ContentItem>,
        audios: List<ContentItem>,
        category: ContentCategory
    ): List<ContentPair> {
        if (videos.isEmpty() || audios.isEmpty()) {
            return emptyList()
        }

        // Filter items that belong to the target category first
        val categoryVideos = videos.filter { it.category.id == category.id }
        val categoryAudios = audios.filter { it.category.id == category.id }

        // If no category-specific items, try all items
        val candidateVideos = categoryVideos.ifEmpty { videos }
        val candidateAudios = categoryAudios.ifEmpty { audios }

        val pairs = mutableListOf<ContentPair>()

        for (video in candidateVideos) {
            for (audio in candidateAudios) {
                // Skip pairing audio with audio or video with video
                if (video.type == MediaType.AUDIO && audio.type == MediaType.AUDIO) continue
                if (video.type == MediaType.VIDEO && audio.type == MediaType.VIDEO) continue

                // Ensure video is VIDEO type and audio is AUDIO type for the pair
                val (videoItem, audioItem) = when {
                    video.type == MediaType.VIDEO && audio.type == MediaType.AUDIO ->
                        video to audio

                    audio.type == MediaType.VIDEO && video.type == MediaType.AUDIO ->
                        audio to video

                    else -> continue
                }

                val result = match(videoItem, audioItem)
                pairs.add(
                    ContentPair(
                        video = videoItem,
                        audio = audioItem,
                        matchScore = result.score,
                        isUserOverride = false
                    )
                )
            }
        }

        return pairs.sortedByDescending { it.matchScore }
    }

    // ── internal scoring helpers ───────────────────────────────────────────

    private fun scoreCategory(video: ContentItem, audio: ContentItem): Float {
        return if (video.category.id == audio.category.id) 1.0f else 0.0f
    }

    private fun scoreMood(video: ContentItem, audio: ContentItem): Float {
        val videoMood = video.metadata.mood ?: video.tags.find { it.key == "mood" }?.value
        val audioMood = audio.metadata.mood ?: audio.tags.find { it.key == "mood" }?.value

        return when {
            videoMood == null || audioMood == null -> 0.0f
            videoMood.equals(audioMood, ignoreCase = true) -> 1.0f
            areMoodsSimilar(videoMood, audioMood) -> 0.5f
            else -> 0.0f
        }
    }

    private fun scoreBpm(video: ContentItem, audio: ContentItem): Float {
        val videoBpm = video.metadata.bpm ?: return 0.0f
        val audioBpm = audio.metadata.bpm ?: return 0.0f
        val diff = abs(videoBpm - audioBpm)

        return when {
            diff <= 5 -> 1.0f
            diff <= 15 -> 0.7f
            diff <= 30 -> 0.4f
            else -> 0.0f
        }
    }

    private fun scoreTagOverlap(video: ContentItem, audio: ContentItem): Float {
        val videoTagMap = video.tags.associate { it.key to it.value.lowercase() }
        val audioTagMap = audio.tags.associate { it.key to it.value.lowercase() }

        val sharedKeys = videoTagMap.keys.intersect(audioTagMap.keys)
        if (sharedKeys.isEmpty()) return 0.0f

        var matches = 0
        for (key in sharedKeys) {
            if (videoTagMap[key] == audioTagMap[key]) {
                matches++
            }
        }

        return matches.toFloat() / sharedKeys.size.coerceAtLeast(1)
    }

    private fun collectMatchedTags(video: ContentItem, audio: ContentItem): List<ContentTag> {
        val videoTagMap = video.tags.associate { it.key to it.value.lowercase() }
        val audioTagMap = audio.tags.associate { it.key to it.value.lowercase() }

        return video.tags.filter {
            audioTagMap[it.key] == it.value.lowercase()
        }
    }

    private fun collectMismatchedTags(video: ContentItem, audio: ContentItem): List<ContentTag> {
        val videoTagMap = video.tags.associate { it.key to it.value.lowercase() }
        val audioTagMap = audio.tags.associate { it.key to it.value.lowercase() }

        val videoMismatches = video.tags.filter {
            audioTagMap[it.key] != it.value.lowercase()
        }
        val audioMismatches = audio.tags.filter {
            videoTagMap[it.key] != it.value.lowercase()
        }

        return videoMismatches + audioMismatches
    }

    private fun areMoodsSimilar(moodA: String, moodB: String): Boolean {
        val similarMoods = mapOf(
            "festive" to setOf("happy", "upbeat", "joyful", "celebratory"),
            "calm" to setOf("peaceful", "relaxing", "serene", "gentle"),
            "dark" to setOf("mysterious", "brooding", "somber", "noir"),
            "epic" to setOf("dramatic", "grand", "heroic", "intense"),
            "industrial" to setOf("mechanical", "gritty", "heavy")
        )

        val aLower = moodA.lowercase()
        val bLower = moodB.lowercase()

        if (aLower == bLower) return true

        for ((_, group) in similarMoods) {
            if (aLower in group && bLower in group) return true
        }

        return false
    }

    private companion object {
        const val CATEGORY_WEIGHT = 0.40f
        const val MOOD_WEIGHT = 0.25f
        const val BPM_WEIGHT = 0.20f
        const val TAG_WEIGHT = 0.15f
    }
}
