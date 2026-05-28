package com.ambienttv.domain.repository

import com.ambienttv.domain.model.ContentPair
import kotlinx.coroutines.flow.Flow

/**
 * Repository for managing user-favorited content pairs.
 *
 * Implementations persist favorites durably so they survive app restarts.
 */
interface FavoritesRepository {

    /**
     * Hot stream of all favorites ordered by most-recently-added first.
     */
    fun observeFavorites(): Flow<List<ContentPair>>

    /**
     * One-shot check whether the given pair is currently favorited.
     */
    fun isFavorite(pairId: String): Flow<Boolean>

    /**
     * Retrieves a specific favorite pair by ID, or null if not found.
     */
    suspend fun getFavoriteById(pairId: String): ContentPair?

    /**
     * Adds a content pair to favorites (idempotent).
     */
    suspend fun addFavorite(pair: ContentPair)

    /**
     * Removes a content pair from favorites.
     */
    suspend fun removeFavorite(pairId: String)
}
