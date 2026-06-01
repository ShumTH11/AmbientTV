package com.ambienttv.domain.usecase

import com.ambienttv.domain.model.ContentCategory
import com.ambienttv.domain.model.ContentItem
import com.ambienttv.domain.model.ContentPair
import com.ambienttv.domain.model.ContentSource
import com.ambienttv.domain.model.HistoryEntry
import com.ambienttv.domain.model.LicenseType
import com.ambienttv.domain.model.MediaMetadata
import com.ambienttv.domain.model.MediaType
import com.ambienttv.domain.repository.HistoryRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class HistoryUseCasesTest {

    private lateinit var repository: HistoryRepository
    private val testPair = ContentPair(
        video = ContentItem(
            id = "v1", type = MediaType.VIDEO, source = ContentSource.LOCAL,
            uri = "file:///test.mp4", title = "Video", tags = emptyList(),
            category = ContentCategory("test", "Test", "Test", emptyList()),
            licenseType = LicenseType.FREE, metadata = MediaMetadata()
        ),
        audio = ContentItem(
            id = "a1", type = MediaType.AUDIO, source = ContentSource.LOCAL,
            uri = "file:///test.mp3", title = "Audio", tags = emptyList(),
            category = ContentCategory("test", "Test", "Test", emptyList()),
            licenseType = LicenseType.FREE, metadata = MediaMetadata()
        ),
        matchScore = 0.9f
    )

    @Before
    fun setUp() {
        repository = mockk(relaxed = true)
    }

    @Test
    fun `GetHistoryUseCase returns history from repository`() = runTest {
        val entries = listOf(
            HistoryEntry(testPair, playedAt = 1000L, progressMs = 5000L, durationMs = 30000L)
        )
        every { repository.observeHistory() } returns flowOf(entries)
        val useCase = GetHistoryUseCase(repository)

        val result = useCase().first()

        assertEquals(1, result.size)
        assertEquals(testPair, result[0].pair)
        assertEquals(5000L, result[0].progressMs)
    }

    @Test
    fun `RecordPlaybackUseCase records playback with progress`() = runTest {
        val useCase = RecordPlaybackUseCase(repository)
        useCase(testPair, progressMs = 10000L, durationMs = 60000L)

        coVerify(exactly = 1) { repository.recordPlayback(testPair, 10000L, 60000L) }
    }

    @Test
    fun `ClearHistoryUseCase clears all history`() = runTest {
        val useCase = ClearHistoryUseCase(repository)
        useCase()

        coVerify(exactly = 1) { repository.clearHistory() }
    }
}
