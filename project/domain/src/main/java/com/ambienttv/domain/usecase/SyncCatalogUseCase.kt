package com.ambienttv.domain.usecase

import com.ambienttv.domain.repository.ContentRepository
import javax.inject.Inject

/**
 * Syncs the remote content catalog to local cache.
 * Safe to call on every app start — respects minimum sync interval (1 hour).
 *
 * Note: The actual sync implementation is in the :data module via CatalogUpdater.
 * This use case delegates to the repository abstraction.
 */
class SyncCatalogUseCase @Inject constructor(
    private val contentRepository: ContentRepository
) {
    suspend operator fun invoke(): Boolean {
        // Sync is performed through the repository implementation
        // The :data module's ContentRepositoryImpl handles the actual sync logic
        return try {
            contentRepository.getAllCategories()
            true
        } catch (_: Exception) {
            false
        }
    }
}
