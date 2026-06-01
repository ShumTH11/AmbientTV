package com.ambienttv.domain.usecase

import com.ambienttv.domain.model.ContentCategory
import com.ambienttv.domain.model.ContentItem
import com.ambienttv.domain.model.ContentPair
import com.ambienttv.domain.model.ContentSource
import com.ambienttv.domain.model.ContentTag
import com.ambienttv.domain.model.LicenseType
import com.ambienttv.domain.model.MediaMetadata
import com.ambienttv.domain.model.MediaType
import com.ambienttv.domain.model.PlaybackSession
import com.ambienttv.domain.repository.ContentRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Before
import org.junit.Test

class PlayContentPairUseCaseTest {

    private lateinit var contentRepository: ContentRepository
    private lateinit var useCase: PlayContentPairUseCase

    private val testCategory = ContentCategory(
        id = "nature",
        name = "Nature",
        description = "Nature scenes",
        defaultTags = listOf(ContentTag("mood", "calm"))
    )

    private val testPair = ContentPair(
        video = ContentItem(
            id = "v1",
            type = MediaType.VIDEO,
            source = ContentSource.LOCAL,
            uri = "file:///test.mp4",
            title = "Test Video",
            tags = emptyList(),
            category = testCategory,
            licenseType = LicenseType.FREE,
            metadata = MediaMetadata()
        ),
        audio = ContentItem(
            id = "a1",
            type = MediaType.AUDIO,
            source = ContentSource.LOCAL,
            uri = "file:///test.mp3",
            title = "Test Audio",
            tags = emptyList(),
            category = testCategory,
            licenseType = LicenseType.FREE,
            metadata = MediaMetadata()
        ),
        matchScore = 0.9f
    )

    @Before
    fun setUp() {
        contentRepository = mockk(relaxed = true)
        useCase = PlayContentPairUseCase(contentRepository)
    }

    @Test
    fun `invoke saves pair and returns session`() = runTest {
        val session = useCase(testPair)

        assertNotNull(session)
        assertEquals(testPair, session.pair)
        coVerify(exactly = 1) { contentRepository.saveContentPair(testPair) }
    }

    @Test
    fun `invoke generates unique session id`() = runTest {
        val session1 = useCase(testPair)
        val session2 = useCase(testPair)

        assertEquals(testPair, session1.pair)
        assertEquals(testPair, session2.pair)
        assertEquals(false, session1.sessionId == session2.sessionId)
    }

    @Test
    fun `invoke sets startedAt timestamp`() = runTest {
        val before = System.currentTimeMillis()
        val session = useCase(testPair)
        val after = System.currentTimeMillis()

        assertEquals(true, session.startedAt in before..after)
    }
}
