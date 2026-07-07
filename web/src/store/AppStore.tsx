import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Category, Favorite, HistoryItem, Playlist, Scene, User } from '@/lib/types';
import {
  authLogin,
  authLogout,
  authProfile,
  authRegister,
  serverAddFavorite,
  serverAddHistory,
  serverFavorites,
  serverHistory,
  serverRemoveFavorite,
} from '@/lib/api';
import { categoryToScenes } from '@/lib/sources';

const LS = {
  fav: 'ambient_fav',
  hist: 'ambient_hist',
  pl: 'ambient_pl',
  user: 'ambient_user',
  yt: 'ambient_yt',
  ru: 'ambient_ru',
  up: 'ambient_up',
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function mergeById<T extends { scene: { id: string } }>(local: T[], server: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of local) map.set(item.scene.id, item);
  for (const item of server) map.set(item.scene.id, item); // server wins
  return Array.from(map.values());
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

async function pullServerData(
  setFavorites: (updater: (prev: Favorite[]) => Favorite[]) => void,
  setHistory: (updater: (prev: HistoryItem[]) => HistoryItem[]) => void
) {
  try {
    const [favs, hist] = await Promise.all([serverFavorites(), serverHistory()]);
    setFavorites((prev) => mergeById(prev, favs));
    setHistory((prev) => mergeById(prev, hist));
  } catch {
    /* offline — keep local data */
  }
}

interface AppStoreValue {
  favorites: Favorite[];
  history: HistoryItem[];
  playlists: Playlist[];
  user: User | null;
  youtubeItems: Scene[];
  rutubeItems: Scene[];
  uploadedScenes: Scene[];
  isFavorite: (sceneId: string) => boolean;
  toggleFavorite: (scene: Scene) => void;
  addHistory: (scene: Scene) => void;
  createPlaylist: (name: string) => void;
  deletePlaylist: (id: string) => void;
  renamePlaylist: (id: string, name: string) => void;
  cloneCategoryToPlaylist: (category: Category) => void;
  addToPlaylist: (playlistId: string, scene: Scene) => void;
  removeFromPlaylist: (playlistId: string, itemId: string) => void;
  login: (email: string, name: string) => void;
  logout: () => void;
  serverLogin: (email: string, password: string) => Promise<void>;
  serverRegister: (email: string, name: string, password: string) => Promise<void>;
  serverLogout: () => Promise<void>;
  revalidate: () => Promise<void>;
  addYouTube: (scene: Scene) => void;
  removeYouTube: (id: string) => void;
  addRutube: (scene: Scene) => void;
  removeRutube: (id: string) => void;
  addUploadedScene: (scene: Scene) => void;
  removeUploadedScene: (id: string) => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Favorite[]>(() => load(LS.fav, []));
  const [history, setHistory] = useState<HistoryItem[]>(() => load(LS.hist, []));
  const [playlists, setPlaylists] = useState<Playlist[]>(() => load(LS.pl, []));
  const [user, setUser] = useState<User | null>(() => load<User | null>(LS.user, null));
  const [youtubeItems, setYoutubeItems] = useState<Scene[]>(() => load(LS.yt, []));
  const [rutubeItems, setRutubeItems] = useState<Scene[]>(() => load(LS.ru, []));
  const [uploadedScenes, setUploadedScenes] = useState<Scene[]>(() => load(LS.up, []));

  useEffect(() => save(LS.fav, favorites), [favorites]);
  useEffect(() => save(LS.hist, history), [history]);
  useEffect(() => save(LS.pl, playlists), [playlists]);
  useEffect(() => save(LS.user, user), [user]);
  useEffect(() => save(LS.yt, youtubeItems), [youtubeItems]);
  useEffect(() => save(LS.ru, rutubeItems), [rutubeItems]);
  useEffect(() => save(LS.up, uploadedScenes), [uploadedScenes]);

  const value = useMemo<AppStoreValue>(() => {
    const isFavorite = (sceneId: string) => favorites.some((f) => f.scene.id === sceneId);

    const toggleFavorite = (scene: Scene) => {
      const wasFav = favorites.some((f) => f.scene.id === scene.id);
      setFavorites((prev) =>
        wasFav
          ? prev.filter((f) => f.scene.id !== scene.id)
          : [{ id: crypto.randomUUID(), scene, addedAt: new Date().toISOString() }, ...prev]
      );
      if (user?.server) {
        if (wasFav) serverRemoveFavorite(scene).catch(() => {});
        else serverAddFavorite(scene).catch(() => {});
      }
    };

    const addHistory = (scene: Scene) => {
      setHistory((prev) =>
        [
          { id: crypto.randomUUID(), scene, watchedAt: new Date().toISOString() },
          ...prev.filter((h) => h.scene.id !== scene.id),
        ].slice(0, 80)
      );
      if (user?.server) serverAddHistory(scene).catch(() => {});
    };

    const createPlaylist = (name: string) => {
      setPlaylists((prev) => [
        ...prev,
        { id: crypto.randomUUID(), name, items: [], created_at: new Date().toISOString() },
      ]);
    };

    const deletePlaylist = (id: string) =>
      setPlaylists((prev) => prev.filter((p) => p.id !== id));

    const renamePlaylist = (id: string, name: string) =>
      setPlaylists((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));

    const cloneCategoryToPlaylist = (category: Category) => {
      const scenes = categoryToScenes(category);
      const base = category.name || 'Playlist';
      let name = base;
      let n = 2;
      while (playlists.some((p) => p.name === name)) name = `${base} (${n++})`;
      const id = crypto.randomUUID();
      setPlaylists((prev) => [
        ...prev,
        {
          id,
          name,
          items: scenes.map((s) => ({
            id: crypto.randomUUID(),
            scene: s,
            addedAt: new Date().toISOString(),
          })),
          created_at: new Date().toISOString(),
        },
      ]);
    };

    const addToPlaylist = (playlistId: string, scene: Scene) => {
      setPlaylists((prev) =>
        prev.map((p) =>
          p.id === playlistId
            ? {
                ...p,
                items: [
                  ...p.items,
                  { id: crypto.randomUUID(), scene, addedAt: new Date().toISOString() },
                ],
              }
            : p
        )
      );
    };

    const removeFromPlaylist = (playlistId: string, itemId: string) =>
      setPlaylists((prev) =>
        prev.map((p) =>
          p.id === playlistId ? { ...p, items: p.items.filter((it) => it.id !== itemId) } : p
        )
      );

    const login = (email: string, name: string) => setUser({ email, name });
    const logout = () => setUser(null);

    const serverLogin = async (email: string, password: string) => {
      const u = await authLogin(email, password);
      setUser({ ...u, server: true });
      await pullServerData(setFavorites, setHistory);
    };
    const serverRegister = async (email: string, name: string, password: string) => {
      await authRegister(email, name, password);
      await serverLogin(email, password);
    };
    const serverLogout = async () => {
      try {
        await authLogout();
      } catch {
        /* ignore */
      }
      setUser(null);
    };
    const revalidate = async () => {
      if (!user?.server) return;
      const fresh = await authProfile();
      if (!fresh) setUser(null);
      else setUser({ ...fresh, server: true });
    };

    const addYouTube = (scene: Scene) =>
      setYoutubeItems((prev) => [scene, ...prev.filter((s) => s.id !== scene.id)]);
    const removeYouTube = (id: string) =>
      setYoutubeItems((prev) => prev.filter((s) => s.id !== id));
    const addRutube = (scene: Scene) =>
      setRutubeItems((prev) => [scene, ...prev.filter((s) => s.id !== scene.id)]);
    const removeRutube = (id: string) =>
      setRutubeItems((prev) => prev.filter((s) => s.id !== id));
    const addUploadedScene = (scene: Scene) =>
      setUploadedScenes((prev) => [scene, ...prev.filter((s) => s.id !== scene.id)]);
    const removeUploadedScene = (id: string) =>
      setUploadedScenes((prev) => prev.filter((s) => s.id !== id));

    return {
      favorites,
      history,
      playlists,
      user,
      youtubeItems,
      rutubeItems,
      uploadedScenes,
      isFavorite,
      toggleFavorite,
      addHistory,
      createPlaylist,
      deletePlaylist,
      renamePlaylist,
      cloneCategoryToPlaylist,
      addToPlaylist,
      removeFromPlaylist,
      login,
      logout,
      serverLogin,
      serverRegister,
      serverLogout,
      revalidate,
      addYouTube,
      removeYouTube,
      addRutube,
      removeRutube,
      addUploadedScene,
      removeUploadedScene,
    };
  }, [favorites, history, playlists, user]);

  // On mount, re-validate any server session restored from localStorage.
  useEffect(() => {
    value.revalidate();
    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider');
  return ctx;
}
