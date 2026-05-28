package com.ambienttv.domain.usecase

import com.ambienttv.domain.model.ContentPair
import com.ambienttv.domain.repository.FavoritesRepository
import javax.inject.Inject

class AddFavoriteUseCase @Inject constructor(
    private val repository: FavoritesRepository
) {
    suspend operator fun invoke(pair: ContentPair) {
        repository.addFavorite(pair)
    }
}
