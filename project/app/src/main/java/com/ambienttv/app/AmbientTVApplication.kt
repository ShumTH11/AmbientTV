package com.ambienttv.app

import android.app.Application
import androidx.hilt.work.HiltWorkerFactory
import androidx.media3.common.util.Log
import androidx.media3.common.util.UnstableApi
import androidx.work.Configuration
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.ambienttv.data.catalog.CatalogDataSource
import com.ambienttv.data.catalog.CatalogSyncWorker
import com.ambienttv.data.local.dao.CategoryDao
import com.ambienttv.data.local.dao.ContentDao
import com.ambienttv.data.local.dao.ContentPairDao
import com.ambienttv.data.local.database.AppDatabase
import com.ambienttv.data.mapper.DomainMapper
import com.ambienttv.domain.preset.DefaultCategories
import com.ambienttv.player.SyncedPlaybackManager
import dagger.hilt.android.HiltAndroidApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.concurrent.TimeUnit
import javax.inject.Inject

/**
 * Application class for AmbientTV — the entry point of the app.
 *
 * Annotated with [@HiltAndroidApp] to trigger Hilt's code generation
 * for dependency injection throughout the app.
 *
 * In [onCreate], the app:
 * 1. Initializes Timber for logging (uses Media3's Log on API < 29, or platform logging)
 * 2. Preloads default categories into the Room database
 * 3. Seeds the bundled catalog into SQLite ( Room ) for offline availability
 * 4. Pre-warms the Media3 disk cache by silently buffering the first chunk
 *    of each category's primary content pair.
 */
@UnstableApi
@HiltAndroidApp
class AmbientTVApplication : Application(), Configuration.Provider {

    @Inject
    lateinit var appDatabase: AppDatabase

    @Inject
    lateinit var categoryDao: CategoryDao

    @Inject
    lateinit var contentDao: ContentDao

    @Inject
    lateinit var contentPairDao: ContentPairDao

    @Inject
    lateinit var domainMapper: DomainMapper

    @Inject
    lateinit var catalogDataSource: CatalogDataSource

    @Inject
    lateinit var syncedPlaybackManager: SyncedPlaybackManager

    @Inject
    lateinit var workerFactory: HiltWorkerFactory

    private val applicationScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        initializeLogging()
        preloadDefaultCategories()
        seedCatalogAndPreloadCache()
        scheduleCatalogSync()
    }

    /**
     * Initializes the logging framework.
     * Uses Media3's Log utility for consistent logging across all modules.
     */
    private fun initializeLogging() {
        Log.setLogLevel(Log.LOG_LEVEL_ALL)
    }

    /**
     * Preloads the default content categories into the Room database.
     * This ensures categories are available immediately on first launch.
     * Uses REPLACE conflict strategy so repeated inserts are idempotent.
     */
    private fun preloadDefaultCategories() {
        applicationScope.launch {
            try {
                val existing = categoryDao.getAllOnce()
                if (existing.isEmpty()) {
                    DefaultCategories.ALL.forEach { category ->
                        val entity = domainMapper.toCategoryEntity(category)
                        categoryDao.insert(entity)
                    }
                }
            } catch (e: Exception) {
                Log.w("AmbientTVApplication", "Failed to preload default categories: ${e.message}")
            }
        }
    }

    /**
     * Seeds the bundled JSON catalog into Room and pre-warms the Media3 cache.
     *
     * Steps:
     * 1. For each default category, fetch curated pairs from [CatalogDataSource].
     * 2. Persist videos and audio items to [contentDao].
     * 3. Persist pairs to [contentPairDao] (idempotent via REPLACE).
     * 4. Silently load the first pair of each category into the players
     *    for ~4 seconds to trigger chunk download into [SimpleCache].
     */
    private fun seedCatalogAndPreloadCache() {
        applicationScope.launch {
            try {
                DefaultCategories.ALL.forEach { category ->
                    val pairs = catalogDataSource.getPairs(category)
                    if (pairs.isEmpty()) return@forEach

                    // Persist items and pairs to Room
                    pairs.forEach { pair ->
                        contentDao.insert(domainMapper.toContentEntity(pair.video))
                        contentDao.insert(domainMapper.toContentEntity(pair.audio))
                        contentPairDao.insert(domainMapper.toContentPairEntity(pair))
                    }

                    // Pre-warm cache: silently buffer the first pair for 4 seconds
                    val firstPair = pairs.first()
                    syncedPlaybackManager.loadPair(firstPair)
                    syncedPlaybackManager.setAudioVolume(0f)   // silent
                    syncedPlaybackManager.setVideoMute(true)   // silent
                    syncedPlaybackManager.play()
                    delay(4_000) // enough to fetch the first 2-5 MB chunks
                    syncedPlaybackManager.stop()
                }
                Log.i("AmbientTVApplication", "Catalog seeded and cache pre-warmed successfully.")
            } catch (e: Exception) {
                Log.w("AmbientTVApplication", "Failed to seed catalog or preload cache: ${e.message}")
            }
        }
    }

    override fun getWorkManagerConfiguration(): Configuration {
        return Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()
    }

    private fun scheduleCatalogSync() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val syncRequest = PeriodicWorkRequestBuilder<CatalogSyncWorker>(6, TimeUnit.HOURS)
            .setConstraints(constraints)
            .build()

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            CatalogSyncWorker.WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            syncRequest
        )
    }
}
