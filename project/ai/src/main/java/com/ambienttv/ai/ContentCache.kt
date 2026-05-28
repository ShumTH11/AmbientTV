package com.ambienttv.ai

import com.ambienttv.domain.model.ContentItem
import java.util.Collections
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Thread-safe LRU in-memory cache for content items.
 *
 * Uses a [LinkedHashMap] with access-order to provide O(1) LRU eviction.
 * When the cache exceeds [MAX_SIZE], the least-recently accessed item is
 * automatically removed.
 *
 * All operations are synchronized for thread safety.
 */
@Singleton
public class ContentCache @Inject constructor() {

    private val cache: MutableMap<String, ContentItem> =
        Collections.synchronizedMap(
            object : LinkedHashMap<String, ContentItem>(
                INITIAL_CAPACITY,
                LOAD_FACTOR,
                /* accessOrder = */ true
            ) {
                override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, ContentItem>?): Boolean {
                    return size > MAX_SIZE
                }
            }
        )

    /**
     * Retrieves a content item from the cache by key.
     *
     * @param key The cache key (typically a content URI or ID)
     * @return The cached [ContentItem] or null if not found
     */
    public fun get(key: String): ContentItem? {
        return cache[key]
    }

    /**
     * Stores a content item in the cache.
     *
     * @param key The cache key
     * @param item The content item to cache
     */
    public fun put(key: String, item: ContentItem) {
        cache[key] = item
    }

    /**
     * Explicitly removes a single item from the cache.
     *
     * @param key The cache key to evict
     */
    public fun evict(key: String) {
        cache.remove(key)
    }

    /**
     * Clears all items from the cache.
     */
    public fun clear() {
        cache.clear()
    }

    /**
     * Returns the current number of items in the cache.
     */
    public fun size(): Int {
        return cache.size
    }

    /**
     * Returns true if the cache contains the given key.
     */
    public fun contains(key: String): Boolean {
        return cache.containsKey(key)
    }

    private companion object {
        const val MAX_SIZE = 50
        const val INITIAL_CAPACITY = (MAX_SIZE / 0.75f).toInt() + 1
        const val LOAD_FACTOR = 0.75f
    }
}
