package com.ambienttv.data.remote.dto

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

/**
 * Top-level response from Internet Archive advanced search API.
 */
@Serializable
data class InternetArchiveResponse(
    val responseHeader: InternetArchiveResponseHeader? = null,
    val response: InternetArchiveSearchResponseBody? = null
)

/**
 * Response header containing timing and status info.
 */
@Serializable
data class InternetArchiveResponseHeader(
    val status: Int = 0,
    val QTime: Int = 0,
    val params: JsonElement? = null
)

/**
 * Response body containing search results.
 */
@Serializable
data class InternetArchiveSearchResponseBody(
    val numFound: Int = 0,
    val start: Int = 0,
    val docs: List<InternetArchiveDoc> = emptyList()
)

/**
 * Individual document/result from Internet Archive search.
 */
@Serializable
data class InternetArchiveDoc(
    val identifier: String = "",
    val title: String? = null,
    val description: String? = null,
    val mediatype: String? = null,
    val licenseurl: String? = null
)
