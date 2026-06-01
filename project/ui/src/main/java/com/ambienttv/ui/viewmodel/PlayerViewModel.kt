package com.ambienttv.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ambienttv.domain.model.ContentCategory
import com.ambienttv.domain.model.ContentPair
import com.ambienttv.domain.repository.FavoritesRepository
import com.ambienttv.domain.repository.HistoryRepository
import com.ambienttv.domain.usecase.AddFavoriteUseCase
import com.ambienttv.domain.usecase.GetSettingsUseCase
import com.ambienttv.domain.usecase.IsFavoriteUseCase
import com.ambienttv.domain.usecase.MatchContentUseCase
import com.ambienttv.domain.usecase.RecordPlaybackUseCase
import com.ambienttv.domain.usecase.RemoveFavoriteUseCase
import com.ambienttv.domain.usecase.WatchNextUseCase
import com.ambienttv.domain.preset.DefaultCategories
import androidx.media3.ui.PlayerView
import com.ambienttv.player.PlayerState
import com.ambienttv.player.SyncState
import com.ambienttv.player.SyncedPlaybackManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel for the Content Pair Player screen.
 *
 * Manages playback state, synchronization status, and the current content pair.
 * Delegates actual playback operations to [SyncedPlaybackManager] and
 * uses [MatchContentUseCase] to find new content pairs.
 *
 * @param syncedPlaybackManager Coordinates video and audio player synchronization
 * @param matchContentUseCase Use case for finding matching content pairs by category
 */
@HiltViewModel
class PlayerViewModel @Inject constructor(
    private val syncedPlaybackManager: SyncedPlaybackManager,
    private val matchContentUseCase: MatchContentUseCase,
    private val addFavoriteUseCase: AddFavoriteUseCase,
    private val removeFavoriteUseCase: RemoveFavoriteUseCase,
    private val isFavoriteUseCase: IsFavoriteUseCase,
    private val recordPlaybackUseCase: RecordPlaybackUseCase,
    private val favoritesRepository: FavoritesRepository,
    private val historyRepository: HistoryRepository,
    private val watchNextUseCase: WatchNextUseCase,
    getSettingsUseCase: GetSettingsUseCase
) : ViewModel() {

    private val _playerState = MutableStateFlow<PlayerState>(PlayerState.Idle)
    val playerState: StateFlow<PlayerState> = _playerState.asStateFlow()

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
    val syncState: StateFlow<SyncState> = _syncState.asStateFlow()

    private val _currentPair = MutableStateFlow<ContentPair?>(null)

    /**
     * The currently loaded content pair, or null if no pair is loaded.
     */
    val currentPair: StateFlow<ContentPair?> = _currentPair.asStateFlow()

    private val _isAmbientMode = MutableStateFlow(false)

    /**
     * Whether ambient mode (minimal UI) is currently active.
     */
    val isAmbientMode: StateFlow<Boolean> = _isAmbientMode.asStateFlow()

    private val _isLoading = MutableStateFlow(false)

    /**
     * Whether a content pair is currently being loaded/matched.
     */
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)

    /**
     * Error message to display, or null if no error.
     */
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _isStalled = MutableStateFlow(false)

    /**
     * Whether playback is stalled (buffering > 3 s).
     * UI can show a placeholder / quiet animation when true.
     */
    val isStalled: StateFlow<Boolean> = _isStalled.asStateFlow()

    private val _isFavorite = MutableStateFlow(false)
    val isFavorite: StateFlow<Boolean> = _isFavorite.asStateFlow()

    val settings = getSettingsUseCase()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = com.ambienttv.domain.model.AppSettings()
        )

    private val _sleepTimerRemainingSecs = MutableStateFlow(0)
    val sleepTimerRemainingSecs: StateFlow<Int> = _sleepTimerRemainingSecs.asStateFlow()

    val isSleepTimerActive: Boolean get() = _sleepTimerRemainingSecs.value > 0

    private var sleepTimerJob: kotlinx.coroutines.Job? = null

    init {
        // Observe the actual player state from SyncedPlaybackManager video player
        viewModelScope.launch {
            syncedPlaybackManager.videoPlayer.playerState.collect { state ->
                _playerState.value = state
            }
        }

        // Observe the actual sync state from SyncedPlaybackManager
        viewModelScope.launch {
            syncedPlaybackManager.syncState.collect { state ->
                _syncState.value = state
            }
        }

        // Observe stall state (slow network / buffering)
        viewModelScope.launch {
            syncedPlaybackManager.isStalled.collect { stalled ->
                _isStalled.value = stalled
            }
        }

        // Handle fatal playback errors (retries exhausted)
        syncedPlaybackManager.onPlaybackFailed = { error ->
            viewModelScope.launch {
                _errorMessage.value = "Playback error: ${error.message}. Switching to next pair..."
                // Auto-switch to next pair in the same category if available
                val category = _currentPair.value?.video?.category
                if (category != null) {
                    try {
                        val next = matchContentUseCase(category)
                        _currentPair.value = next
                        syncedPlaybackManager.loadPair(next)
                        syncedPlaybackManager.play()
                        _errorMessage.value = null
                    } catch (e: Exception) {
                        _errorMessage.value = e.message ?: "Failed to load fallback pair"
                    }
                }
            }
        }
    }

    /**
     * Starts playback of the currently loaded content pair.
     * Also resumes the sleep timer if one is configured.
     */
    fun play() {
        syncedPlaybackManager.play()
        maybeStartSleepTimer()
    }

    private fun maybeStartSleepTimer() {
        val minutes = settings.value.sleepTimerMinutes
        if (minutes > 0 && sleepTimerJob?.isActive != true) {
            _sleepTimerRemainingSecs.value = minutes * 60
            startSleepTimerCountdown()
        }
    }

    private fun startSleepTimerCountdown() {
        sleepTimerJob?.cancel()
        sleepTimerJob = viewModelScope.launch {
            while (_sleepTimerRemainingSecs.value > 0) {
                delay(1000L)
                _sleepTimerRemainingSecs.value -= 1
            }
            // Time's up
            syncedPlaybackManager.pause()
            _sleepTimerRemainingSecs.value = 0
        }
    }

    /**
     * Cancels any active sleep timer.
     */
    fun cancelSleepTimer() {
        sleepTimerJob?.cancel()
        _sleepTimerRemainingSecs.value = 0
    }

    /**
     * Pauses playback of the current content pair.
     */
    fun pause() {
        syncedPlaybackManager.pause()
    }

    /**
     * Stops playback and resets both players.
     */
    fun stop() {
        syncedPlaybackManager.stop()
    }

    /**
     * Loads and plays a new content pair for the given category.
     * Uses [MatchContentUseCase] to find the best matching pair,
     * then loads it into the [SyncedPlaybackManager].
     *
     * @param category The content category to find a pair for
     */
    fun nextPair(category: ContentCategory) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                val prevVolume = syncedPlaybackManager.audioPlayer.getVolume()
                // Fade out current audio
                syncedPlaybackManager.audioPlayer.fadeVolume(0f, 800L)
                kotlinx.coroutines.delay(800L)

                val pair = matchContentUseCase(category)
                _currentPair.value = pair
                observeFavoriteState(pair.id)
                syncedPlaybackManager.loadPair(pair)
                syncedPlaybackManager.audioPlayer.setVolume(0f)
                syncedPlaybackManager.play()
                // Fade in new audio
                syncedPlaybackManager.audioPlayer.fadeVolume(prevVolume, 1200L)
            } catch (e: Exception) {
                _errorMessage.value = e.message ?: "Failed to load content pair"
            } finally {
                _isLoading.value = false
            }
        }
    }

    /**
     * Loads a specific content pair directly without matching.
     *
     * @param pair The content pair to load and play
     */
    fun loadPair(pair: ContentPair) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                // If the pair contains placeholder URIs, resolve a real pair via matching
                val targetPair = if (pair.video.uri.isBlank() || pair.audio.uri.isBlank()) {
                    matchContentUseCase(pair.video.category)
                } else {
                    pair
                }
                loadPairInternal(targetPair)
            } catch (e: Exception) {
                _errorMessage.value = e.message ?: "Failed to load content pair"
            } finally {
                _isLoading.value = false
            }
        }
    }

    /**
     * Loads a content pair by its ID. Searches favorites, history, and falls back
     * to content matching if the ID is a category identifier.
     */
    fun loadPairById(pairId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                val targetPair = favoritesRepository.getFavoriteById(pairId)
                    ?: historyRepository.getEntryById(pairId)?.pair
                    ?: matchContentUseCase(resolveCategory(pairId))
                loadPairInternal(targetPair)
            } catch (e: Exception) {
                _errorMessage.value = e.message ?: "Failed to load content pair"
            } finally {
                _isLoading.value = false
            }
        }
    }

    private fun resolveCategory(pairId: String): ContentCategory {
        return DefaultCategories.ALL.find { it.id == pairId }
            ?: ContentCategory(
                id = pairId, name = "", description = "", defaultTags = emptyList()
            )
    }

    private suspend fun loadPairInternal(targetPair: ContentPair) {
        _currentPair.value = targetPair
        observeFavoriteState(targetPair.id)
        syncedPlaybackManager.loadPair(targetPair)
        syncedPlaybackManager.play()
        recordPlaybackUseCase(targetPair, progressMs = 0, durationMs = targetPair.video.metadata.durationMs)
        watchNextUseCase(targetPair)
    }

    /**
     * Attaches the video player to a [PlayerView] for surface rendering.
     * Call this inside the AndroidView update block.
     */
    fun attachVideoView(playerView: PlayerView) {
        syncedPlaybackManager.attachVideoView(playerView)
    }

    /**
     * Toggles whether the current content pair is favorited.
     */
    fun toggleFavorite() {
        val pair = _currentPair.value ?: return
        viewModelScope.launch {
            if (_isFavorite.value) {
                removeFavoriteUseCase(pair.id)
            } else {
                addFavoriteUseCase(pair)
            }
            _isFavorite.value = !_isFavorite.value
        }
    }

    private fun observeFavoriteState(pairId: String) {
        viewModelScope.launch {
            isFavoriteUseCase(pairId).collect { fav ->
                _isFavorite.value = fav
            }
        }
    }

    /**
     * Sets the audio volume level.
     *
     * @param volume Volume level from 0.0 (silent) to 1.0 (full volume)
     */
    fun setVolume(volume: Float) {
        syncedPlaybackManager.setAudioVolume(volume)
    }

    /**
     * Toggles ambient mode (minimal UI overlay).
     */
    fun toggleAmbientMode() {
        _isAmbientMode.value = !_isAmbientMode.value
    }

    /**
     * Enables or disables ambient mode.
     *
     * @param enabled True to enable ambient mode
     */
    fun setAmbientMode(enabled: Boolean) {
        _isAmbientMode.value = enabled
    }

    /**
     * Clears any displayed error message.
     */
    fun clearError() {
        _errorMessage.value = null
    }

    /**
     * Saves the current playback position to history before the ViewModel is destroyed.
     */
    fun saveCurrentProgress() {
        val pair = _currentPair.value ?: return
        val position = syncedPlaybackManager.videoPlayer.currentPosition
        val duration = pair.video.metadata.durationMs
        viewModelScope.launch {
            recordPlaybackUseCase(pair, progressMs = position, durationMs = duration)
            watchNextUseCase.updateProgress(pair.id, position)
        }
    }

    override fun onCleared() {
        super.onCleared()
        saveCurrentProgress()
        // Note: We don't release SyncedPlaybackManager here
        // as it's a singleton managed by the app lifecycle
    }
}
