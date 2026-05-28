package com.ambienttv.data.datasource

/**
 * Parsed content metadata from sidecar JSON files.
 */
public data class ContentMetadata(
    val title: String? = null,
    val category: String? = null,
    val mood: String? = null,
    val bpm: Float? = null,
    val era: String? = null,
    val tags: List<String> = emptyList(),
    val fileSize: Long = 0
)
