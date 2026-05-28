package com.ambienttv.domain.usecase

import com.ambienttv.domain.model.ContentPair
import com.ambienttv.domain.model.PlaybackSession
import com.ambienttv.domain.repository.ContentRepository
import javax.inject.Inject

/**
 * Use case for initiating playback of a content pair.
 * Creates a playback session and persists the pair for future use.
 */
public class PlayContentPairUseCase @Inject constructor(
    private val contentRepository: ContentRepository
) {

    /**
     * Starts a playback session for the given content pair.
     *
     * @param pair The video/audio pair to play
     * @return The created playback session
     */
    public suspend operator fun invoke(pair: ContentPair): PlaybackSession {
        contentRepository.saveContentPair(pair)
        return PlaybackSession(pair = pair)
    }
}
