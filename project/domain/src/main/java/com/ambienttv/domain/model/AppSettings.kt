package com.ambienttv.domain.model

/**
 * Immutable representation of all user-tunable application settings.
 *
 * @param onlineSourcesEnabled Whether remote APIs (Pexels, Pixabay, YouTube, etc.) may be queried.
 * @param aiGenerationEnabled Whether AI generation and advanced AI matching is active.
 * @param scanPaths Ordered list of local directories to scan for media.
 * @param audioVolume Last remembered audio volume (0.0f – 1.0f).
 * @param ambientModeEnabled Whether ambient (minimal-UI) mode is preferred by default.
 * @param sleepTimerMinutes 0 means disabled; otherwise auto-stop after N minutes.
 */
data class AppSettings(
    val onlineSourcesEnabled: Boolean = true,
    val aiGenerationEnabled: Boolean = false,
    val scanPaths: List<String> = emptyList(),
    val audioVolume: Float = 1.0f,
    val ambientModeEnabled: Boolean = false,
    val sleepTimerMinutes: Int = 0
)
