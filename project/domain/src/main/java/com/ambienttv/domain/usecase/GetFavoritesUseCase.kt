package com.ambienttv.domain.usecase

import com.ambienttv.domain.model.ContentPair
import com.ambienttv.domain.repository.FavoritesRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class GetFavoritesUseCase @Inject constructor(
    private val repository: FavoritesRepository
) {
    operator fun invoke(): Flow<List<ContentPair>> = repository.observeFavorites()
}
