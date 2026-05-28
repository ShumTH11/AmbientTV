package com.ambienttv.domain.model

/**
 * Result of local audio file analysis.
 */
data class AudioAnalysisResult(
    val bpm: Float?,
    val musicalKey: String?
)
