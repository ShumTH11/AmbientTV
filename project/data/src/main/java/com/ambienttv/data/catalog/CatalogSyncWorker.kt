package com.ambienttv.data.catalog

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject

@HiltWorker
class CatalogSyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val catalogUpdater: CatalogUpdater,
    private val catalogDataSource: CatalogDataSource
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return try {
            val synced = catalogUpdater.syncIfNeeded()
            if (synced) {
                catalogDataSource.invalidateCache()
            }
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }

    companion object {
        const val WORK_NAME = "catalog_sync_work"
    }
}
