package com.ambienttv.ui.screen

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
import androidx.compose.foundation.BorderStroke
import androidx.tv.material3.Border
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Surface
import androidx.tv.material3.SurfaceDefaults
import androidx.tv.material3.Switch
import androidx.tv.material3.Text
import com.ambienttv.ui.component.FocusableButton
import com.ambienttv.ui.viewmodel.SettingsViewModel

/**
 * Settings Screen - configuration and preferences for AmbientTV.
 *
 * Provides controls for content sources, AI configuration, and app information.
 * All settings are D-pad navigable with clear focus visualization.
 *
 * Features:
 * - Content source settings (local scan paths, online sources toggle)
 * - AI settings (generation toggle)
 * - Scan now button to trigger local content discovery
 * - License information display
 * - Back navigation
 * - Scan progress indicator
 *
 * @param viewModel The [SettingsViewModel] managing settings state
 * @param onBack Callback for back navigation
 */
@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel = hiltViewModel(),
    onBack: () -> Unit
) {
    val settings by viewModel.settings.collectAsStateWithLifecycle()
    val isScanning by viewModel.isScanning.collectAsStateWithLifecycle()
    val scanProgress by viewModel.scanProgress.collectAsStateWithLifecycle()
    val scanCompleted by viewModel.scanCompleted.collectAsStateWithLifecycle()
    val lastScanResult by viewModel.lastScanResult.collectAsStateWithLifecycle()
    val errorMessage by viewModel.errorMessage.collectAsStateWithLifecycle()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .padding(horizontal = 48.dp, vertical = 32.dp)
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Header
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
                        text = "Settings",
                        style = TextStyle(
                            fontSize = 32.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    )
                }
            }

            // Content Sources Section
            item {
                SectionHeader(title = "Content Sources")
            }

            // Scan paths display
            item {
                SettingCard {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Scan Paths",
                            style = TextStyle(
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Medium,
                                color = Color.White
                            )
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        if (settings.scanPaths.isEmpty()) {
                            Text(
                                text = "No paths configured",
                                style = TextStyle(
                                    fontSize = 14.sp,
                                    color = Color.White.copy(alpha = 0.5f)
                                )
                            )
                        } else {
                            settings.scanPaths.forEach { path ->
                                Text(
                                    text = path,
                                    style = TextStyle(
                                        fontSize = 14.sp,
                                        color = Color.White.copy(alpha = 0.7f)
                                    )
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                            }
                        }
                    }
                }
            }

            // Online sources toggle
            item {
                ToggleSetting(
                    title = "Online Sources",
                    description = "Enable YouTube, Pixabay, Pexels, and Internet Archive",
                    checked = settings.onlineSourcesEnabled,
                    onCheckedChange = { viewModel.toggleOnline() }
                )
            }

            // AI Section
            item {
                Spacer(modifier = Modifier.height(8.dp))
                SectionHeader(title = "AI Configuration")
            }

            // AI toggle
            item {
                ToggleSetting(
                    title = "AI Content Generation",
                    description = "Enable AI-powered content matching and generation",
                    checked = settings.aiGenerationEnabled,
                    onCheckedChange = { viewModel.toggleAI() }
                )
            }

            // Sleep Timer
            item {
                Spacer(modifier = Modifier.height(8.dp))
                SectionHeader(title = "Sleep Timer")
            }

            item {
                SettingCard {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                    ) {
                        Text(
                            text = "Auto-stop playback after",
                            style = TextStyle(
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Medium,
                                color = Color.White
                            )
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        val options = listOf(0 to "Off", 15 to "15 min", 30 to "30 min", 45 to "45 min", 60 to "60 min")
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            options.forEach { (minutes, label) ->
                                val selected = settings.sleepTimerMinutes == minutes
                                FocusableButton(
                                    text = label,
                                    onClick = { viewModel.setSleepTimer(minutes) },
                                    modifier = Modifier.width(90.dp)
                                )
                            }
                        }
                    }
                }
            }

            // Scan now button
            item {
                Spacer(modifier = Modifier.height(8.dp))
                SectionHeader(title = "Actions")
            }

            item {
                SettingCard {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        FocusableButton(
                            text = if (isScanning) "Scanning..." else "\uD83D� Scan Now",
                            onClick = { viewModel.scanNow() },
                            enabled = !isScanning,
                            modifier = Modifier.width(200.dp)
                        )

                        // Scan progress
                        if (isScanning && scanProgress != null) {
                            Spacer(modifier = Modifier.height(12.dp))
                            val (scanned, total, currentPath) = scanProgress!!
                            Text(
                                text = "Scanning: $scanned items ($currentPath)",
                                style = TextStyle(
                                    fontSize = 14.sp,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            )
                        }

                        // Scan completed notification
                        if (scanCompleted) {
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "Scan complete! Found $lastScanResult items.",
                                style = TextStyle(
                                    fontSize = 14.sp,
                                    color = Color.Green.copy(alpha = 0.8f)
                                )
                            )
                        }

                        // Error display
                        if (errorMessage != null) {
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = errorMessage ?: "",
                                style = TextStyle(
                                    fontSize = 14.sp,
                                    color = MaterialTheme.colorScheme.error
                                )
                            )
                        }
                    }
                }
            }

            // License Info Section
            item {
                Spacer(modifier = Modifier.height(8.dp))
                SectionHeader(title = "License Information")
            }

            item {
                SettingCard {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Content Licenses",
                            style = TextStyle(
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Medium,
                                color = Color.White
                            )
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        val licenses = listOf(
                            "CC0 / Public Domain - No attribution required",
                            "Creative Commons - Attribution may be required",
                            "Free - Free to use with possible restrictions",
                            "Proprietary - Requires explicit license"
                        )

                        licenses.forEach { license ->
                            Row(
                                modifier = Modifier.padding(vertical = 2.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "\u2022",
                                    style = TextStyle(
                                        fontSize = 14.sp,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = license,
                                    style = TextStyle(
                                        fontSize = 13.sp,
                                        color = Color.White.copy(alpha = 0.6f)
                                    )
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        Text(
                            text = "AmbientTV respects all content licenses and skips " +
                                    "content that violates license terms.",
                            style = TextStyle(
                                fontSize = 12.sp,
                                color = Color.White.copy(alpha = 0.4f),
                                lineHeight = 16.sp
                            )
                        )
                    }
                }
            }

            // App Info
            item {
                Spacer(modifier = Modifier.height(16.dp))
                Box(
                    modifier = Modifier.fillMaxWidth(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "AmbientTV v1.0",
                        style = TextStyle(
                            fontSize = 12.sp,
                            color = Color.White.copy(alpha = 0.3f)
                        )
                    )
                }
            }
        }
    }
}

/**
 * Section header with accent underline.
 */
@Composable
private fun SectionHeader(title: String) {
    Column {
        Text(
            text = title,
            style = TextStyle(
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
        )

        Spacer(modifier = Modifier.height(4.dp))

        Box(
            modifier = Modifier
                .width(40.dp)
                .height(2.dp)
                .background(MaterialTheme.colorScheme.primary)
        )

        Spacer(modifier = Modifier.height(8.dp))
    }
}

/**
 * Card container for individual settings.
 */
@Composable
private fun SettingCard(content: @Composable () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        colors = SurfaceDefaults.colors(
            containerColor = Color.White.copy(alpha = 0.05f)
        ),
        border = Border(
            border = BorderStroke(
                width = 1.dp,
                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)
            ),
            shape = RoundedCornerShape(8.dp)
        )
    ) {
        content()
    }
}

/**
 * A toggle setting row with title, description, and switch.
 */
@Composable
private fun ToggleSetting(
    title: String,
    description: String,
    checked: Boolean,
    onCheckedChange: () -> Unit
) {
    SettingCard {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = TextStyle(
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color.White
                    )
                )

                Spacer(modifier = Modifier.height(2.dp))

                Text(
                    text = description,
                    style = TextStyle(
                        fontSize = 13.sp,
                        color = Color.White.copy(alpha = 0.5f)
                    )
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Switch(
                checked = checked,
                onCheckedChange = { onCheckedChange() }
            )
        }
    }
}
