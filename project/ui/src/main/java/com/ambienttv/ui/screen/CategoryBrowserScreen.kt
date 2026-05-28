package com.ambienttv.ui.screen

import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.tv.material3.Border
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Surface
import androidx.tv.material3.SurfaceDefaults
import androidx.tv.material3.Text
import com.ambienttv.domain.model.ContentCategory
import com.ambienttv.ui.component.CategoryCard
import com.ambienttv.ui.component.FocusableButton
import com.ambienttv.ui.viewmodel.CategoryBrowserViewModel

/**
 * Category Browser Screen - the main entry point of AmbientTV.
 *
 * Displays a grid of category cards (Christmas, Fantasy, Cyberpunk, Nature, Steampunk)
 * that the user can browse and select using a D-pad/remote. Each card shows the
 * category name, description, and optional preview thumbnail.
 *
 * Features:
 * - 3-column grid layout optimized for TV screens
 * - D-pad navigable with clear focus handling and visual feedback
 * - Gradient background for visual appeal
 * - Settings button in the header
 * - Loading state while categories are being fetched
 *
 * @param viewModel The [CategoryBrowserViewModel] providing categories and loading state
 * @param onCategorySelected Callback when a category card is selected
 * @param onNavigateToSettings Callback when the settings button is pressed
 */
@Composable
fun CategoryBrowserScreen(
    viewModel: CategoryBrowserViewModel = hiltViewModel(),
    onCategorySelected: (ContentCategory) -> Unit,
    onNavigateToSettings: () -> Unit,
    onNavigateToFavorites: () -> Unit = {},
    onNavigateToHistory: () -> Unit = {}
) {
    val categories by viewModel.categories.collectAsStateWithLifecycle()
    val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()
    val smartSuggestion by viewModel.smartSuggestion.collectAsStateWithLifecycle()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        MaterialTheme.colorScheme.background,
                        MaterialTheme.colorScheme.background.copy(red = 0.05f, green = 0.05f, blue = 0.1f)
                    )
                )
            )
            .padding(horizontal = 48.dp, vertical = 32.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header row
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 24.dp)
            ) {
                Column {
                    Text(
                        text = "AmbientTV",
                        style = TextStyle(
                            fontSize = 36.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.primary,
                            letterSpacing = 2.sp,
                            textAlign = TextAlign.Start
                        )
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = "Choose a mood for your ambient experience",
                        style = TextStyle(
                            fontSize = 16.sp,
                            color = Color.White.copy(alpha = 0.6f),
                            textAlign = TextAlign.Start
                        )
                    )
                }

                // Favorites + History + Settings buttons aligned to end
                Row(
                    modifier = Modifier.align(Alignment.CenterEnd),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    FocusableButton(
                        text = "\u2665 Favorites",
                        onClick = onNavigateToFavorites
                    )
                    FocusableButton(
                        text = "\u23F1 History",
                        onClick = onNavigateToHistory
                    )
                    FocusableButton(
                        text = "\u2699 Settings",
                        onClick = onNavigateToSettings
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Smart suggestion card (hidden while loading)
            if (!isLoading) {
                smartSuggestion?.let { category ->
                    val suggestionLabel = when (category.id) {
                        "christmas" -> "\u2744 Festive season pick"
                        "nature" -> "\u2600 Morning calm"
                        "cyberpunk" -> "\u263D Evening vibes"
                        "fantasy" -> "\u2694 Afternoon epic"
                        "steampunk" -> "\u2699 Industrial afternoon"
                        else -> "\u2728 Recommended for you"
                    }
                    SmartSuggestionCard(
                        category = category,
                        label = suggestionLabel,
                        onClick = { onCategorySelected(category) }
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                }
            }

            // Category grid
            if (isLoading) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "Loading categories...",
                            style = TextStyle(
                                fontSize = 20.sp,
                                color = Color.White.copy(alpha = 0.7f)
                            )
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        // Simple animated dots loading indicator
                        LoadingDots()
                    }
                }
            } else if (categories.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "No categories found",
                            style = TextStyle(
                                fontSize = 20.sp,
                                color = Color.White.copy(alpha = 0.7f)
                            )
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        FocusableButton(
                            text = "Retry",
                            onClick = { viewModel.refresh() }
                        )
                    }
                }
            } else {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(3),
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(8.dp),
                    horizontalArrangement = Arrangement.spacedBy(24.dp),
                    verticalArrangement = Arrangement.spacedBy(24.dp)
                ) {
                    items(
                        items = categories,
                        key = { it.id }
                    ) { category ->
                        CategoryCard(
                            category = category,
                            onClick = { onCategorySelected(category) }
                        )
                    }
                }
            }
        }
    }
}

/**
 * Simple animated loading dots indicator for TV screens.
 */
@Composable
private fun LoadingDots() {
    // Static dots for simplicity on TV (animation can be distracting)
    Text(
        text = ". . .",
        style = TextStyle(
            fontSize = 24.sp,
            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.7f),
            letterSpacing = 8.sp
        )
    )
}

/**
 * Prominent card for the time-aware smart category suggestion.
 */
@Composable
private fun SmartSuggestionCard(
    category: ContentCategory,
    label: String,
    onClick: () -> Unit
) {
    androidx.tv.material3.Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = androidx.tv.material3.SurfaceDefaults.colors(
            containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)
        ),
        border = androidx.tv.material3.Border(
            border = BorderStroke(
                width = 2.dp,
                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.6f)
            ),
            shape = RoundedCornerShape(12.dp)
        ),
        onClick = { onClick() }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = label,
                    style = TextStyle(
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.9f),
                        fontWeight = FontWeight.Medium
                    )
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = category.name,
                    style = TextStyle(
                        fontSize = 22.sp,
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                )
            }
            Text(
                text = "\u25B6 Play now",
                style = TextStyle(
                    fontSize = 16.sp,
                    color = MaterialTheme.colorScheme.primary
                )
            )
        }
    }
}
