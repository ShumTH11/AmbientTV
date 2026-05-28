package com.ambienttv.domain.usecase

import com.ambienttv.domain.repository.FavoritesRepository
import javax.inject.Inject

class RemoveFavoriteUseCase @Inject constructor(
    private val repository: FavoritesRepository
) {
    suspend operator fun invoke(pairId: String) {
        repository.removeFavorite(pairId)
    }
}
