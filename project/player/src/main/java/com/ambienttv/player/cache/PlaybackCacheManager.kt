package com.ambienttv.player.cache

import android.content.Context
import android.os.StatFs
import androidx.media3.common.util.UnstableApi
import androidx.media3.database.DatabaseProvider
import androidx.media3.database.StandaloneDatabaseProvider
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.datasource.cache.LeastRecentlyUsedCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages Media3 disk cache for streaming video and audio.
 *
 * Features:
 * - LRU eviction when the cache size limit is reached.
 * - Auto fallback from 1 GB to 500 MB when free disk space is low.
 * - Cache key derived from URL hash (no duplication for identical streams).
 * - Shared [SimpleCache] instance for all player wrappers.
 */
@UnstableApi
@Singleton
class PlaybackCacheManager @Inject constructor(
    @ApplicationContext private val context: Context
) {

    companion object {
        private const val CACHE_DIR_NAME = "ambienttv_media_cache"
        private const val DEFAULT_MAX_CACHE_BYTES = 1024L * 1024L * 1024L // 1 GB
        private const val FALLBACK_MAX_CACHE_BYTES = 500L * 1024L * 1024L // 500 MB
    }

    private val databaseProvider: DatabaseProvider = StandaloneDatabaseProvider(context)

    /**
     * Lazy-initialized [SimpleCache]. Released automatically on app termination,
     * but [release] can be called explicitly for testing.
     */
    val cache: SimpleCache by lazy {
        val cacheDir = File(context.cacheDir, CACHE_DIR_NAME)
        if (!cacheDir.exists()) cacheDir.mkdirs()

        val maxBytes = resolveMaxCacheBytes(cacheDir)

        SimpleCache(
            cacheDir,
            LeastRecentlyUsedCacheEvictor(maxBytes),
            databaseProvider
        )
    }

    /**
     * Builds a [DataSource.Factory] that reads from / writes to this cache.
     * Falls back to upstream on cache errors so playback is never blocked
     * by a corrupted cache entry.
     */
    fun buildCacheDataSourceFactory(): DataSource.Factory {
        val upstreamFactory = DefaultDataSource.Factory(context)
        return CacheDataSource.Factory()
            .setCache(cache)
            .setUpstreamDataSourceFactory(upstreamFactory)
            .setFlags(CacheDataSource.FLAG_IGNORE_CACHE_ON_ERROR)
    }

    /**
     * Releases the cache. Should be called when the application is destroyed
     * to avoid leaking the database provider.
     */
    fun release() {
        if (::cache.isInitialized) {
            cache.release()
        }
    }

    /**
     * Chooses cache size based on available disk space.
     * If less than 2 GB is free, fallback to 500 MB to avoid "раздувания".
     */
    private fun resolveMaxCacheBytes(cacheDir: File): Long {
        return try {
            val stat = StatFs(cacheDir.absolutePath)
            val availableBytes = stat.availableBytes
            if (availableBytes > DEFAULT_MAX_CACHE_BYTES * 2) {
                DEFAULT_MAX_CACHE_BYTES
            } else {
                FALLBACK_MAX_CACHE_BYTES
            }
        } catch (_: Exception) {
            FALLBACK_MAX_CACHE_BYTES
        }
    }
}
