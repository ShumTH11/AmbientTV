package com.ambienttv.player

/**
 * Represents the synchronization state between video and audio players.
 * Emitted periodically by [SyncedPlaybackManager] to report drift and sync health.
 */
data class SyncState(
    /**
     * Whether the audio and video players are currently in sync
     * (drift is within acceptable threshold).
     */
    val isSynced: Boolean,

    /**
     * Current playback position of the video player in milliseconds.
     */
    val videoPosition: Long,

    /**
     * Current playback position of the audio player in milliseconds.
     */
    val audioPosition: Long,

    /**
     * The absolute difference between video and audio positions in milliseconds.
     * A positive value means audio is ahead of video.
     */
    val driftMs: Long,

    /**
     * Whether both players are configured to loop their content.
     */
    val isLooping: Boolean,

    /**
     * Whether the pair is currently playing (not paused or stopped).
     */
    val isPlaying: Boolean = false,

    /**
     * Whether a content pair is loaded and ready for playback.
     */
    val isLoaded: Boolean = false
)
