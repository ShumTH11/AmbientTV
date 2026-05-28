package com.ambienttv.feature.favorites

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ambienttv.domain.model.ContentPair
import com.ambienttv.domain.usecase.AddFavoriteUseCase
import com.ambienttv.domain.usecase.GetFavoritesUseCase
import com.ambienttv.domain.usecase.IsFavoriteUseCase
import com.ambienttv.domain.usecase.RemoveFavoriteUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class FavoritesViewModel @Inject constructor(
    getFavoritesUseCase: GetFavoritesUseCase,
    private val addFavoriteUseCase: AddFavoriteUseCase,
    private val removeFavoriteUseCase: RemoveFavoriteUseCase,
    private val isFavoriteUseCase: IsFavoriteUseCase
) : ViewModel() {

    val favorites: StateFlow<List<ContentPair>> = getFavoritesUseCase()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    fun toggleFavorite(pair: ContentPair) {
        viewModelScope.launch {
            val current = isFavoriteUseCase(pair.id).stateIn(viewModelScope).value
            if (current) {
                removeFavoriteUseCase(pair.id)
            } else {
                addFavoriteUseCase(pair)
            }
        }
    }

    fun removeFavorite(pairId: String) {
        viewModelScope.launch {
            removeFavoriteUseCase(pairId)
        }
    }
}
