package com.ambienttv.data.catalog

import android.content.Context
import com.ambienttv.data.remote.api.AmbientBackendApi
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.encodeToString
import timber.log.Timber
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Downloads the latest content catalog from the backend and caches it
 * in internal storage so that content updates happen without app updates.
 *
 * Falls back silently on network errors — the existing local/Assets catalog
 * remains usable.
 */
@Singleton
class CatalogUpdater @Inject constructor(
    @ApplicationContext private val context: Context,
    private val backendApi: AmbientBackendApi,
    private val json: Json
) {

    companion object {
        private const val CATALOG_FILE_NAME = "content_catalog.json"
        private const val MIN_SYNC_INTERVAL_MS = 60 * 60 * 1000L // 1 hour
    }

    private val catalogFile: File
        get() = File(context.filesDir, CATALOG_FILE_NAME)

    private val prefs = context.getSharedPreferences("catalog_sync", Context.MODE_PRIVATE)

    /**
     * Returns true if a cached catalog exists in internal storage.
     */
    fun hasCachedCatalog(): Boolean = catalogFile.exists()

    /**
     * Reads the cached catalog from internal storage, or null if absent.
     */
    fun readCachedCatalog(): CatalogDto? {
        return try {
            val text = catalogFile.readText()
            json.decodeFromString(CatalogDto.serializer(), text)
        } catch (e: Exception) {
            Timber.e(e, "Failed to read cached catalog")
            null
        }
    }

    /**
     * Fetches the latest catalog from the backend if enough time has passed
     * since the last successful sync. Returns true if a new catalog was written.
     */
    suspend fun syncIfNeeded(): Boolean {
        val lastSync = prefs.getLong("last_sync", 0)
        val now = System.currentTimeMillis()
        if (now - lastSync < MIN_SYNC_INTERVAL_MS) {
            return false
        }
        return try {
            val remote = backendApi.getCatalog()
            val text = json.encodeToString(CatalogDto.serializer(), remote)
            catalogFile.writeText(text)
            prefs.edit().putLong("last_sync", now).apply()
            true
        } catch (e: Exception) {
            Timber.e(e, "Catalog sync failed")
            false
        }
    }

    /**
     * Forces an immediate sync regardless of the interval.
     */
    suspend fun forceSync(): Boolean {
        return try {
            val remote = backendApi.getCatalog()
            val text = json.encodeToString(CatalogDto.serializer(), remote)
            catalogFile.writeText(text)
            prefs.edit().putLong("last_sync", System.currentTimeMillis()).apply()
            true
        } catch (e: Exception) {
            Timber.e(e, "Catalog force sync failed")
            false
        }
    }
}
