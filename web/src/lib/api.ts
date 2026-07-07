import type { Catalog, Category, User, Favorite, HistoryItem, Playlist, Scene, SourceId } from './types';

const API_BASE = import.meta.env.VITE_API_BASE || '';

/** True when backend is unreachable and we fall back to mock data. */
export let USING_MOCK = false;

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function del<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Mock catalog — used when backend is offline (dev without Docker)
// ---------------------------------------------------------------------------
const MOCK_CATALOG: Catalog = {
  version: 'mock',
  categories: [
    {
      id: 'nature', name: 'Nature', icon: '🌿',
      description: 'Forests, mountains, lakes, waterfalls — pure nature in 4K',
      pairs: [
        { videoUrl: '/media/video/nature17_4k.mp4', audioUrl: '', title: 'Forest Stream 4K', tags: [{ key: 'mood', value: 'calm' }] },
        { videoUrl: '/media/video/nature18_4k.mp4', audioUrl: '', title: 'Mountain Lake 4K', tags: [{ key: 'mood', value: 'calm' }] },
        { videoUrl: '/media/video/nature19_4k.mp4', audioUrl: '', title: 'Sunset Meadow 4K', tags: [{ key: 'mood', value: 'calm' }] },
      ],
    },
    {
      id: 'rain', name: 'Rain & Cozy', icon: '🌧',
      description: 'Rainy nights, cozy windows, thunderstorms',
      pairs: [
        { videoUrl: '/media/video/rainy_tokyo_4k.mp4', audioUrl: '', title: 'Rainy Tokyo Night', tags: [{ key: 'mood', value: 'cozy' }] },
        { videoUrl: '/media/video/thunderstorm_4k.mp4', audioUrl: '', title: 'Thunderstorm', tags: [{ key: 'mood', value: 'cozy' }] },
      ],
    },
    {
      id: 'lofi', name: 'Lofi & Study', icon: '🎧',
      description: 'Lofi girl rooms, jazz cafes, study vibes',
      pairs: [
        { videoUrl: '/media/video/lofi_girl_4k.mp4', audioUrl: '', title: 'Lofi Girl Room', tags: [{ key: 'genre', value: 'lofi' }] },
        { videoUrl: '/media/video/jazz_cafe_4k.mp4', audioUrl: '', title: 'Jazz Cafe', tags: [{ key: 'genre', value: 'lofi' }] },
      ],
    },
    {
      id: 'cyberpunk', name: 'Cyberpunk & Neon', icon: '🌃',
      description: 'Futuristic neon cities and rain-soaked streets',
      pairs: [
        { videoUrl: '/media/video/neon_tokyo_4k.mp4', audioUrl: '', title: 'Neon Tokyo Drive', tags: [{ key: 'genre', value: 'sci-fi' }] },
        { videoUrl: '/media/video/cyberpunk_city_4k.mp4', audioUrl: '', title: 'Cyberpunk City Rain', tags: [{ key: 'genre', value: 'sci-fi' }] },
      ],
    },
    {
      id: 'space', name: 'Space & Cosmos', icon: '🌌',
      description: 'Moon surface, nebula clouds, galaxy rotation',
      pairs: [
        { videoUrl: '/media/video/moon_surface_4k.mp4', audioUrl: '', title: 'Moon Surface 4K', tags: [{ key: 'genre', value: 'ambient' }] },
        { videoUrl: '/media/video/nebula_4k.mp4', audioUrl: '', title: 'Nebula Clouds 4K', tags: [{ key: 'genre', value: 'ambient' }] },
      ],
    },
    {
      id: 'japan', name: 'Japan & Anime', icon: '🏮',
      description: 'Tokyo nights, Kyoto bamboo, rainy Osaka',
      pairs: [
        { videoUrl: '/media/video/tokyo_night_4k.mp4', audioUrl: '', title: 'Tokyo Night Streets', tags: [{ key: 'mood', value: 'calm' }] },
        { videoUrl: '/media/video/kyoto_bamboo_4k.mp4', audioUrl: '', title: 'Kyoto Bamboo Forest', tags: [{ key: 'mood', value: 'calm' }] },
      ],
    },
    {
      id: 'vaporwave', name: 'Vaporwave & Retro', icon: '💾',
      description: 'Mallsoft dreams, retro grid sunsets',
      pairs: [
        { videoUrl: '/media/video/mallsoft_4k.mp4', audioUrl: '', title: 'Mallsoft Dreams', tags: [{ key: 'genre', value: 'vaporwave' }] },
        { videoUrl: '/media/video/retro_grid_4k.mp4', audioUrl: '', title: 'Retro Grid Sunset', tags: [{ key: 'genre', value: 'vaporwave' }] },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function fetchCatalog(): Promise<Catalog> {
  try {
    const catalog = await get<Catalog>('/api/catalog');
    USING_MOCK = false;
    return catalog;
  } catch {
    USING_MOCK = true;
    await new Promise((r) => setTimeout(r, 500)); // simulate network for loader
    return MOCK_CATALOG;
  }
}

export async function fetchProfile(): Promise<User | null> {
  try {
    return await get<User>('/api/auth/profile');
  } catch {
    return null;
  }
}

export async function fetchFavorites(): Promise<Favorite[]> {
  try {
    return await get<Favorite[]>('/api/user/favorites');
  } catch {
    return [];
  }
}

export async function fetchHistory(): Promise<HistoryItem[]> {
  try {
    return await get<HistoryItem[]>('/api/user/history');
  } catch {
    return [];
  }
}

export async function fetchPlaylists(): Promise<Playlist[]> {
  try {
    return await get<Playlist[]>('/api/user/playlists');
  } catch {
    return [];
  }
}

export interface UploadItem {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image';
  url: string;
  originalName: string;
  sizeMB: string;
  createdAt: string;
}

export async function fetchUploads(): Promise<UploadItem[]> {
  try {
    return await get<UploadItem[]>('/api/uploads');
  } catch {
    return [];
  }
}

export async function uploadFile(file: File, type: 'video' | 'audio' | 'image'): Promise<UploadItem> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/api/uploads?type=${type}`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) detail = j.error + (j.detail ? `: ${j.detail}` : '');
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Real authentication + server-side sync
// ---------------------------------------------------------------------------
interface ServerPairRow {
  id: number;
  video_url: string;
  audio_url: string;
  title: string;
  category_id?: string;
  created_at?: string;
  watched_at?: string;
  progress?: number;
  duration?: number;
}

function sourceOf(url?: string): SourceId {
  if (!url) return 'presets';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('rutube.ru')) return 'rutube';
  return 'presets';
}

function rowToScene(row: ServerPairRow): Scene {
  const v = row.video_url;
  const source = sourceOf(v);
  return {
    id: `srv:${row.video_url}|${row.audio_url}`,
    title: row.title || 'Без названия',
    source,
    video: v ? { source, ref: v, title: row.title } : undefined,
    audio: row.audio_url ? { source: 'presets', ref: row.audio_url, title: row.title } : undefined,
    categoryId: row.category_id || undefined,
  };
}

function sceneToBody(scene: Scene) {
  return {
    video_url: scene.video?.ref || '',
    audio_url: scene.audio?.ref || '',
    title: scene.title,
    category_id: scene.categoryId || '',
  };
}

export async function authRegister(email: string, name: string, password: string): Promise<User> {
  const r = await post<{ user: User }>('/api/auth/register', { email, name, password });
  return r.user;
}

export async function authLogin(email: string, password: string): Promise<User> {
  const r = await post<{ user: User }>('/api/auth/login', { email, password });
  return r.user;
}

export async function authLogout(): Promise<void> {
  await post('/api/auth/logout', {});
}

export async function authProfile(): Promise<User | null> {
  try {
    return await get<User>('/api/auth/profile');
  } catch {
    return null;
  }
}

export async function serverFavorites(): Promise<Favorite[]> {
  const rows = await get<ServerPairRow[]>('/api/user/favorites');
  return rows.map((r) => ({
    id: `srv-fav-${r.id}`,
    scene: rowToScene(r),
    addedAt: r.created_at || new Date().toISOString(),
  }));
}

export async function serverAddFavorite(scene: Scene): Promise<void> {
  await post('/api/user/favorites', sceneToBody(scene));
}

export async function serverRemoveFavorite(scene: Scene): Promise<void> {
  await del('/api/user/favorites', sceneToBody(scene));
}

export async function serverHistory(): Promise<HistoryItem[]> {
  const rows = await get<ServerPairRow[]>('/api/user/history');
  return rows.map((r) => ({
    id: `srv-hist-${r.id}`,
    scene: rowToScene(r),
    watchedAt: r.watched_at || new Date().toISOString(),
    position: r.progress || 0,
    duration: r.duration || 0,
  }));
}

export async function serverAddHistory(scene: Scene): Promise<void> {
  await post('/api/user/history', { ...sceneToBody(scene), progress: 0, duration: 0 });
}

export const api = { get, post, del, fetchCatalog, fetchProfile, fetchFavorites, fetchHistory, fetchPlaylists, fetchUploads, uploadFile, authRegister, authLogin, authLogout, authProfile, serverFavorites, serverAddFavorite, serverRemoveFavorite, serverHistory, serverAddHistory };
export type { Category };
