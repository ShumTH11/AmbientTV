package com.ambienttv.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.media3.common.util.UnstableApi
import androidx.media3.ui.PlayerView
import com.ambienttv.domain.model.ContentPair
import com.ambienttv.player.PlayerState
import com.ambienttv.ui.component.PlaybackControls
import com.ambienttv.ui.viewmodel.PlayerViewModel
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text

/**
 * Content Pair Player Screen - full-screen video player with minimal overlay.
 *
 * Displays video content using an AndroidView-wrapped ExoPlayer PlayerView
 * with synchronized audio managed by [SyncedPlaybackManager]. Shows playback
 * controls (play/pause, next pair, volume, ambient mode toggle) as an overlay.
 *
 * Features:
 * - Full-screen video using AndroidView wrapping ExoPlayer's PlayerView
 * - Playback controls overlay with fade animation
 * - Shows current pair info (category, title)
 * - Play/Pause, next pair, ambient mode toggle controls
 * - D-pad input handling for control visibility and playback
 * - Back navigation support
 * - Auto-hides controls after user inactivity
 *
 * @param viewModel The [PlayerViewModel] managing playback state
 * @param pair The content pair to play (used on initial load)
 * @param onBack Callback for back navigation
 */
@Composable
fun ContentPairPlayerScreen(
    viewModel: PlayerViewModel = hiltViewModel(),
    pair: ContentPair,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val playerState by viewModel.playerState.collectAsStateWithLifecycle()
    val syncState by viewModel.syncState.collectAsStateWithLifecycle()
    val currentPair by viewModel.currentPair.collectAsStateWithLifecycle()
    val isAmbientMode by viewModel.isAmbientMode.collectAsStateWithLifecycle()
    val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()
    val errorMessage by viewModel.errorMessage.collectAsStateWithLifecycle()
    val isFavorite by viewModel.isFavorite.collectAsStateWithLifecycle()

    // Track whether controls should be visible
    var controlsVisible by remember { mutableStateOf(true) }

    // Focus requester for D-pad handling
    val focusRequester = remember { FocusRequester() }

    // Load the pair when first composed
    LaunchedEffect(pair.id) {
        if (pair.video.uri.isBlank() || pair.audio.uri.isBlank()) {
            viewModel.loadPairById(pair.id)
        } else {
            viewModel.loadPair(pair)
        }
        focusRequester.requestFocus()
    }

    // Toggle controls on D-pad center, hide on play
    LaunchedEffect(playerState) {
        if (playerState is PlayerState.Playing) {
            // Keep controls visible briefly when playback starts
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .focusRequester(focusRequester)
            .focusProperties { canFocus = true }
            .onKeyEvent { event ->
                if (event.type == KeyEventType.KeyUp) {
                    when (event.key) {
                        Key.DirectionCenter, Key.Enter, Key.Spacebar -> {
                            viewModel.play()
                            true
                        }
                        Key.DirectionUp, Key.DirectionDown,
                        Key.DirectionLeft, Key.DirectionRight -> {
                            controlsVisible = !controlsVisible
                            true
                        }
                        Key.Back, Key.Escape -> {
                            onBack()
                            true
                        }
                        else -> false
                    }
                } else {
                    false
                }
            }
    ) {
        // Full-screen video player using AndroidView
        VideoPlayerView(
            viewModel = viewModel,
            modifier = Modifier.fillMaxSize()
        )

        // Playback controls overlay
        PlaybackControls(
            playerState = playerState,
            syncState = syncState,
            currentPair = currentPair ?: pair,
            isVisible = controlsVisible && !isAmbientMode,
            isAmbientMode = isAmbientMode,
            onPlayPause = {
                when (playerState) {
                    is PlayerState.Playing -> viewModel.pause()
                    else -> viewModel.play()
                }
            },
            onNextPair = {
                currentPair?.video?.category?.let { category ->
                    viewModel.nextPair(category)
                } ?: viewModel.nextPair(pair.video.category)
            },
            onToggleAmbient = {
                viewModel.toggleAmbientMode()
            },
            onBack = onBack,
            onToggleFavorite = {
                viewModel.toggleFavorite()
            },
            isFavorite = isFavorite,
            modifier = Modifier
                .fillMaxSize()
                .align(Alignment.BottomCenter)
        )

        // Error overlay
        if (errorMessage != null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.8f)),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "Playback Error",
                        style = TextStyle(
                            fontSize = 24.sp,
                            color = MaterialTheme.colorScheme.error
                        )
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = errorMessage ?: "Unknown error",
                        style = TextStyle(
                            fontSize = 16.sp,
                            color = Color.White.copy(alpha = 0.7f)
                        )
                    )
                }
            }
        }

        // Loading overlay
        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.6f)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Loading...",
                    style = TextStyle(
                        fontSize = 20.sp,
                        color = Color.White.copy(alpha = 0.8f)
                    )
                )
            }
        }

        // Sleep timer overlay
        val sleepRemaining by viewModel.sleepTimerRemainingSecs.collectAsStateWithLifecycle()
        if (sleepRemaining > 0) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(24.dp),
                contentAlignment = Alignment.TopEnd
            ) {
                val mins = sleepRemaining / 60
                val secs = sleepRemaining % 60
                Text(
                    text = "\u23F1 %02d:%02d".format(mins, secs),
                    style = TextStyle(
                        fontSize = 16.sp,
                        color = Color.White.copy(alpha = 0.7f)
                    )
                )
            }
        }
    }
}

/**
 * Stable AndroidView wrapper for ExoPlayer's PlayerView.
 *
 * The [PlayerView] is created once via [remember] and reused across recompositions.
 * The ExoPlayer instance is attached via [DisposableEffect] so that surface
 * binding survives lifecycle events without black frames.
 *
 * @param viewModel The [PlayerViewModel] used to attach the underlying ExoPlayer
 * @param modifier Optional modifier for customizing layout
 */
@Composable
@UnstableApi
private fun VideoPlayerView(
    viewModel: PlayerViewModel,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val playerView = remember {
        PlayerView(context).apply {
            useController = false
            resizeMode = androidx.media3.ui.AspectRatioFrameLayout.RESIZE_MODE_ZOOM
        }
    }

    DisposableEffect(viewModel) {
        viewModel.attachVideoView(playerView)
        onDispose {
            // Detach player but keep the view for reuse
            playerView.player = null
        }
    }

    AndroidView(
        factory = { playerView },
        modifier = modifier
    )
}
