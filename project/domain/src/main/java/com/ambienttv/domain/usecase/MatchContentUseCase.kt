package com.ambienttv.domain.usecase

import com.ambienttv.domain.ai.AIContentAdapter
import com.ambienttv.domain.model.ContentCategory
import com.ambienttv.domain.model.ContentPair
import com.ambienttv.domain.preset.PlaceholderContent
import com.ambienttv.domain.repository.ContentRepository
import javax.inject.Inject

/**
 * Use case for matching video and audio content based on a selected category.
 * First attempts AI-driven matching, then falls back to repository-based pairing.
 */
public class MatchContentUseCase @Inject constructor(
    private val contentRepository: ContentRepository,
    private val aiContentAdapter: AIContentAdapter
) {

    /**
     * Finds the best content pair for the given category.
     *
     * @param category The content category to match against
     * @return The best matching content pair
     */
    public suspend operator fun invoke(category: ContentCategory): ContentPair {
        return try {
            aiContentAdapter.matchContentByCategory(category)
        } catch (_: Exception) {
            val pairs = contentRepository.getContentPairs(category)
            pairs.firstOrNull()
                ?: throw NoSuchElementException(
                    "No content pairs available for category: ${category.name}"
                )
        }
    }
}
