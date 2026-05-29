package com.ambienttv.player

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.media3.common.util.UnstableApi
import androidx.media3.session.CommandButton
import androidx.media3.session.DefaultMediaNotificationProvider
import androidx.media3.session.MediaLibraryService
import androidx.media3.session.MediaSession
import com.google.common.collect.ImmutableList
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

/**
 * Foreground service that manages media playback using Media3's MediaLibraryService.
 *
 * This service hosts a [MediaLibraryService.MediaLibrarySession] that provides a unified interface
 * for media control from system UI (notification, lock screen, Android TV home screen,
 * etc.). It maintains the playback session as a foreground service to keep playback
 * alive when the app is in the background.
 *
 * The service lifecycle follows these stages:
 * 1. **onCreate()** — Creates the [MediaLibraryService.MediaLibrarySession] with the video player's
 *    underlying ExoPlayer and the [MediaSessionCallback].
 * 2. **onGetSession()** — Returns the active session to controllers.
 * 3. **onDestroy()** — Releases the session and all player resources.
 *
 * This service uses the video player's ExoPlayer instance as the primary player
 * for the MediaLibraryService.MediaLibrarySession, while the audio player is managed internally by
 * [SyncedPlaybackManager] for synchronized playback.
 */
@UnstableApi
@AndroidEntryPoint
class PlaybackService : MediaLibraryService() {

    companion object {
        private const val NOTIFICATION_CHANNEL_ID = "ambienttv_playback_channel"
        private const val NOTIFICATION_CHANNEL_NAME = "AmbientTV Playback"
        private const val NOTIFICATION_ID = 1001
        private const val TAG = "PlaybackService"

        const val ACTION_PLAY = "com.ambienttv.player.action.PLAY"
        const val ACTION_PAUSE = "com.ambienttv.player.action.PAUSE"
        const val ACTION_STOP = "com.ambienttv.player.action.STOP"
    }

    @Inject
    lateinit var syncedPlaybackManager: SyncedPlaybackManager

    @Inject
    lateinit var videoPlayerWrapper: ExoPlayerWrapper

    private var mediaLibrarySession: MediaLibraryService.MediaLibrarySession? = null

    /**
     * Returns the active [MediaLibraryService.MediaLibrarySession] to any controller that connects.
     * This is called when system UI or other apps want to control playback.
     */
    override fun onGetSession(
        controllerInfo: MediaSession.ControllerInfo
    ): MediaLibraryService.MediaLibrarySession? {
        return mediaLibrarySession
    }

    /**
     * Called when the service is created. Sets up the MediaLibraryService.MediaLibrarySession
     * with the video player's ExoPlayer instance and the session callback.
     */
    override fun onCreate() {
        super.onCreate()

        createNotificationChannel()

        val videoPlayer = videoPlayerWrapper.player

        val callback = MediaSessionCallback(syncedPlaybackManager)

        mediaLibrarySession = MediaLibraryService.MediaLibrarySession.Builder(this, videoPlayer, callback)
            .setId("AmbientTV_MediaLibraryService.MediaLibrarySession")
            .build()

        // Set the session activity (pending intent launched when notification is tapped)
        // This would typically open the main activity
        mediaLibrarySession?.setSessionActivity(
            getSessionPendingIntent()
        )

        // Set custom layout with playback control buttons
        mediaLibrarySession?.setCustomLayout(
            ImmutableList.of(
                CommandButton.Builder()
                    .setDisplayName(getString(android.R.string.cut))
                    .setSessionCommand(MediaSessionCallback.COMMAND_SKIP_PREVIOUS)
                    .setIconResId(android.R.drawable.ic_media_previous)
                    .build(),
                CommandButton.Builder()
                    .setDisplayName(getString(android.R.string.copy))
                    .setSessionCommand(MediaSessionCallback.COMMAND_SKIP_NEXT)
                    .setIconResId(android.R.drawable.ic_media_next)
                    .build()
            )
        )

        // Configure the media notification provider for foreground service
        setMediaNotificationProvider(
            DefaultMediaNotificationProvider.Builder(this)
                .setChannelId(NOTIFICATION_CHANNEL_ID)
                .setChannelName(NOTIFICATION_CHANNEL_NAME.hashCode())
                .setNotificationId(NOTIFICATION_ID)
                .build()
        )
    }

    /**
     * Called when the service is being destroyed. Releases the MediaLibraryService.MediaLibrarySession
     * and all associated player resources.
     */
    override fun onDestroy() {
        // Release the media library session first
        mediaLibrarySession?.run {
            release()
        }
        mediaLibrarySession = null

        // Release the synced playback manager (which releases both players)
        syncedPlaybackManager.release()

        super.onDestroy()
    }

    /**
     * Updates the media session with the currently playing content pair metadata.
     * Call this after loading a new pair to update the notification and system UI.
     *
     * @param title The title to display for the current playback.
     * @param subtitle Optional subtitle (e.g., category name).
     */
    fun updatePlaybackMetadata(title: String, subtitle: String? = null) {
        val videoPlayer = videoPlayerWrapper.player
        val currentMediaItem = videoPlayer.currentMediaItem

        val updatedItem = currentMediaItem?.buildUpon()
            ?.setMediaMetadata(
                androidx.media3.common.MediaMetadata.Builder()
                    .setTitle(title)
                    .setSubtitle(subtitle)
                    .setIsBrowsable(false)
                    .setIsPlayable(true)
                    .build()
            )
            ?.build()

        updatedItem?.let {
            videoPlayer.setMediaItem(it)
        }
    }

    //region Notification

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                NOTIFICATION_CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "AmbientTV background playback"
                setShowBadge(false)
                enableLights(false)
                enableVibration(false)
                setSound(null, null)
            }

            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE)
                    as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun getSessionPendingIntent(): PendingIntent {
        // Launch the main activity when notification is tapped
        // Uses a generic intent since we don't have direct access to MainActivity
        val intent = packageManager?.getLaunchIntentForPackage(packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }

        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }

        return PendingIntent.getActivity(
            this,
            0,
            intent,
            flags
        )
    }

    /**
     * Creates a basic notification for the foreground service.
     * Used as a fallback when the Media3 notification provider is not available.
     */
    private fun createPlaybackNotification(): Notification {
        val pendingIntent = getSessionPendingIntent()

        return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle("AmbientTV")
            .setContentText("Playing ambient content")
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .build()
    }

    //endregion

    //region Service Actions

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_PLAY -> syncedPlaybackManager.play()
            ACTION_PAUSE -> syncedPlaybackManager.pause()
            ACTION_STOP -> {
                syncedPlaybackManager.stop()
                stopSelf()
            }
        }
        return super.onStartCommand(intent, flags, startId)
    }


}
