package com.ambienttv.domain.usecase

import com.ambienttv.domain.model.ContentCategory
import com.ambienttv.domain.repository.ContentRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

/**
 * Use case for retrieving all available content categories.
 * Provides a reactive stream of categories that updates when the underlying data changes.
 */
public class GetCategoriesUseCase @Inject constructor(
    private val contentRepository: ContentRepository
) {

    /**
     * Retrieves all content categories as a Flow.
     *
     * @return Flow emitting the current list of content categories
     */
    public operator fun invoke(): Flow<List<ContentCategory>> {
        return contentRepository.getAllCategories()
    }
}
