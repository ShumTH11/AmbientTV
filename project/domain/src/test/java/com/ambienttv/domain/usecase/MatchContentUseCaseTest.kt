package com.ambienttv.domain.usecase

import com.ambienttv.domain.ai.AIContentAdapter
import com.ambienttv.domain.model.ContentCategory
import com.ambienttv.domain.model.ContentItem
import com.ambienttv.domain.model.ContentPair
import com.ambienttv.domain.model.ContentSource
import com.ambienttv.domain.model.ContentTag
import com.ambienttv.domain.model.LicenseType
import com.ambienttv.domain.model.MediaMetadata
import com.ambienttv.domain.model.MediaType
import com.ambienttv.domain.repository.ContentRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test

class MatchContentUseCaseTest {

    private lateinit var contentRepository: ContentRepository
    private lateinit var aiContentAdapter: AIContentAdapter
    private lateinit var useCase: MatchContentUseCase

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
        contentRepository = mockk()
        aiContentAdapter = mockk()
        useCase = MatchContentUseCase(contentRepository, aiContentAdapter)
    }

    @Test
    fun `invoke returns AI match when adapter succeeds`() = runTest {
        coEvery { aiContentAdapter.matchContentByCategory(testCategory) } returns testPair

        val result = useCase(testCategory)

        assertEquals(testPair, result)
        coVerify(exactly = 1) { aiContentAdapter.matchContentByCategory(testCategory) }
    }

    @Test
    fun `invoke falls back to repository when AI fails`() = runTest {
        coEvery { aiContentAdapter.matchContentByCategory(testCategory) } throws RuntimeException("AI failed")
        coEvery { contentRepository.getContentPairs(testCategory) } returns listOf(testPair)

        val result = useCase(testCategory)

        assertEquals(testPair, result)
        coVerify(exactly = 1) { contentRepository.getContentPairs(testCategory) }
    }

    @Test
    fun `invoke throws when AI fails and repository is empty`() = runTest {
        coEvery { aiContentAdapter.matchContentByCategory(testCategory) } throws RuntimeException("AI failed")
        coEvery { contentRepository.getContentPairs(testCategory) } returns emptyList()

        try {
            useCase(testCategory)
            fail("Expected NoSuchElementException")
        } catch (_: NoSuchElementException) {
            // Expected
        }
    }

    @Test
    fun `invoke returns first pair from repository when AI fails`() = runTest {
        val pair2 = testPair.copy(matchScore = 0.5f)
        coEvery { aiContentAdapter.matchContentByCategory(testCategory) } throws RuntimeException("AI failed")
        coEvery { contentRepository.getContentPairs(testCategory) } returns listOf(testPair, pair2)

        val result = useCase(testCategory)

        assertEquals(testPair, result)
    }
}
