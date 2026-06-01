package com.ambienttv.domain.usecase

import com.ambienttv.domain.model.ContentCategory
import com.ambienttv.domain.model.ContentTag
import com.ambienttv.domain.repository.ContentRepository
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class GetCategoriesUseCaseTest {

    private lateinit var contentRepository: ContentRepository
    private lateinit var useCase: GetCategoriesUseCase

    @Before
    fun setUp() {
        contentRepository = mockk()
        useCase = GetCategoriesUseCase(contentRepository)
    }

    @Test
    fun `invoke returns categories from repository`() = runTest {
        val categories = listOf(
            ContentCategory("nature", "Nature", "Nature scenes", listOf(ContentTag("mood", "calm"))),
            ContentCategory("cyberpunk", "Cyberpunk", "Cyberpunk scenes", listOf(ContentTag("mood", "dark")))
        )
        every { contentRepository.getAllCategories() } returns flowOf(categories)

        val result = useCase().first()

        assertEquals(2, result.size)
        assertEquals("nature", result[0].id)
        assertEquals("cyberpunk", result[1].id)
    }

    @Test
    fun `invoke returns empty list when repository is empty`() = runTest {
        every { contentRepository.getAllCategories() } returns flowOf(emptyList())

        val result = useCase().first()

        assertEquals(0, result.size)
    }
}
