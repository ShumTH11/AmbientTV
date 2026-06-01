package com.ambienttv.domain.usecase

import com.ambienttv.domain.model.ContentCategory
import com.ambienttv.domain.model.ContentItem
import com.ambienttv.domain.model.ContentPair
import com.ambienttv.domain.model.ContentSource
import com.ambienttv.domain.model.LicenseType
import com.ambienttv.domain.model.MediaMetadata
import com.ambienttv.domain.model.MediaType
import com.ambienttv.domain.repository.FavoritesRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class FavoritesUseCasesTest {

    private lateinit var repository: FavoritesRepository
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
    fun `AddFavoriteUseCase adds pair to repository`() = runTest {
        val useCase = AddFavoriteUseCase(repository)
        useCase(testPair)
        coVerify(exactly = 1) { repository.addFavorite(testPair) }
    }

    @Test
    fun `RemoveFavoriteUseCase removes pair by id`() = runTest {
        val useCase = RemoveFavoriteUseCase(repository)
        useCase("pair_123")
        coVerify(exactly = 1) { repository.removeFavorite("pair_123") }
    }

    @Test
    fun `GetFavoritesUseCase returns favorites from repository`() = runTest {
        every { repository.observeFavorites() } returns flowOf(listOf(testPair))
        val useCase = GetFavoritesUseCase(repository)

        val result = useCase().first()

        assertEquals(1, result.size)
        assertEquals(testPair, result[0])
    }

    @Test
    fun `IsFavoriteUseCase returns true when pair is favorited`() = runTest {
        every { repository.isFavorite("pair_123") } returns flowOf(true)
        val useCase = IsFavoriteUseCase(repository)

        val result = useCase("pair_123").first()

        assertEquals(true, result)
    }

    @Test
    fun `IsFavoriteUseCase returns false when pair is not favorited`() = runTest {
        every { repository.isFavorite("pair_456") } returns flowOf(false)
        val useCase = IsFavoriteUseCase(repository)

        val result = useCase("pair_456").first()

        assertEquals(false, result)
    }
}
