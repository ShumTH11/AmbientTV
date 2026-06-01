package com.ambienttv.domain.preset

import com.ambienttv.domain.model.ContentTag
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DefaultCategoriesTest {

    @Test
    fun `all categories list contains exactly 5 presets`() {
        assertEquals(5, DefaultCategories.ALL.size)
    }

    @Test
    fun `christmas category has correct id and name`() {
        val cat = DefaultCategories.CHRISTMAS
        assertEquals("christmas", cat.id)
        assertEquals("Christmas & New Year", cat.name)
        assertTrue(cat.description.contains("Festive"))
    }

    @Test
    fun `christmas category has festive mood tag`() {
        val moodTag = DefaultCategories.CHRISTMAS.defaultTags.find { it.key == "mood" }
        assertNotNull(moodTag)
        assertEquals("festive", moodTag?.value)
    }

    @Test
    fun `fantasy category has correct id and epic mood`() {
        val cat = DefaultCategories.FANTASY
        assertEquals("fantasy", cat.id)
        assertEquals("Fantasy & Medieval", cat.name)
        val moodTag = cat.defaultTags.find { it.key == "mood" }
        assertEquals("epic", moodTag?.value)
    }

    @Test
    fun `cyberpunk category has dark mood and future era`() {
        val cat = DefaultCategories.CYBERPUNK
        assertEquals("cyberpunk", cat.id)
        val moodTag = cat.defaultTags.find { it.key == "mood" }
        val eraTag = cat.defaultTags.find { it.key == "era" }
        assertEquals("dark", moodTag?.value)
        assertEquals("future", eraTag?.value)
    }

    @Test
    fun `nature category has calm mood`() {
        val cat = DefaultCategories.NATURE
        assertEquals("nature", cat.id)
        val moodTag = cat.defaultTags.find { it.key == "mood" }
        assertEquals("calm", moodTag?.value)
    }

    @Test
    fun `steampunk category has industrial mood and victorian era`() {
        val cat = DefaultCategories.STEAMPUNK
        assertEquals("steampunk", cat.id)
        val moodTag = cat.defaultTags.find { it.key == "mood" }
        val eraTag = cat.defaultTags.find { it.key == "era" }
        assertEquals("industrial", moodTag?.value)
        assertEquals("victorian", eraTag?.value)
    }

    @Test
    fun `all categories have non-empty tags`() {
        DefaultCategories.ALL.forEach { category ->
            assertTrue(
                "Category ${category.id} should have tags",
                category.defaultTags.isNotEmpty()
            )
        }
    }

    @Test
    fun `all categories have unique ids`() {
        val ids = DefaultCategories.ALL.map { it.id }
        assertEquals(ids.size, ids.distinct().size)
    }

    @Test
    fun `all categories have color palette tag`() {
        DefaultCategories.ALL.forEach { category ->
            val paletteTag = category.defaultTags.find { it.key == "colorPalette" }
            assertNotNull("Category ${category.id} should have colorPalette tag", paletteTag)
            assertTrue(
                "Category ${category.id} should have non-empty color palette",
                paletteTag?.value?.isNotBlank() == true
            )
        }
    }
}
