package com.ambienttv.domain.model

import kotlinx.serialization.Serializable

/**
 * Sealed class representing the result of a local content scan operation.
 */
@Serializable
public sealed class ScanResult {

    @Serializable
    public data class Progress(val scanned: Int, val total: Int, val currentPath: String) : ScanResult()

    @Serializable
    public data class Completed(val items: List<ContentItem>) : ScanResult()

    @Serializable
    public data class Error(val path: String, val message: String) : ScanResult()
}
