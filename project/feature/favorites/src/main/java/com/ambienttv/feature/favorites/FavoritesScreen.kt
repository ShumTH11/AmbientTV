package com.ambienttv.feature.favorites

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.tv.material3.Border
import androidx.tv.material3.BorderStroke
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Surface
import androidx.tv.material3.SurfaceDefaults
import androidx.tv.material3.Text
import com.ambienttv.domain.model.ContentPair
import com.ambienttv.ui.component.FocusableButton

/**
 * Favorites screen — displays all user-saved content pairs.
 *
 * Features:
 * - D-pad navigable list
 * - Play a favorite directly
 * - Remove from favorites
 * - Empty state when no favorites exist
 */
@Composable
fun FavoritesScreen(
    viewModel: FavoritesViewModel = hiltViewModel(),
    onBack: () -> Unit,
    onPlayPair: (ContentPair) -> Unit
) {
    val favorites by viewModel.favorites.collectAsStateWithLifecycle()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .padding(horizontal = 48.dp, vertical = 32.dp)
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    FocusableButton(
                        text = "\u2190 Back",
                        onClick = onBack,
                        modifier = Modifier.width(140.dp)
                    )

                    Spacer(modifier = Modifier.width(24.dp))

                    Text(
                        text = "Favorites",
                        style = TextStyle(
                            fontSize = 32.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    )
                }
            }

            if (favorites.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "No favorites yet.\nSave pairs you love from the player screen.",
                            style = TextStyle(
                                fontSize = 18.sp,
                                color = Color.White.copy(alpha = 0.5f)
                            )
                        )
                    }
                }
            } else {
                items(
                    items = favorites,
                    key = { it.id }
                ) { pair ->
                    FavoriteCard(
                        pair = pair,
                        onPlay = { onPlayPair(pair) },
                        onRemove = { viewModel.removeFavorite(pair.id) }
                    )
                }
            }
        }
    }
}

@Composable
private fun FavoriteCard(
    pair: ContentPair,
    onPlay: () -> Unit,
    onRemove: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        colors = SurfaceDefaults.colors(
            containerColor = Color.White.copy(alpha = 0.05f)
        ),
        border = Border(
            border = BorderStroke(
                width = 1.dp,
                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.3f)
            ),
            shape = RoundedCornerShape(8.dp)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = pair.video.title,
                    style = TextStyle(
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color.White
                    )
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = pair.audio.title,
                    style = TextStyle(
                        fontSize = 14.sp,
                        color = Color.White.copy(alpha = 0.6f)
                    )
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = pair.video.category.name,
                    style = TextStyle(
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.8f)
                    )
                )
            }

            Row {
                FocusableButton(
                    text = "\u25B6 Play",
                    onClick = onPlay,
                    modifier = Modifier.width(120.dp)
                )
                Spacer(modifier = Modifier.width(12.dp))
                FocusableButton(
                    text = "\u2715 Remove",
                    onClick = onRemove,
                    modifier = Modifier.width(140.dp)
                )
            }
        }
    }
}
