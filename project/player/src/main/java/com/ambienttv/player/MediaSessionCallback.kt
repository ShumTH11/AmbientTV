package com.ambienttv.player

import android.os.Bundle
import androidx.media3.common.MediaItem
import androidx.media3.common.util.UnstableApi
import androidx.media3.common.Player
import androidx.media3.session.LibraryResult
import androidx.media3.session.MediaLibraryService
import androidx.media3.session.MediaLibraryService.LibraryParams
import androidx.media3.session.MediaSession
import androidx.media3.session.SessionCommand
import androidx.media3.session.SessionCommands
import androidx.media3.session.SessionResult
import com.google.common.collect.ImmutableList
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture

/**
 * Callback implementation for [MediaLibraryService.MediaLibrarySession] that handles media item requests,
 * custom commands, and session connection events.
 *
 * This callback is registered with the [PlaybackService]'s MediaLibraryService.MediaLibrarySession and
 * serves as the bridge between the media session controller (e.g., system UI, notifications)
 * and the [SyncedPlaybackManager].
 */
@UnstableApi
class MediaSessionCallback(
    private val syncedPlaybackManager: SyncedPlaybackManager
) : MediaLibraryService.MediaLibrarySession.Callback {

    companion object {
        /** Custom command to skip to the next content pair. */
        val COMMAND_SKIP_NEXT = SessionCommand("ambienttv.action.SKIP_NEXT", Bundle.EMPTY)

        /** Custom command to skip to the previous content pair. */
        val COMMAND_SKIP_PREVIOUS = SessionCommand("ambienttv.action.SKIP_PREVIOUS", Bundle.EMPTY)

        /** Custom command to toggle ambient mode (visual-only, no UI overlay). */
        val COMMAND_TOGGLE_AMBIENT = SessionCommand("ambienttv.action.TOGGLE_AMBIENT", Bundle.EMPTY)

        /** Custom command to request current sync state. */
        val COMMAND_REQUEST_SYNC_STATE = SessionCommand("ambienttv.action.REQUEST_SYNC_STATE", Bundle.EMPTY)
    }

    /**
     * Called when a media controller requests to connect to this session.
     * Grants all available session commands to the connecting controller.
     */
    override fun onConnect(
        session: MediaSession,
        controller: MediaSession.ControllerInfo
    ): MediaSession.ConnectionResult {
        // Build the set of available session commands including custom commands
        val sessionCommands = SessionCommands.Builder()
            .add(COMMAND_SKIP_NEXT)
            .add(COMMAND_SKIP_PREVIOUS)
            .add(COMMAND_TOGGLE_AMBIENT)
            .add(COMMAND_REQUEST_SYNC_STATE)
            .build()

        return MediaSession.ConnectionResult.accept(
            sessionCommands,
            Player.Commands.EMPTY
        )
    }

    /**
     * Handles custom session commands sent by controllers.
     */
    override fun onCustomCommand(
        session: MediaSession,
        controller: MediaSession.ControllerInfo,
        customCommand: SessionCommand,
        args: Bundle
    ): ListenableFuture<SessionResult> {
        when (customCommand.customAction) {
            COMMAND_SKIP_NEXT.customAction -> {
                // Handle skip next - would integrate with content queue
            }
            COMMAND_SKIP_PREVIOUS.customAction -> {
                // Handle skip previous
            }
            COMMAND_TOGGLE_AMBIENT.customAction -> {
                // Toggle ambient mode
            }
            COMMAND_REQUEST_SYNC_STATE.customAction -> {
                // Return current sync state info
                val syncState = syncedPlaybackManager.currentSyncState
                val resultBundle = Bundle().apply {
                    putBoolean("isSynced", syncState.isSynced)
                    putLong("driftMs", syncState.driftMs)
                    putBoolean("isPlaying", syncState.isPlaying)
                }
                return Futures.immediateFuture(
                    SessionResult(SessionResult.RESULT_SUCCESS, resultBundle)
                )
            }
        }
        return Futures.immediateFuture(SessionResult(SessionResult.RESULT_SUCCESS))
    }

    /**
     * Called when a controller requests to add media items to the playlist.
     * Converts the requested items and forwards them to the player.
     */
    override fun onAddMediaItems(
        mediaSession: MediaSession,
        controller: MediaSession.ControllerInfo,
        mediaItems: MutableList<MediaItem>
    ): ListenableFuture<MutableList<MediaItem>> {
        // Process and validate the media items before adding them
        val processedItems = mediaItems.map { item ->
            // Ensure media items have proper metadata for playback
            if (item.mediaMetadata.title == null) {
                item.buildUpon()
                    .setMediaMetadata(
                        item.mediaMetadata.buildUpon()
                            .setTitle(item.mediaId)
                            .build()
                    )
                    .build()
            } else {
                item
            }
        }.toMutableList()

        return Futures.immediateFuture(processedItems)
    }

    /**
     * Called when a controller requests media items from the library.
     * Returns available content as browsable media items.
     */
    override fun onGetLibraryRoot(
        session: MediaLibraryService.MediaLibrarySession,
        browser: MediaSession.ControllerInfo,
        params: MediaLibraryService.LibraryParams?
    ): ListenableFuture<LibraryResult<MediaItem>> {
        // Create a root item for the media library
        val rootMetadata = androidx.media3.common.MediaMetadata.Builder()
            .setTitle("AmbientTV Library")
            .setIsBrowsable(true)
            .setMediaType(androidx.media3.common.MediaMetadata.MEDIA_TYPE_FOLDER_MIXED)
            .build()

        val rootItem = MediaItem.Builder()
            .setMediaId("root")
            .setMediaMetadata(rootMetadata)
            .build()

        return Futures.immediateFuture(LibraryResult.ofItem(rootItem, params))
    }

    /**
     * Returns children of a browsable media item in the library.
     */
    override fun onGetChildren(
        session: MediaLibraryService.MediaLibrarySession,
        browser: MediaSession.ControllerInfo,
        parentId: String,
        page: Int,
        pageSize: Int,
        params: MediaLibraryService.LibraryParams?
    ): ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> {
        // Return empty list for now - content browsing would be populated
        // from the content repository in a full implementation
        val children = ImmutableList.of<MediaItem>()
        return Futures.immediateFuture(LibraryResult.ofItemList(children, params))
    }

    /**
     * Returns a single media item from the library.
     */
    override fun onGetItem(
        session: MediaLibraryService.MediaLibrarySession,
        browser: MediaSession.ControllerInfo,
        mediaId: String
    ): ListenableFuture<LibraryResult<MediaItem>> {
        val item = MediaItem.Builder()
            .setMediaId(mediaId)
            .setMediaMetadata(
                androidx.media3.common.MediaMetadata.Builder()
                    .setTitle(mediaId)
                    .build()
            )
            .build()
        return Futures.immediateFuture(LibraryResult.ofItem(item, null))
    }

    /**
     * Called when a controller requests search within the library.
     */
    override fun onSearch(
        session: MediaLibraryService.MediaLibrarySession,
        browser: MediaSession.ControllerInfo,
        query: String,
        params: MediaLibraryService.LibraryParams?
    ): ListenableFuture<LibraryResult<Void>> {
        return Futures.immediateFuture(LibraryResult.ofVoid())
    }

    /**
     * Called when a controller requests search results.
     */
    override fun onGetSearchResult(
        session: MediaLibraryService.MediaLibrarySession,
        browser: MediaSession.ControllerInfo,
        query: String,
        page: Int,
        pageSize: Int,
        params: MediaLibraryService.LibraryParams?
    ): ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> {
        val results = ImmutableList.of<MediaItem>()
        return Futures.immediateFuture(LibraryResult.ofItemList(results, params))
    }
}
