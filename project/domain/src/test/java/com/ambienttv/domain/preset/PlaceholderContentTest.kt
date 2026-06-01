package com.ambienttv.domain.preset

import com.ambienttv.domain.model.ContentCategory
import com.ambienttv.domain.model.ContentTag
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PlaceholderContentTest {

    @Test
    fun `createPlaceholderPair returns pair with correct category`() {
        val category = DefaultCategories.NATURE
        val pair = PlaceholderContent.createPlaceholderPair(category)

        assertEquals("placeholder_${category.id}", pair.id)
        assertEquals(category, pair.video.category)
        assertEquals(category, pair.audio.category)
    }

    @Test
    fun `placeholder pair has zero match score`() {
        val pair = PlaceholderContent.createPlaceholderPair(DefaultCategories.CHRISTMAS)
        assertEquals(0f, pair.matchScore, 0.001f)
    }

    @Test
    fun `placeholder video has correct properties`() {
        val pair = PlaceholderContent.createPlaceholderPair(DefaultCategories.FANTASY)

        assertEquals("placeholder_video", pair.video.id)
        assertEquals("Offline Placeholder", pair.video.title)
        assertTrue(pair.video.tags.isEmpty())
        assertEquals(2000L, pair.video.metadata.durationMs)
    }

    @Test
    fun `placeholder audio has correct properties`() {
        val pair = PlaceholderContent.createPlaceholderPair(DefaultCategories.CYBERPUNK)

        assertEquals("placeholder_audio", pair.audio.id)
        assertEquals("Offline Placeholder", pair.audio.title)
        assertTrue(pair.audio.tags.isEmpty())
        assertEquals(2000L, pair.audio.metadata.durationMs)
    }

    @Test
    fun `placeholder pair is not user override`() {
        val pair = PlaceholderContent.createPlaceholderPair(DefaultCategories.STEAMPUNK)
        assertEquals(false, pair.isUserOverride)
    }
}
