package com.ambienttv.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ambienttv.player.SyncState
import com.ambienttv.player.SyncedPlaybackManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel for the Ambient Mode screen.
 *
 * Manages the auto-hide behavior for the minimal ambient UI.
 * After 5 seconds of inactivity, all UI controls are hidden.
 * Any user interaction (D-pad input) immediately shows the UI again.
 *
 * @param syncedPlaybackManager Coordinates video and audio player synchronization
 */
@HiltViewModel
class AmbientViewModel @Inject constructor(
    private val syncedPlaybackManager: SyncedPlaybackManager
) : ViewModel() {

    companion object {
        private const val AUTO_HIDE_DELAY_MS = 5000L
    }

    private val _showUI = MutableStateFlow(true)

    /**
     * Whether UI controls should be visible.
     * Automatically becomes false after [AUTO_HIDE_DELAY_MS] of inactivity.
     * Set to true when the user interacts with the D-pad.
     */
    val showUI: StateFlow<Boolean> = _showUI.asStateFlow()

    private val _currentPairTitle = MutableStateFlow("")

    /**
     * Title of the currently playing content pair.
     */
    val currentPairTitle: StateFlow<String> = _currentPairTitle.asStateFlow()

    private val _currentCategoryName = MutableStateFlow("")

    /**
     * Name of the current content category.
     */
    val currentCategoryName: StateFlow<String> = _currentCategoryName.asStateFlow()

    /**
     * The synchronization state between video and audio players.
     */
    val syncState: StateFlow<SyncState> = MutableStateFlow(
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

    private var autoHideJob: Job? = null

    init {
        // Observe the actual sync state from SyncedPlaybackManager
        viewModelScope.launch {
            syncedPlaybackManager.syncState.collect { state ->
                (syncState as MutableStateFlow).value = state
            }
        }

        // Set initial info from current pair
        syncedPlaybackManager.currentPair?.let { pair ->
            _currentPairTitle.value = pair.video.title
            _currentCategoryName.value = pair.video.category.name
        }

        // Start the auto-hide timer
        startAutoHideTimer()
    }

    /**
     * Called when the user interacts with the D-pad or remote.
     * Immediately shows the UI and resets the auto-hide timer.
     */
    fun onUserInteraction() {
        _showUI.value = true
        startAutoHideTimer()
    }

    /**
     * Manually shows the UI controls without resetting the auto-hide timer.
     */
    fun showUI() {
        _showUI.value = true
    }

    /**
     * Manually hides the UI controls immediately.
     */
    fun hideUI() {
        _showUI.value = false
        autoHideJob?.cancel()
    }

    /**
     * Updates the displayed content pair information.
     *
     * @param title The title of the current content pair
     * @param categoryName The name of the current category
     */
    fun setContentInfo(title: String, categoryName: String) {
        _currentPairTitle.value = title
        _currentCategoryName.value = categoryName
    }

    private fun startAutoHideTimer() {
        autoHideJob?.cancel()
        autoHideJob = viewModelScope.launch {
            delay(AUTO_HIDE_DELAY_MS)
            _showUI.value = false
        }
    }

    override fun onCleared() {
        super.onCleared()
        autoHideJob?.cancel()
    }
}
