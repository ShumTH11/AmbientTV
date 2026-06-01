package com.ambienttv.app.di

import android.content.Context
import androidx.media3.common.util.UnstableApi
import com.ambienttv.player.CrossfadePlayer
import com.ambienttv.player.ExoPlayerWrapper
import com.ambienttv.player.SyncedPlaybackManager
import com.ambienttv.player.cache.PlaybackCacheManager
import com.ambienttv.domain.analytics.AnalyticsTracker
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Named
import javax.inject.Singleton

/**
 * Hilt module that provides ExoPlayer and playback-related dependencies.
 *
 * Three [ExoPlayerWrapper] instances are provided:
 * - Unqualified: default player (same as video player, for PlaybackService compatibility)
 * - @Named("video"): dedicated video player
 * - @Named("audio"): dedicated audio player
 *
 * All players share a single [PlaybackCacheManager] (LRU disk cache).
 *
 * [SyncedPlaybackManager] coordinates both named players for synchronized
 * video + audio playback.
 */
@Module
@InstallIn(SingletonComponent::class)
object PlayerModule {

    /**
     * Provides the default ExoPlayerWrapper instance.
     * This is the unqualified binding used by PlaybackService for the
     * MediaLibrarySession's underlying player.
     */
    @Provides
    @Singleton
    fun provideExoPlayerWrapper(
        @ApplicationContext context: Context,
        cacheManager: PlaybackCacheManager
    ): ExoPlayerWrapper {
        return ExoPlayerWrapper(context, cacheManager)
    }

    /**
     * Provides the video player ExoPlayerWrapper instance.
     * This is used for video content playback within SyncedPlaybackManager.
     */
    @Provides
    @Singleton
    @Named("video")
    fun provideVideoPlayer(
        @ApplicationContext context: Context,
        cacheManager: PlaybackCacheManager
    ): ExoPlayerWrapper {
        return ExoPlayerWrapper(context, cacheManager)
    }

    /**
     * Provides the audio player ExoPlayerWrapper instance.
     * This is used for audio/background music playback within SyncedPlaybackManager.
     */
    @Provides
    @Singleton
    @Named("audio")
    fun provideAudioPlayer(
        @ApplicationContext context: Context,
        cacheManager: PlaybackCacheManager
    ): ExoPlayerWrapper {
        return ExoPlayerWrapper(context, cacheManager)
    }

    /**
     * Provides the CrossfadePlayer for seamless transitions between content pairs.
     */
    @Provides
    @Singleton
    @UnstableApi
    fun provideCrossfadePlayer(
        @ApplicationContext context: Context
    ): CrossfadePlayer {
        return CrossfadePlayer(context)
    }

    /**
     * Provides the SyncedPlaybackManager that coordinates video and audio playback.
     */
    @Provides
    @Singleton
    @UnstableApi
    fun provideSyncedPlaybackManager(
        @Named("video") videoPlayer: ExoPlayerWrapper,
        @Named("audio") audioPlayer: ExoPlayerWrapper,
        crossfadePlayer: CrossfadePlayer,
        analyticsTracker: AnalyticsTracker
    ): SyncedPlaybackManager {
        return SyncedPlaybackManager(videoPlayer, audioPlayer, crossfadePlayer, analyticsTracker)
    }
}
