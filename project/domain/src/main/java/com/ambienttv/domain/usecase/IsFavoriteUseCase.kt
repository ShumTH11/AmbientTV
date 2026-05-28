package com.ambienttv.domain.usecase

import com.ambienttv.domain.repository.FavoritesRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class IsFavoriteUseCase @Inject constructor(
    private val repository: FavoritesRepository
) {
    operator fun invoke(pairId: String): Flow<Boolean> = repository.isFavorite(pairId)
}
