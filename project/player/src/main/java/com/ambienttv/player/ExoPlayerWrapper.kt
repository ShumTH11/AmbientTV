package com.ambienttv.player

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.ProgressiveMediaSource
import androidx.media3.ui.PlayerView
import com.ambienttv.player.cache.PlaybackCacheManager
import dagger.hilt.android.qualifiers.ApplicationContext
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
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Wrapper around Media3 ExoPlayer providing a coroutine-friendly API
 * with Flow-based state observation, automatic audio focus handling,
 * disk caching via [PlaybackCacheManager], and network fallback logic.
 *
 * This class is intended to be used as a singleton per player type
 * (one for video, one for audio) within [SyncedPlaybackManager].
 */
@Singleton
@UnstableApi
class ExoPlayerWrapper @Inject constructor(
    @ApplicationContext private val context: Context,
    cacheManager: PlaybackCacheManager
) {
    companion object {
        private const val POSITION_UPDATE_INTERVAL_MS = 100L
        private const val TAG = "ExoPlayerWrapper"
        private const val MAX_RETRIES = 3
        private const val RETRY_DELAY_MS = 1500L
        private const val BUFFERING_TIMEOUT_MS = 3000L
    }

    private val _playerState = MutableStateFlow<PlayerState>(PlayerState.Idle)
    val playerState: Flow<PlayerState> = _playerState.asStateFlow()
    val currentState: PlayerState get() = _playerState.value

    private val _isStalled = MutableStateFlow(false)
    val isStalled: StateFlow<Boolean> = _isStalled.asStateFlow()

    private val coroutineScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private var audioFocusRequest: AudioFocusRequest? = null
    private var hasAudioFocus: Boolean = false

    private val cacheDataSourceFactory = cacheManager.buildCacheDataSourceFactory()

    private val audioAttributes = AudioAttributes.Builder()
        .setUsage(C.USAGE_MEDIA)
        .setContentType(C.AUDIO_CONTENT_TYPE_MOVIE)
        .build()

    val player: ExoPlayer by lazy {
        ExoPlayer.Builder(context)
            .setAudioAttributes(
                androidx.media3.common.AudioAttributes.Builder()
                    .setUsage(C.USAGE_MEDIA)
                    .setContentType(C.AUDIO_CONTENT_TYPE_MOVIE)
                    .build(),
                true
            )
            .setHandleAudioBecomingNoisy(true)
            .setWakeMode(C.WAKE_MODE_LOCAL)
            .build()
            .apply {
                addListener(playerListener)
            }
    }

    val instanceId: String = UUID.randomUUID().toString()

    private var positionUpdateJob: Job? = null
    private var bufferingTimeoutJob: Job? = null
    private var fadeJob: Job? = null
    private var currentMediaType: MediaType = MediaType.UNKNOWN
    private var retryCount = 0
    private var lastPlayedUri: Uri? = null

    /**
     * Callback invoked when all retry attempts are exhausted.
     * The consumer (usually [SyncedPlaybackManager]) can trigger a fallback.
     */
    var onFatalError: ((PlaybackException) -> Unit)? = null

    val isActive: Boolean
        get() = player.playbackState != Player.STATE_IDLE &&
                player.playbackState != Player.STATE_ENDED

    val currentPosition: Long
        get() = if (isActive) player.currentPosition else 0L

    val duration: Long
        get() = if (isActive) player.duration.coerceAtLeast(0L) else 0L

    val isPlaying: Boolean
        get() = player.isPlaying

    var isLooping: Boolean = false
        private set

    private enum class MediaType {
        VIDEO, AUDIO, UNKNOWN
    }

    private val playerListener = object : Player.Listener {
        override fun onPlaybackStateChanged(playbackState: Int) {
            when (playbackState) {
                Player.STATE_IDLE -> {
                    _playerState.value = PlayerState.Idle
                    cancelBufferingTimeout()
                }
                Player.STATE_BUFFERING -> {
                    _playerState.value = PlayerState.Loading
                    startBufferingTimeout()
                }
                Player.STATE_READY -> {
                    cancelBufferingTimeout()
                    updateStateFromPlayer()
                }
                Player.STATE_ENDED -> {
                    cancelBufferingTimeout()
                    _playerState.value = PlayerState.Ended
                }
            }
        }

        override fun onIsPlayingChanged(isPlayingNow: Boolean) {
            if (isPlayingNow) {
                startPositionUpdates()
                _playerState.value = PlayerState.Playing(
                    position = player.currentPosition,
                    duration = player.duration.coerceAtLeast(0L)
                )
            } else if (player.playbackState == Player.STATE_READY) {
                positionUpdateJob?.cancel()
                _playerState.value = PlayerState.Paused
            }
        }

        override fun onPlayerError(error: PlaybackException) {
            positionUpdateJob?.cancel()
            cancelBufferingTimeout()
            handlePlayerError(error)
        }

        override fun onPositionDiscontinuity(
            oldPosition: Player.PositionInfo,
            newPosition: Player.PositionInfo,
            reason: Int
        ) {
            if (reason == Player.DISCONTINUITY_REASON_SEEK) {
                updateStateFromPlayer()
            }
        }
    }

    fun prepareVideo(uri: String, loop: Boolean = true) {
        currentMediaType = MediaType.VIDEO
        isLooping = loop
        prepareInternal(Uri.parse(uri), loop)
    }

    fun prepareAudio(uri: String, loop: Boolean = true) {
        currentMediaType = MediaType.AUDIO
        isLooping = loop
        prepareInternal(Uri.parse(uri), loop)
    }

    private fun prepareInternal(uri: Uri, loop: Boolean) {
        stop()
        _playerState.value = PlayerState.Loading
        retryCount = 0
        lastPlayedUri = uri

        val mediaItem = MediaItem.Builder()
            .setUri(uri)
            .build()

        val mediaSource = ProgressiveMediaSource.Factory(cacheDataSourceFactory)
            .createMediaSource(mediaItem)

        player.setMediaSource(mediaSource)
        player.repeatMode = if (loop) Player.REPEAT_MODE_ONE else Player.REPEAT_MODE_OFF
        player.prepare()
    }

    fun play() {
        if (currentMediaType == MediaType.AUDIO) {
            if (!hasAudioFocus) requestAudioFocus()
        }
        if (player.playbackState == Player.STATE_ENDED) {
            player.seekTo(0)
        }
        player.play()
    }

    fun pause() {
        player.pause()
    }

    fun stop() {
        player.stop()
        player.seekTo(0)
        positionUpdateJob?.cancel()
        cancelBufferingTimeout()
        fadeJob?.cancel()
        _playerState.value = PlayerState.Stopped
    }

    fun seekTo(positionMs: Long) {
        player.seekTo(positionMs.coerceAtLeast(0L))
    }

    /**
     * Attaches the internal [ExoPlayer] instance to a [PlayerView] for video rendering.
     * Call this from the UI layer (e.g. inside an AndroidView factory/update block).
     */
    fun attachPlayerView(playerView: PlayerView) {
        playerView.player = player
    }

    fun setVolume(volume: Float) {
        player.volume = volume.coerceIn(0f, 1f)
    }

    fun getVolume(): Float = player.volume

    fun setMute(muted: Boolean) {
        player.volume = if (muted) 0f else 1f
    }

    /**
     * Smoothly fades volume from current level to [targetVolume] over [durationMs].
     * Cancels any previous fade.
     */
    fun fadeVolume(targetVolume: Float, durationMs: Long = 1500L) {
        fadeJob?.cancel()
        val startVolume = player.volume
        val endVolume = targetVolume.coerceIn(0f, 1f)
        if (durationMs <= 0) {
            player.volume = endVolume
            return
        }
        fadeJob = coroutineScope.launch {
            val steps = 30
            val stepDuration = durationMs / steps
            for (i in 0..steps) {
                val fraction = i / steps.toFloat()
                player.volume = startVolume + (endVolume - startVolume) * fraction
                delay(stepDuration)
            }
            player.volume = endVolume
        }
    }

    fun release() {
        positionUpdateJob?.cancel()
        cancelBufferingTimeout()
        fadeJob?.cancel()
        coroutineScope.cancel()
        player.removeListener(playerListener)
        abandonAudioFocus()
        player.release()
        _playerState.value = PlayerState.Idle
    }

    //region Retry & Fallback

    private fun handlePlayerError(error: PlaybackException) {
        val isRecoverable = isNetworkError(error)
        if (isRecoverable && retryCount < MAX_RETRIES) {
            retryCount++
            coroutineScope.launch {
                delay(RETRY_DELAY_MS * retryCount)
                lastPlayedUri?.let { uri ->
                    val mediaItem = MediaItem.Builder().setUri(uri).build()
                    val mediaSource = ProgressiveMediaSource.Factory(cacheDataSourceFactory)
                        .createMediaSource(mediaItem)
                    player.setMediaSource(mediaSource)
                    player.prepare()
                    player.play()
                }
            }
        } else {
            _playerState.value = PlayerState.Error(error)
            onFatalError?.invoke(error)
        }
    }

    private fun isNetworkError(error: PlaybackException): Boolean {
        return when (error.errorCode) {
            PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_FAILED,
            PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_TIMEOUT,
            PlaybackException.ERROR_CODE_IO_INVALID_HTTP_CONTENT_TYPE,
            PlaybackException.ERROR_CODE_IO_BAD_HTTP_STATUS -> true
            else -> false
        }
    }

    //endregion

    //region Buffering Stall Detection

    private fun startBufferingTimeout() {
        cancelBufferingTimeout()
        bufferingTimeoutJob = coroutineScope.launch {
            delay(BUFFERING_TIMEOUT_MS)
            _isStalled.value = true
        }
    }

    private fun cancelBufferingTimeout() {
        bufferingTimeoutJob?.cancel()
        bufferingTimeoutJob = null
        if (_isStalled.value) _isStalled.value = false
    }

    //endregion

    //region Position Updates

    private fun startPositionUpdates() {
        positionUpdateJob?.cancel()
        positionUpdateJob = coroutineScope.launch {
            while (true) {
                if (player.isPlaying) {
                    val duration = player.duration.coerceAtLeast(0L)
                    val position = player.currentPosition.coerceAtLeast(0L)
                    _playerState.value = PlayerState.Playing(
                        position = position,
                        duration = duration
                    )
                }
                delay(POSITION_UPDATE_INTERVAL_MS)
            }
        }
    }

    private fun updateStateFromPlayer() {
        when {
            player.isPlaying -> {
                _playerState.value = PlayerState.Playing(
                    position = player.currentPosition.coerceAtLeast(0L),
                    duration = player.duration.coerceAtLeast(0L)
                )
            }
            player.playbackState == Player.STATE_READY -> {
                _playerState.value = PlayerState.Paused
            }
            else -> {
                // Keep current state
            }
        }
    }

    //endregion

    //region Audio Focus Handling

    private val audioFocusChangeListener = AudioManager.OnAudioFocusChangeListener { focusChange ->
        when (focusChange) {
            AudioManager.AUDIOFOCUS_GAIN -> {
                hasAudioFocus = true
                if (currentMediaType == MediaType.AUDIO) {
                    player.volume = 1f
                    play()
                }
            }
            AudioManager.AUDIOFOCUS_LOSS -> {
                hasAudioFocus = false
                pause()
            }
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> {
                hasAudioFocus = false
                pause()
            }
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> {
                if (currentMediaType == MediaType.AUDIO) {
                    player.volume = 0.2f
                }
            }
        }
    }

    private fun requestAudioFocus() {
        hasAudioFocus = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val afr = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(audioAttributes)
                .setWillPauseWhenDucked(true)
                .setOnAudioFocusChangeListener(audioFocusChangeListener)
                .build()
            audioFocusRequest = afr
            audioManager.requestAudioFocus(afr) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
        } else {
            @Suppress("DEPRECATION")
            audioManager.requestAudioFocus(
                audioFocusChangeListener,
                AudioManager.STREAM_MUSIC,
                AudioManager.AUDIOFOCUS_GAIN
            ) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
        }
    }

    private fun abandonAudioFocus() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioFocusRequest?.let {
                audioManager.abandonAudioFocusRequest(it)
            }
        } else {
            @Suppress("DEPRECATION")
            audioManager.abandonAudioFocus(audioFocusChangeListener)
        }
        hasAudioFocus = false
    }

    //endregion
}
