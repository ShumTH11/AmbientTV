package com.ambienttv.domain.usecase

import com.ambienttv.data.catalog.CatalogUpdater
import javax.inject.Inject

/**
 * Syncs the remote content catalog to local cache.
 * Safe to call on every app start — respects minimum sync interval (1 hour).
 */
class SyncCatalogUseCase @Inject constructor(
    private val catalogUpdater: CatalogUpdater
) {
    suspend operator fun invoke(): Boolean = catalogUpdater.syncIfNeeded()
}
