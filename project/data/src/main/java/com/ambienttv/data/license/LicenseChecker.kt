package com.ambienttv.data.license

import com.ambienttv.domain.model.ContentItem
import com.ambienttv.domain.model.ContentSource
import com.ambienttv.domain.model.LicenseType
import com.ambienttv.domain.model.LicenseValidation
import javax.inject.Inject

/**
 * Validates content licenses and determines playback rights.
 * Handles different license types including CC0, Creative Commons, and proprietary content.
 */
class LicenseChecker @Inject constructor() {

    /**
     * Validates the license of a content item and returns detailed validation info.
     *
     * @param content The content item to validate
     * @return LicenseValidation with validity, attribution requirements, and restrictions
     */
    fun validateLicense(content: ContentItem): LicenseValidation {
        return when (content.licenseType) {
            LicenseType.FREE -> LicenseValidation(
                isValid = true,
                requiresAttribution = false,
                restrictions = emptyList()
            )

            LicenseType.CC0 -> LicenseValidation(
                isValid = true,
                requiresAttribution = false,
                attributionText = "${content.title} - CC0 (Public Domain)",
                restrictions = emptyList()
            )

            LicenseType.CREATIVE_COMMONS -> LicenseValidation(
                isValid = true,
                requiresAttribution = true,
                attributionText = buildAttributionText(content),
                restrictions = listOf("Attribution required", "ShareAlike may apply")
            )

            LicenseType.PROPRIETARY -> LicenseValidation(
                isValid = content.source == ContentSource.LOCAL || content.source == ContentSource.AI_GENERATED,
                requiresAttribution = false,
                restrictions = if (content.source == ContentSource.LOCAL || content.source == ContentSource.AI_GENERATED) {
                    emptyList()
                } else {
                    listOf("Proprietary content - verify playback rights")
                }
            )
        }
    }

    /**
     * Checks whether a content item can be played based on its license.
     *
     * @param content The content item to check
     * @return true if the content can be played
     */
    fun canPlay(content: ContentItem): Boolean {
        return when (content.licenseType) {
            LicenseType.FREE -> true
            LicenseType.CC0 -> true
            LicenseType.CREATIVE_COMMONS -> true
            LicenseType.PROPRIETARY -> {
                content.source == ContentSource.LOCAL || content.source == ContentSource.AI_GENERATED
            }
        }
    }

    /**
     * Checks whether attribution must be displayed for the content.
     *
     * @param content The content item to check
     * @return true if attribution is required
     */
    fun requiresAttribution(content: ContentItem): Boolean {
        return content.licenseType == LicenseType.CREATIVE_COMMONS
    }

    /**
     * Builds an attribution text string for Creative Commons content.
     */
    private fun buildAttributionText(content: ContentItem): String {
        val source = when (content.source) {
            ContentSource.PIXABAY -> "Pixabay"
            ContentSource.PEXELS -> "Pexels"
            ContentSource.YOUTUBE -> "YouTube"
            ContentSource.INTERNET_ARCHIVE -> "Internet Archive"
            ContentSource.LOCAL -> "Local"
            ContentSource.AI_GENERATED -> "AI Generated"
        }
        return "\"${content.title}\" from $source - Creative Commons License"
    }
}
