package com.ambienttv.player

import androidx.media3.common.PlaybackException
import androidx.media3.common.util.UnstableApi
import androidx.media3.ui.PlayerView
import com.ambienttv.domain.model.ContentPair
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.abs

/**
 * Manages synchronized playback of a video/audio content pair.
 *
 * This singleton coordinates two [ExoPlayerWrapper] instances — one for video,
 * one for audio — ensuring they remain in sync throughout playback. It handles:
 *
 * - Loading content pairs into both players
 * - Periodic position synchronization (adjusts audio to match video)
 * - Loop coordination (both players loop independently, re-sync on each loop)
 * - Volume control for audio and mute control for video
 * - Seek coordination (seeking affects both players)
 * - Aggregated sync state observation via [syncState] Flow
 * - Stall detection (slow buffering > 3 s)
 * - Auto stop after prolonged pause (> 5 min) to free buffers
 * - Fatal error propagation for upstream fallback handling
 *
 * @param videoPlayer The ExoPlayerWrapper instance used for video playback.
 * @param audioPlayer The ExoPlayerWrapper instance used for audio playback.
 */
@Singleton
@UnstableApi
class SyncedPlaybackManager @Inject constructor(
    val videoPlayer: ExoPlayerWrapper,
    val audioPlayer: ExoPlayerWrapper
) {
    companion object {
        private const val SYNC_INTERVAL_MS = 200L
        private const val DRIFT_THRESHOLD_MS = 50L
        private const val SYNC_CORRECTION_FACTOR = 0.8
        private const val PAUSE_TIMEOUT_MS = 5L * 60L * 1000L // 5 minutes
        private const val TAG = "SyncedPlaybackManager"
    }

    /**
     * The currently loaded content pair, or null if no pair is loaded.
     */
    var currentPair: ContentPair? = null
        private set

    private val _syncState = MutableStateFlow(
        SyncState(
            isSynced = false,
            videoPosition = 0L,
            audioPosition = 0L,
            driftMs = 0L,
            isLooping = false,
            isPlaying = false,
            isLoaded = false
        )
    )

    val syncState: Flow<SyncState> = _syncState.asStateFlow()
    val currentSyncState: SyncState get() = _syncState.value

    /**
     * Emits true when either player has been buffering for more than 3 seconds.
     * UI can use this to show a placeholder / quiet animation.
     */
    val isStalled: StateFlow<Boolean> = combine(
        videoPlayer.isStalled,
        audioPlayer.isStalled
    ) { videoStalled, audioStalled ->
        videoStalled || audioStalled
    }.let { flow ->
        val stateFlow = MutableStateFlow(false)
        coroutineScope.launch {
            flow.collect { stateFlow.value = it }
        }
        stateFlow
    }

    private val coroutineScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var syncJob: Job? = null
    private var pauseTimeoutJob: Job? = null
    private var isReleased: Boolean = false

    val isLoaded: Boolean get() = currentPair != null

    val isPlaying: Boolean
        get() = videoPlayer.isPlaying && audioPlayer.isPlaying

    /**
     * Called when a player encounters a fatal error (retries exhausted).
     * The consumer (e.g. ViewModel) should switch to the next content pair.
     */
    var onPlaybackFailed: ((PlaybackException) -> Unit)? = null

    init {
        startSyncMonitoring()
        wireFatalErrorHandlers()
    }

    /**
     * Loads a content pair into both players.
     *
     * Stops any currently playing content, then prepares the video and audio
     * items from the pair. Returns true if both players were prepared successfully.
     *
     * @param pair The video/audio content pair to load.
     * @return True if both media items were prepared successfully.
     */
    fun loadPair(pair: ContentPair): Boolean {
        if (isReleased) return false

        stop()

        currentPair = pair

        try {
            videoPlayer.prepareVideo(uri = pair.video.uri, loop = true)
            audioPlayer.prepareAudio(uri = pair.audio.uri, loop = true)

            _syncState.value = _syncState.value.copy(
                isLooping = true,
                isLoaded = true,
                isPlaying = false,
                isSynced = false,
                videoPosition = 0L,
                audioPosition = 0L,
                driftMs = 0L
            )

            return true
        } catch (e: Exception) {
            _syncState.value = _syncState.value.copy(
                isLoaded = false,
                isPlaying = false
            )
            currentPair = null
            return false
        }
    }

    /**
     * Starts playback of both video and audio players.
     * Both players will begin playing simultaneously.
     */
    fun play() {
        if (isReleased || currentPair == null) return

        cancelPauseTimeout()
        videoPlayer.play()
        audioPlayer.play()

        _syncState.value = _syncState.value.copy(isPlaying = true)
    }

    /**
     * Pauses both video and audio players.
     * If paused for more than 5 minutes, players will be stopped automatically
     * to release buffered memory.
     */
    fun pause() {
        if (isReleased) return

        videoPlayer.pause()
        audioPlayer.pause()

        _syncState.value = _syncState.value.copy(isPlaying = false)
        startPauseTimeout()
    }

    /**
     * Stops both players and resets to the beginning.
     */
    fun stop() {
        if (isReleased) return

        cancelPauseTimeout()
        videoPlayer.stop()
        audioPlayer.stop()

        _syncState.value = _syncState.value.copy(
            isPlaying = false,
            videoPosition = 0L,
            audioPosition = 0L,
            driftMs = 0L
        )
    }

    /**
     * Seeks both video and audio players to the specified position.
     * The sync monitor will re-establish proper sync after the seek.
     *
     * @param positionMs The position to seek to, in milliseconds.
     */
    fun seekTo(positionMs: Long) {
        if (isReleased || currentPair == null) return

        val clampedPosition = positionMs.coerceAtLeast(0L)
        videoPlayer.seekTo(clampedPosition)
        audioPlayer.seekTo(clampedPosition)

        val videoPos = videoPlayer.currentPosition
        val audioPos = audioPlayer.currentPosition
        val drift = abs(videoPos - audioPos)
        _syncState.value = _syncState.value.copy(
            videoPosition = videoPos,
            audioPosition = audioPos,
            driftMs = drift,
            isSynced = drift <= DRIFT_THRESHOLD_MS
        )
    }

    /**
     * Sets the audio volume level.
     *
     * @param volume Volume level from 0.0 (silent) to 1.0 (full volume).
     */
    fun setAudioVolume(volume: Float) {
        if (isReleased) return
        audioPlayer.setVolume(volume.coerceIn(0f, 1f))
    }

    /**
     * Mutes or unmutes the video player.
     *
     * @param muted True to mute the video player, false to unmute.
     */
    fun setVideoMute(muted: Boolean) {
        if (isReleased) return
        videoPlayer.setMute(muted)
    }

    /**
     * Releases all resources held by this manager and both player instances.
     * After calling this method, this manager must not be used again.
     */
    fun release() {
        isReleased = true
        syncJob?.cancel()
        cancelPauseTimeout()
        coroutineScope.cancel()
        videoPlayer.release()
        audioPlayer.release()
        currentPair = null
    }

    /**
     * Attaches the video [ExoPlayer] to a [PlayerView] so that video frames are rendered.
     * Safe to call multiple times (e.g. on configuration change or recomposition).
     */
    fun attachVideoView(playerView: PlayerView) {
        videoPlayer.attachPlayerView(playerView)
    }

    //region Internal Sync Logic

    private fun startSyncMonitoring() {
        syncJob?.cancel()
        syncJob = coroutineScope.launch {
            while (isActive) {
                if (!isReleased && currentPair != null) {
                    performSyncCheck()
                }
                delay(SYNC_INTERVAL_MS)
            }
        }
    }

    private fun performSyncCheck() {
        if (currentPair == null) return

        val videoPos = videoPlayer.currentPosition.coerceAtLeast(0L)
        val audioPos = audioPlayer.currentPosition.coerceAtLeast(0L)
        val drift = abs(videoPos - audioPos)
        val isSynced = drift <= DRIFT_THRESHOLD_MS

        if (!isSynced && videoPlayer.isPlaying && audioPlayer.isPlaying) {
            correctAudioDrift(videoPos, audioPos, drift)
        }

        val previousState = _syncState.value
        val videoLoopDetected = videoPos < previousState.videoPosition &&
                previousState.videoPosition > 0 &&
                videoPlayer.isPlaying
        val audioLoopDetected = audioPos < previousState.audioPosition &&
                previousState.audioPosition > 0 &&
                audioPlayer.isPlaying

        if (videoLoopDetected || audioLoopDetected) {
            audioPlayer.seekTo(videoPos)
        }

        _syncState.value = SyncState(
            isSynced = drift <= DRIFT_THRESHOLD_MS,
            videoPosition = videoPos,
            audioPosition = audioPlayer.currentPosition.coerceAtLeast(0L),
            driftMs = drift,
            isLooping = videoPlayer.isLooping && audioPlayer.isLooping,
            isPlaying = videoPlayer.isPlaying && audioPlayer.isPlaying,
            isLoaded = currentPair != null
        )
    }

    private fun correctAudioDrift(videoPos: Long, audioPos: Long, drift: Long) {
        if (drift > DRIFT_THRESHOLD_MS) {
            val targetOffset = ((videoPos - audioPos) * SYNC_CORRECTION_FACTOR).toLong()
            val newAudioPos = (audioPos + targetOffset).coerceAtLeast(0L)
            audioPlayer.seekTo(newAudioPos)
        }
    }

    //endregion

    //region Fatal Error Wiring

    private fun wireFatalErrorHandlers() {
        videoPlayer.onFatalError = { error ->
            onPlaybackFailed?.invoke(error)
        }
        audioPlayer.onFatalError = { error ->
            onPlaybackFailed?.invoke(error)
        }
    }

    //endregion

    //region Pause Timeout (memory cleanup)

    private fun startPauseTimeout() {
        cancelPauseTimeout()
        pauseTimeoutJob = coroutineScope.launch {
            delay(PAUSE_TIMEOUT_MS)
            if (!isReleased && currentPair != null && !isPlaying) {
                // Stop players to release decoder and buffer memory
                stop()
            }
        }
    }

    private fun cancelPauseTimeout() {
        pauseTimeoutJob?.cancel()
        pauseTimeoutJob = null
    }

    //endregion
}
