package com.ambienttv.ui.screen

import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.tv.material3.Text
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.media3.common.util.UnstableApi
import com.ambienttv.player.SyncedPlaybackManager
import com.ambienttv.ui.viewmodel.AmbientViewModel

/**
 * Ambient Mode Screen - minimal UI full-screen video playback.
 *
 * Provides an immersive ambient experience with nearly full-screen video
 * and only minimal UI indicators. Auto-hides all UI after 5 seconds of
 * inactivity and shows it again on any D-pad input.
 *
 * Features:
 * - Full black background for OLED-friendly display
 * - Full-screen video using AndroidView
 * - Small floating info bar with category name and playback indicator
 * - Auto-hides UI after 5 seconds of inactivity
 * - Shows UI on any D-pad input
 * - Subtle sync status indicator
 * - Exits to normal player on Back button
 *
 * @param viewModel The [AmbientViewModel] managing ambient mode state
 * @param onExit Callback when the user wants to exit ambient mode (Back button)
 */
@Composable
fun AmbientModeScreen(
    viewModel: AmbientViewModel = hiltViewModel(),
    onExit: () -> Unit = {}
) {
    val context = LocalContext.current
    val showUI by viewModel.showUI.collectAsStateWithLifecycle()
    val syncState by viewModel.syncState.collectAsStateWithLifecycle()
    val currentPairTitle by viewModel.currentPairTitle.collectAsStateWithLifecycle()
    val currentCategoryName by viewModel.currentCategoryName.collectAsStateWithLifecycle()

    // Focus requester for D-pad handling
    val focusRequester = remember { FocusRequester() }

    // Request focus on first composition for D-pad input capture
    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .focusRequester(focusRequester)
            .onKeyEvent { event ->
                if (event.type == KeyEventType.KeyUp) {
                    when (event.key) {
                        Key.Back, Key.Escape -> {
                            onExit()
                            true
                        }
                        Key.DirectionCenter, Key.Enter,
                        Key.DirectionUp, Key.DirectionDown,
                        Key.DirectionLeft, Key.DirectionRight,
                        Key.Spacebar -> {
                            viewModel.onUserInteraction()
                            true
                        }
                        else -> {
                            // Any other key also counts as interaction
                            viewModel.onUserInteraction()
                            false
                        }
                    }
                } else {
                    false
                }
            }
    ) {
        // Full-screen video
        AmbientVideoView(
            modifier = Modifier.fillMaxSize()
        )

        // Floating info bar (auto-showing/hiding)
        AnimatedVisibility(
            visible = showUI,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomStart)
        ) {
            AmbientInfoBar(
                categoryName = currentCategoryName,
                pairTitle = currentPairTitle,
                isPlaying = syncState.isPlaying,
                isSynced = syncState.isSynced,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 48.dp, vertical = 32.dp)
            )
        }
    }
}

/**
 * Minimal info bar displayed at the bottom of the ambient screen.
 *
 * Shows the current category name, content title, and a subtle
 * playback indicator. Designed to be as unobtrusive as possible
 * while still providing useful context.
 *
 * @param categoryName The name of the current content category
 * @param pairTitle The title of the current content pair
 * @param isPlaying Whether playback is currently active
 * @param isSynced Whether video and audio are synchronized
 * @param modifier Optional modifier for customizing layout
 */
@Composable
private fun AmbientInfoBar(
    categoryName: String,
    pairTitle: String,
    isPlaying: Boolean,
    isSynced: Boolean,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
    ) {
        // Subtle gradient background for readability
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(80.dp)
                .background(
                    androidx.compose.ui.graphics.Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            Color.Black.copy(alpha = 0.6f)
                        )
                    )
                )
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(80.dp)
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.Start,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Playback indicator dot
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(
                        if (isPlaying) Color.Green.copy(alpha = 0.8f)
                        else Color.Yellow.copy(alpha = 0.6f)
                    )
            )

            Spacer(modifier = Modifier.width(12.dp))

            Column {
                // Category name
                if (categoryName.isNotBlank()) {
                    Text(
                        text = categoryName,
                        style = TextStyle(
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color.Cyan.copy(alpha = 0.9f)
                        ),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                // Content title
                if (pairTitle.isNotBlank()) {
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = pairTitle,
                        style = TextStyle(
                            fontSize = 14.sp,
                            color = Color.White.copy(alpha = 0.7f)
                        ),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            // Subtle sync indicator
            if (!isSynced) {
                Text(
                    text = "syncing",
                    style = TextStyle(
                        fontSize = 11.sp,
                        color = Color.Yellow.copy(alpha = 0.5f)
                    )
                )
            }
        }
    }
}

/**
 * AndroidView wrapper for video in ambient mode.
 *
 * Creates a full-screen video view for the ambient playback experience.
 * The actual video rendering is managed by [SyncedPlaybackManager].
 *
 * @param modifier Optional modifier for customizing layout
 */
@Composable
@UnstableApi
private fun AmbientVideoView(
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current

    AndroidView(
        factory = {
            FrameLayout(context).apply {
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
                setBackgroundColor(android.graphics.Color.BLACK)
            }
        },
        modifier = modifier
    )
}
