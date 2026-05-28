package com.ambienttv.player

/**
 * Represents the current state of an ExoPlayer instance.
 * Used to observe playback changes via a Kotlin Flow.
 */
sealed class PlayerState {
    /**
     * Player has been instantiated but no media is loaded.
     */
    data object Idle : PlayerState()

    /**
     * Player is buffering or loading media.
     */
    data object Loading : PlayerState()

    /**
     * Player is actively playing content.
     *
     * @property position Current playback position in milliseconds.
     * @property duration Total duration of the current media in milliseconds.
     */
    data class Playing(
        val position: Long,
        val duration: Long
    ) : PlayerState()

    /**
     * Player has been paused by the user or system.
     */
    data object Paused : PlayerState()

    /**
     * Playback stopped (not paused, explicitly stopped).
     */
    data object Stopped : PlayerState()

    /**
     * An error occurred during playback.
     *
     * @property exception The exception that caused the playback failure.
     */
    data class Error(
        val exception: Throwable
    ) : PlayerState()

    /**
     * Playback has reached the end of the media.
     */
    data object Ended : PlayerState()
}
