package com.ambienttv.app.recommendations

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.tvprovider.media.tv.TvContractCompat
import androidx.tvprovider.media.tv.WatchNextProgram
import com.ambienttv.domain.model.ContentPair
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WatchNextHelper @Inject constructor(
    @ApplicationContext private val context: Context
) {

    suspend fun add(pair: ContentPair) = withContext(Dispatchers.IO) {
        val contentUri = TvContractCompat.WatchNextPrograms.CONTENT_URI

        // Remove any stale entry for this pair first
        context.contentResolver.delete(
            contentUri,
            "${TvContractCompat.WatchNextPrograms.COLUMN_INTERNAL_PROVIDER_ID} = ?",
            arrayOf(pair.id)
        )

        val intent = context.packageManager
            ?.getLaunchIntentForPackage(context.packageName)
            ?.apply {
                action = Intent.ACTION_VIEW
                data = Uri.parse("ambienttv://play/${pair.id}")
                flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            ?: return@withContext

        val posterUri = pair.video.thumbnailUrl.takeIf { it.isNotBlank() }
            ?.let { Uri.parse(it) }

        val values = WatchNextProgram.Builder()
            .setType(WatchNextProgram.TYPE_CONTINUE)
            .setTitle(pair.video.title)
            .setDescription("Ambient: ${pair.video.category.name}")
            .apply { posterUri?.let { setPosterArtUri(it) } }
            .setIntent(intent)
            .setInternalProviderId(pair.id)
            .setLastPlaybackPositionMillis(0)
            .setDurationMillis((pair.video.duration * 1000L).toInt())
            .build()
            .toContentValues()

        context.contentResolver.insert(contentUri, values)
    }

    suspend fun updateProgress(pairId: String, positionMs: Long) = withContext(Dispatchers.IO) {
        val values = ContentValues().apply {
            put(TvContractCompat.WatchNextPrograms.COLUMN_LAST_PLAYBACK_POSITION_MILLIS, positionMs)
        }
        context.contentResolver.update(
            TvContractCompat.WatchNextPrograms.CONTENT_URI,
            values,
            "${TvContractCompat.WatchNextPrograms.COLUMN_INTERNAL_PROVIDER_ID} = ?",
            arrayOf(pairId)
        )
    }

    suspend fun remove(pairId: String) = withContext(Dispatchers.IO) {
        context.contentResolver.delete(
            TvContractCompat.WatchNextPrograms.CONTENT_URI,
            "${TvContractCompat.WatchNextPrograms.COLUMN_INTERNAL_PROVIDER_ID} = ?",
            arrayOf(pairId)
        )
    }
}
