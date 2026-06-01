package com.ambienttv.player

import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import android.content.Context
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Dual-ExoPlayer wrapper for seamless crossfade between content pairs.
 *
 * Uses two [ExoPlayer] instances (A and B) so that while one is playing,
 * the other can be prepared with the next pair. When the switch is triggered,
 * a smooth volume crossfade occurs over [CROSSFADE_DURATION_MS].
 *
 * This eliminates audible gaps when switching categories or content pairs.
 */
@Singleton
@UnstableApi
class CrossfadePlayer @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        private const val CROSSFADE_DURATION_MS = 2000L
        private const val FADE_STEPS = 30
        private const val TAG = "CrossfadePlayer"
    }

    private val coroutineScope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    private val playerA: ExoPlayer = createPlayer()
    private val playerB: ExoPlayer = createPlayer()

    private var activePlayer: ExoPlayer = playerA
    private var inactivePlayer: ExoPlayer = playerB

    private var crossfadeJob: Job? = null

    private val _isCrossfading = MutableStateFlow(false)
    val isCrossfading: StateFlow<Boolean> = _isCrossfading.asStateFlow()

    private fun createPlayer(): ExoPlayer {
        return ExoPlayer.Builder(context)
            .setAudioAttributes(
                androidx.media3.common.AudioAttributes.Builder()
                    .setUsage(androidx.media3.common.C.USAGE_MEDIA)
                    .setContentType(androidx.media3.common.C.AUDIO_CONTENT_TYPE_MOVIE)
                    .build(),
                true
            )
            .setHandleAudioBecomingNoisy(true)
            .setWakeMode(androidx.media3.common.C.WAKE_MODE_LOCAL)
            .build()
    }

    /**
     * Prepares the next content pair on the inactive player.
     * Call this before [crossfadeTo] to ensure the next pair is ready.
     */
    fun prepareNext(videoUri: String, audioUri: String) {
        val nextPlayer = inactivePlayer

        nextPlayer.stop()
        nextPlayer.clearMediaItems()

        val videoItem = MediaItem.Builder().setUri(videoUri).build()
        val audioItem = MediaItem.Builder().setUri(audioUri).build()

        nextPlayer.addMediaItem(videoItem)
        nextPlayer.addMediaItem(audioItem)
        nextPlayer.repeatMode = Player.REPEAT_MODE_ONE
        nextPlayer.volume = 0f
        nextPlayer.prepare()
    }

    /**
     * Performs a crossfade from the currently active player to the inactive one.
     * After the crossfade completes, the players swap roles.
     */
    fun crossfadeTo() {
        if (_isCrossfading.value) return

        val fromPlayer = activePlayer
        val toPlayer = inactivePlayer

        if (toPlayer.playbackState != Player.STATE_READY) {
            toPlayer.play()
        }

        _isCrossfading.value = true

        crossfadeJob?.cancel()
        crossfadeJob = coroutineScope.launch {
            val stepDuration = CROSSFADE_DURATION_MS / FADE_STEPS

            for (i in 0..FADE_STEPS) {
                val fraction = i / FADE_STEPS.toFloat()
                fromPlayer.volume = 1f - fraction
                toPlayer.volume = fraction
                delay(stepDuration)
            }

            fromPlayer.volume = 0f
            fromPlayer.pause()
            toPlayer.volume = 1f

            // Swap roles
            val temp = activePlayer
            activePlayer = inactivePlayer
            inactivePlayer = temp

            _isCrossfading.value = false
        }
    }

    /**
     * Starts playback on the active player.
     */
    fun play() {
        activePlayer.play()
    }

    /**
     * Pauses the active player.
     */
    fun pause() {
        activePlayer.pause()
    }

    /**
     * Stops both players.
     */
    fun stop() {
        crossfadeJob?.cancel()
        playerA.stop()
        playerB.stop()
        playerA.volume = 1f
        playerB.volume = 1f
    }

    /**
     * Seeks the active player to the specified position.
     */
    fun seekTo(positionMs: Long) {
        activePlayer.seekTo(positionMs.coerceAtLeast(0L))
    }

    /**
     * Returns the current position of the active player.
     */
    val currentPosition: Long
        get() = activePlayer.currentPosition.coerceAtLeast(0L)

    /**
     * Returns the duration of the active player.
     */
    val duration: Long
        get() = activePlayer.duration.coerceAtLeast(0L)

    /**
     * Returns true if the active player is currently playing.
     */
    val isPlaying: Boolean
        get() = activePlayer.isPlaying

    /**
     * Sets the volume of the active player.
     */
    fun setVolume(volume: Float) {
        if (!_isCrossfading.value) {
            activePlayer.volume = volume.coerceIn(0f, 1f)
        }
    }

    /**
     * Releases both players and cancels all coroutines.
     */
    fun release() {
        crossfadeJob?.cancel()
        coroutineScope.cancel()
        playerA.release()
        playerB.release()
    }
}
