package com.ambienttv.ui.component

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.ProgressIndicatorDefaults
import androidx.tv.material3.Icon
import androidx.tv.material3.IconButton
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Text
import com.ambienttv.domain.model.ContentPair
import com.ambienttv.player.PlayerState
import com.ambienttv.player.SyncState

/**
 * Overlay playback controls for the content pair player screen.
 *
 * Displays a semi-transparent control bar with play/pause, next pair, volume,
 * and progress information. Designed to overlay on top of video content
 * with proper contrast for visibility.
 *
 * Features:
 * - Play/Pause toggle button
 * - Progress bar showing current position and duration
 * - Current pair info (category name, video title)
 * - Ambient mode toggle
 * - Back navigation button
 * - D-pad navigable controls with focus rings
 * - Animated visibility (fade in/out)
 *
 * @param playerState Current state of the video player
 * @param syncState Current synchronization state between video and audio
 * @param currentPair The currently playing content pair (null if none loaded)
 * @param isVisible Whether the controls overlay should be visible
 * @param isAmbientMode Whether ambient mode is currently active
 * @param onPlayPause Callback to toggle play/pause
 * @param onNextPair Callback to skip to the next content pair
 * @param onToggleAmbient Callback to toggle ambient mode
 * @param onBack Callback for back navigation
 * @param onToggleFavorite Callback to add/remove current pair from favorites
 * @param isFavorite Whether the current pair is already favorited
 * @param modifier Optional modifier for customizing layout
 */
@Composable
fun PlaybackControls(
    playerState: PlayerState,
    syncState: SyncState,
    currentPair: ContentPair?,
    isVisible: Boolean,
    isAmbientMode: Boolean,
    onPlayPause: () -> Unit,
    onNextPair: () -> Unit,
    onToggleAmbient: () -> Unit,
    onBack: () -> Unit,
    onToggleFavorite: () -> Unit = {},
    isFavorite: Boolean = false,
    modifier: Modifier = Modifier
) {
    AnimatedVisibility(
        visible = isVisible,
        enter = fadeIn(),
        exit = fadeOut()
    ) {
        Box(
            modifier = modifier
                .fillMaxWidth()
                .padding(horizontal = 48.dp, vertical = 32.dp)
        ) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Top row: Back button and pair info
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Start,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = onBack,
                        modifier = Modifier.size(48.dp)
                    ) {
                        Text(
                            text = "\u2190",
                            style = TextStyle(
                                fontSize = 24.sp,
                                color = Color.White
                            )
                        )
                    }

                    Spacer(modifier = Modifier.width(16.dp))

                    Column {
                        Text(
                            text = currentPair?.video?.category?.name ?: "",
                            style = TextStyle(
                                fontSize = 14.sp,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.Medium
                            ),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )

                        Spacer(modifier = Modifier.height(2.dp))

                        Text(
                            text = currentPair?.video?.title ?: "No content loaded",
                            style = TextStyle(
                                fontSize = 18.sp,
                                color = Color.White,
                                fontWeight = FontWeight.Bold
                            ),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Spacer(modifier = Modifier.weight(1f))

                // Progress bar (only show when playing or paused)
                if (playerState is PlayerState.Playing) {
                    val progress = if (playerState.duration > 0) {
                        playerState.position.toFloat() / playerState.duration.toFloat()
                    } else {
                        0f
                    }

                    Column(modifier = Modifier.fillMaxWidth()) {
                        LinearProgressIndicator(
                            progress = { progress.coerceIn(0f, 1f) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(4.dp)
                                .clip(RoundedCornerShape(2.dp)),
                            color = MaterialTheme.colorScheme.primary,
                            trackColor = Color.White.copy(alpha = 0.2f),
                            gapSize = 0.dp,
                            drawStopIndicator = {}
                        )

                        Spacer(modifier = Modifier.height(4.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = formatDuration(playerState.position),
                                style = TextStyle(
                                    fontSize = 12.sp,
                                    color = Color.White.copy(alpha = 0.7f)
                                )
                            )
                            Text(
                                text = formatDuration(playerState.duration),
                                style = TextStyle(
                                    fontSize = 12.sp,
                                    color = Color.White.copy(alpha = 0.7f)
                                )
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Control buttons row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Play/Pause button
                    IconButton(
                        onClick = onPlayPause,
                        modifier = Modifier.size(56.dp)
                    ) {
                        val icon = when (playerState) {
                            is PlayerState.Playing -> "\u23F8" // Pause
                            is PlayerState.Paused, is PlayerState.Idle,
                            is PlayerState.Stopped, is PlayerState.Error -> "\u25B6" // Play
                            is PlayerState.Loading -> "..."
                            is PlayerState.Ended -> "\u25B6"
                        }
                        Text(
                            text = icon,
                            style = TextStyle(
                                fontSize = 28.sp,
                                color = Color.White
                            )
                        )
                    }

                    Spacer(modifier = Modifier.width(24.dp))

                    // Next pair button
                    IconButton(
                        onClick = onNextPair,
                        modifier = Modifier.size(48.dp)
                    ) {
                        Text(
                            text = "\u23ED",
                            style = TextStyle(
                                fontSize = 24.sp,
                                color = Color.White
                            )
                        )
                    }

                    Spacer(modifier = Modifier.width(24.dp))

                    // Ambient mode toggle
                    IconButton(
                        onClick = onToggleAmbient,
                        modifier = Modifier.size(48.dp)
                    ) {
                        Text(
                            text = if (isAmbientMode) "\u2600" else "\u263E",
                            style = TextStyle(
                                fontSize = 24.sp,
                                color = if (isAmbientMode)
                                    MaterialTheme.colorScheme.primary
                                else
                                    Color.White.copy(alpha = 0.7f)
                            )
                        )
                    }

                    Spacer(modifier = Modifier.width(24.dp))

                    // Favorite toggle
                    IconButton(
                        onClick = onToggleFavorite,
                        modifier = Modifier.size(48.dp)
                    ) {
                        Text(
                            text = if (isFavorite) "\u2665" else "\u2661",
                            style = TextStyle(
                                fontSize = 24.sp,
                                color = if (isFavorite)
                                    Color.Red.copy(alpha = 0.9f)
                                else
                                    Color.White.copy(alpha = 0.7f)
                            )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Sync status indicator
                if (syncState.isLoaded) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        val syncColor = if (syncState.isSynced)
                            Color.Green.copy(alpha = 0.8f)
                        else
                            Color.Yellow.copy(alpha = 0.8f)

                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(syncColor)
                        )

                        Spacer(modifier = Modifier.width(6.dp))

                        Text(
                            text = if (syncState.isSynced) "Synced" else "Syncing...",
                            style = TextStyle(
                                fontSize = 12.sp,
                                color = syncColor
                            )
                        )

                        if (!syncState.isSynced) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "${syncState.driftMs}ms drift",
                                style = TextStyle(
                                    fontSize = 11.sp,
                                    color = Color.White.copy(alpha = 0.5f)
                                )
                            )
                        }
                    }
                }
            }
        }
    }
}

/**
 * Formats a duration in milliseconds to a human-readable string (MM:SS).
 *
 * @param millis Duration in milliseconds
 * @return Formatted string like "03:45"
 */
private fun formatDuration(millis: Long): String {
    val totalSeconds = millis / 1000
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return "%02d:%02d".format(minutes, seconds)
}
