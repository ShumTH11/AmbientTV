export interface ContentTag {
  key: string;
  value: string;
}

export interface ContentPair {
  videoUrl: string;
  audioUrl: string;
  title: string;
  tags: ContentTag[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  pairs: ContentPair[];
}

export interface Catalog {
  version: string;
  categories: Category[];
}

export interface User {
  id?: string;
  name: string;
  email: string;
  /** true when authenticated against the backend (server-side sync enabled) */
  server?: boolean;
}

export interface SearchResult {
  scene: Scene;
  scenes: Scene[];
  index: number;
}

export interface Favorite {
  id: string;
  scene: Scene;
  addedAt: string;
}

export interface HistoryItem {
  id: string;
  scene: Scene;
  watchedAt: string;
  position?: number;
  duration?: number;
}

export interface Playlist {
  id: string;
  name: string;
  items: Favorite[];
  created_at?: string;
}

// ---------------------------------------------------------------------------
// Source-based playback model
// ---------------------------------------------------------------------------
export type SourceId = 'youtube' | 'rutube' | 'uploads' | 'presets' | 'custom';

export interface MediaRef {
  source: SourceId;
  /** videoId for youtube/rutube; url/path for uploads/presets */
  ref: string;
  title?: string;
  thumbnail?: string;
}

/** A playable scene: optional video + optional audio + optional image, each from any source. */
export interface Scene {
  id: string;
  title: string;
  source: SourceId;
  video?: MediaRef;
  audio?: MediaRef;
  /** Static image or animated GIF used as the visual layer (uploads source). */
  image?: MediaRef;
  icon?: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
}
