package com.ambienttv.domain.usecase

import com.ambienttv.domain.ai.AIContentAdapter
import com.ambienttv.domain.model.ContentCategory
import com.ambienttv.domain.model.ContentItem
import com.ambienttv.domain.model.ContentSource
import com.ambienttv.domain.model.LicenseType
import com.ambienttv.domain.model.MediaMetadata
import com.ambienttv.domain.model.MediaResult
import com.ambienttv.domain.model.MediaType
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class GenerateMediaUseCaseTest {

    private lateinit var aiContentAdapter: AIContentAdapter
    private lateinit var useCase: GenerateMediaUseCase

    @Before
    fun setUp() {
        aiContentAdapter = mockk()
        useCase = GenerateMediaUseCase(aiContentAdapter)
    }

    @Test
    fun `invoke emits InProgress and then Success`() = runTest {
        val item = ContentItem(
            id = "generated_1",
            type = MediaType.VIDEO,
            source = ContentSource.AI_GENERATED,
            uri = "https://ai.example.com/video.mp4",
            title = "Generated Video",
            tags = emptyList(),
            category = ContentCategory("test", "Test", "Test", emptyList()),
            licenseType = LicenseType.FREE,
            metadata = MediaMetadata()
        )

        coEvery { aiContentAdapter.generateMedia("nature scene", MediaType.VIDEO) } returns
                MediaResult.Success(item)

        val results = useCase("nature scene", MediaType.VIDEO).toList()

        assertEquals(3, results.size)
        assertTrue(results[0] is MediaResult.InProgress)
        assertEquals(0.0f, (results[0] as MediaResult.InProgress).progress, 0.001f)
        assertTrue(results[1] is MediaResult.InProgress)
        assertEquals(0.5f, (results[1] as MediaResult.InProgress).progress, 0.001f)
        assertTrue(results[2] is MediaResult.Success)
        assertEquals(item, (results[2] as MediaResult.Success).contentItem)
    }

    @Test
    fun `invoke emits Error when AI fails`() = runTest {
        coEvery {
            aiContentAdapter.generateMedia(any(), any())
        } throws RuntimeException("API rate limit")

        val results = useCase("prompt", MediaType.AUDIO).toList()

        assertEquals(3, results.size)
        assertTrue(results[2] is MediaResult.Error)
        val error = results[2] as MediaResult.Error
        assertTrue(error.message.contains("Generation failed"))
        assertTrue(error.message.contains("API rate limit"))
    }

    @Test
    fun `invoke passes correct parameters to adapter`() = runTest {
        coEvery { aiContentAdapter.generateMedia(any(), any()) } returns
                MediaResult.Error("test")

        useCase("cyberpunk city", MediaType.VIDEO).toList()

        coVerify { aiContentAdapter.generateMedia("cyberpunk city", MediaType.VIDEO) }
    }
}
