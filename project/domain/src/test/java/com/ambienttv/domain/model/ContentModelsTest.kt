package com.ambienttv.domain.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ContentModelsTest {

    // --- ContentTag ---

    @Test
    fun `ContentTag defaults to confidence 1_0`() {
        val tag = ContentTag("mood", "calm")
        assertEquals(1.0f, tag.confidence, 0.001f)
    }

    @Test
    fun `ContentTag can have custom confidence`() {
        val tag = ContentTag("mood", "calm", 0.75f)
        assertEquals(0.75f, tag.confidence, 0.001f)
    }

    // --- ContentCategory ---

    @Test
    fun `ContentCategory has null thumbnail by default`() {
        val category = ContentCategory(
            id = "test",
            name = "Test",
            description = "Test desc",
            defaultTags = emptyList()
        )
        assertNull(category.thumbnailUrl)
    }

    @Test
    fun `ContentCategory can have thumbnail`() {
        val category = ContentCategory(
            id = "test",
            name = "Test",
            description = "Test desc",
            defaultTags = emptyList(),
            thumbnailUrl = "https://example.com/thumb.jpg"
        )
        assertEquals("https://example.com/thumb.jpg", category.thumbnailUrl)
    }

    // --- ContentItem ---

    @Test
    fun `ContentItem defaults createdAt to current time`() {
        val before = System.currentTimeMillis()
        val item = createTestContentItem()
        val after = System.currentTimeMillis()

        assertTrue(item.createdAt in before..after)
    }

    @Test
    fun `ContentItem localPath is null by default`() {
        val item = createTestContentItem()
        assertNull(item.localPath)
    }

    // --- ContentPair ---

    @Test
    fun `ContentPair generates random id by default`() {
        val pair1 = createTestContentPair()
        val pair2 = createTestContentPair()
        assertNotEquals(pair1.id, pair2.id)
    }

    @Test
    fun `ContentPair isUserOverride defaults to false`() {
        val pair = createTestContentPair()
        assertEquals(false, pair.isUserOverride)
    }

    // --- MediaMetadata ---

    @Test
    fun `MediaMetadata has sensible defaults`() {
        val meta = MediaMetadata()
        assertEquals(0L, meta.durationMs)
        assertNull(meta.bpm)
        assertNull(meta.musicalKey)
        assertNull(meta.mood)
        assertNull(meta.era)
        assertTrue(meta.colorPalette.isEmpty())
        assertNull(meta.resolution)
        assertEquals(0L, meta.fileSize)
    }

    @Test
    fun `MediaMetadata can hold all values`() {
        val meta = MediaMetadata(
            durationMs = 120000,
            bpm = 128.5f,
            musicalKey = "C# minor",
            mood = "dark",
            era = "future",
            colorPalette = listOf("neon-blue", "purple"),
            resolution = "1920x1080",
            fileSize = 50_000_000
        )
        assertEquals(120000L, meta.durationMs)
        assertEquals(128.5f, meta.bpm!!, 0.001f)
        assertEquals("C# minor", meta.musicalKey)
        assertEquals("dark", meta.mood)
        assertEquals("future", meta.era)
        assertEquals(listOf("neon-blue", "purple"), meta.colorPalette)
        assertEquals("1920x1080", meta.resolution)
        assertEquals(50_000_000L, meta.fileSize)
    }

    // --- PlaybackSession ---

    @Test
    fun `PlaybackSession generates unique session id`() {
        val pair = createTestContentPair()
        val session1 = PlaybackSession(pair = pair)
        val session2 = PlaybackSession(pair = pair)
        assertNotEquals(session1.sessionId, session2.sessionId)
    }

    @Test
    fun `PlaybackSession has start timestamp`() {
        val before = System.currentTimeMillis()
        val session = PlaybackSession(pair = createTestContentPair())
        val after = System.currentTimeMillis()
        assertTrue(session.startedAt in before..after)
    }

    // --- MatchResult ---

    @Test
    fun `MatchResult holds exact match priority`() {
        val result = MatchResult(
            score = 0.95f,
            priority = MatchPriority.EXACT_MATCH,
            matchedTags = listOf(ContentTag("mood", "calm")),
            mismatchedTags = emptyList()
        )
        assertEquals(MatchPriority.EXACT_MATCH, result.priority)
        assertEquals(0.95f, result.score, 0.001f)
    }

    @Test
    fun `MatchResult holds fallback priority`() {
        val result = MatchResult(
            score = 0.2f,
            priority = MatchPriority.FALLBACK,
            matchedTags = emptyList(),
            mismatchedTags = listOf(ContentTag("mood", "dark"))
        )
        assertEquals(MatchPriority.FALLBACK, result.priority)
    }

    // --- MediaResult ---

    @Test
    fun `MediaResult Success holds content item`() {
        val item = createTestContentItem()
        val result = MediaResult.Success(item)
        assertEquals(item, result.contentItem)
    }

    @Test
    fun `MediaResult Error has message`() {
        val result = MediaResult.Error("Network failed")
        assertEquals("Network failed", result.message)
        assertNull(result.fallback)
    }

    @Test
    fun `MediaResult InProgress has progress`() {
        val result = MediaResult.InProgress(0.5f)
        assertEquals(0.5f, result.progress, 0.001f)
    }

    // --- ScanResult ---

    @Test
    fun `ScanResult Progress holds values`() {
        val result = ScanResult.Progress(scanned = 10, total = 100, currentPath = "/music")
        assertEquals(10, result.scanned)
        assertEquals(100, result.total)
        assertEquals("/music", result.currentPath)
    }

    @Test
    fun `ScanResult Completed holds items`() {
        val items = listOf(createTestContentItem())
        val result = ScanResult.Completed(items)
        assertEquals(1, result.items.size)
    }

    @Test
    fun `ScanResult Error holds path and message`() {
        val result = ScanResult.Error("/bad", "Permission denied")
        assertEquals("/bad", result.path)
        assertEquals("Permission denied", result.message)
    }

    // --- AmbientProfile ---

    @Test
    fun `AmbientProfile defaults to null fingerprints`() {
        val profile = AmbientProfile()
        assertNull(profile.audioFingerprint)
        assertNull(profile.visualFingerprint)
        assertNull(profile.suggestedCategory)
    }

    @Test
    fun `AmbientProfile has timestamp`() {
        val before = System.currentTimeMillis()
        val profile = AmbientProfile()
        val after = System.currentTimeMillis()
        assertTrue(profile.timestamp in before..after)
    }

    // --- AudioFeatures ---

    @Test
    fun `AudioFeatures can have null optional fields`() {
        val features = AudioFeatures(bpm = 120f, key = null, mood = null, genre = null)
        assertEquals(120f, features.bpm, 0.001f)
        assertNull(features.key)
        assertNull(features.mood)
    }

    // --- VisualFeatures ---

    @Test
    fun `VisualFeatures holds dominant colors`() {
        val features = VisualFeatures(
            dominantColors = listOf("blue", "black"),
            motionLevel = 0.3f,
            sceneType = "cityscape",
            brightness = 0.7f
        )
        assertEquals(listOf("blue", "black"), features.dominantColors)
        assertEquals("cityscape", features.sceneType)
    }

    // --- LicenseValidation ---

    @Test
    fun `LicenseValidation defaults`() {
        val validation = LicenseValidation(isValid = true, requiresAttribution = false)
        assertTrue(validation.isValid)
        assertEquals(false, validation.requiresAttribution)
        assertNull(validation.attributionText)
        assertTrue(validation.restrictions.isEmpty())
    }

    // --- HistoryEntry ---

    @Test
    fun `HistoryEntry holds playback data`() {
        val pair = createTestContentPair()
        val entry = HistoryEntry(
            pair = pair,
            playedAt = 1000L,
            progressMs = 5000L,
            durationMs = 30000L
        )
        assertEquals(pair, entry.pair)
        assertEquals(1000L, entry.playedAt)
        assertEquals(5000L, entry.progressMs)
        assertEquals(30000L, entry.durationMs)
    }

    // --- AppSettings ---

    @Test
    fun `AppSettings has sensible defaults`() {
        val settings = AppSettings()
        assertEquals(true, settings.onlineSourcesEnabled)
        assertEquals(false, settings.aiGenerationEnabled)
        assertTrue(settings.scanPaths.isEmpty())
        assertEquals(1.0f, settings.audioVolume, 0.001f)
        assertEquals(false, settings.ambientModeEnabled)
        assertEquals(0, settings.sleepTimerMinutes)
    }

    // --- Enums ---

    @Test
    fun `MediaType has VIDEO and AUDIO`() {
        assertEquals(2, MediaType.entries.size)
        assertNotNull(MediaType.VIDEO)
        assertNotNull(MediaType.AUDIO)
    }

    @Test
    fun `ContentSource has all expected values`() {
        val sources = ContentSource.entries.map { it.name }
        assertTrue(sources.contains("LOCAL"))
        assertTrue(sources.contains("YOUTUBE"))
        assertTrue(sources.contains("INTERNET_ARCHIVE"))
        assertTrue(sources.contains("PIXABAY"))
        assertTrue(sources.contains("PEXELS"))
        assertTrue(sources.contains("AI_GENERATED"))
    }

    @Test
    fun `LicenseType has all expected values`() {
        val licenses = LicenseType.entries.map { it.name }
        assertTrue(licenses.contains("FREE"))
        assertTrue(licenses.contains("CC0"))
        assertTrue(licenses.contains("CREATIVE_COMMONS"))
        assertTrue(licenses.contains("PROPRIETARY"))
    }

    @Test
    fun `MatchPriority has all expected values`() {
        val priorities = MatchPriority.entries.map { it.name }
        assertTrue(priorities.contains("EXACT_MATCH"))
        assertTrue(priorities.contains("PARTIAL_MATCH"))
        assertTrue(priorities.contains("FALLBACK"))
    }

    @Test
    fun `AIProvider has all expected values`() {
        val providers = AIProvider.entries.map { it.name }
        assertTrue(providers.contains("SUNO"))
        assertTrue(providers.contains("MUSICGEN"))
        assertTrue(providers.contains("STABLE_AUDIO"))
        assertTrue(providers.contains("RUNWAY"))
        assertTrue(providers.contains("STABLE_VIDEO"))
        assertTrue(providers.contains("PIKA"))
    }

    // --- Helpers ---

    private fun createTestContentItem(): ContentItem {
        return ContentItem(
            id = "test_item",
            type = MediaType.VIDEO,
            source = ContentSource.LOCAL,
            uri = "file:///test.mp4",
            title = "Test Content",
            tags = listOf(ContentTag("mood", "calm")),
            category = ContentCategory(
                id = "nature",
                name = "Nature",
                description = "Nature scenes",
                defaultTags = emptyList()
            ),
            licenseType = LicenseType.FREE,
            metadata = MediaMetadata(durationMs = 60000)
        )
    }

    private fun createTestContentPair(): ContentPair {
        val item = createTestContentItem()
        return ContentPair(
            video = item,
            audio = item.copy(id = "test_audio", type = MediaType.AUDIO),
            matchScore = 0.85f
        )
    }
}
