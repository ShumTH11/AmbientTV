import type { Catalog, Category, ContentPair, MediaRef, Scene, SourceId } from './types';

export function isIframeSource(source?: SourceId): boolean {
  return source === 'youtube' || source === 'rutube';
}

/** True when a media ref points to an animated GIF (rendered as a looping <video>). */
export function isGifRef(ref?: string): boolean {
  return !!ref && /\.gif(\?.*)?$/i.test(ref);
}

/** True when a media ref points to a static or animated image. */
export function isImageRef(ref?: string): boolean {
  return !!ref && /\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(ref);
}

/** The visual media for a scene: video takes priority over image. */
export function visualOf(scene: Scene): MediaRef | undefined {
  return scene.video ?? scene.image;
}

/** Extract an 11-char YouTube video id from a URL or raw id. */
export function parseYouTubeId(input: string): string | null {
  const raw = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/live\/([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = raw.match(p);
    if (m) return m[1];
  }
  return null;
}

/** Extract a Rutube video id from a URL or raw id. */
export function parseRutubeId(input: string): string | null {
  const raw = input.trim();
  const m = raw.match(/rutube\.ru\/(?:play|video)\/([A-Za-z0-9]+)/);
  if (m) return m[1];
  if (/^[A-Za-z0-9]{8,}$/.test(raw)) return raw;
  return null;
}

export function youtubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function youtubeEmbedUrl(id: string, muted: boolean): string {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: muted ? '1' : '0',
    controls: '0',
    loop: '1',
    playlist: id,
    modestbranding: '1',
    rel: '0',
    playsinline: '1',
    iv_load_policy: '3',
  });
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

export function rutubeEmbedUrl(id: string, muted: boolean): string {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: muted ? '1' : '0',
  });
  return `https://rutube.ru/play/embed/${id}?${params.toString()}`;
}

export function sourceLabel(source: SourceId): string {
  // Returns i18n key; caller must wrap with t()
  switch (source) {
    case 'youtube': return 'sources.youtube';
    case 'rutube': return 'sources.rutube';
    case 'uploads': return 'sources.uploads';
    case 'presets': return 'sources.presets';
    case 'custom': return 'sources.custom';
  }
}

export function sourceIcon(source: SourceId): string {
  switch (source) {
    case 'youtube':
      return '▶';
    case 'rutube':
      return '🟢';
    case 'uploads':
      return '⬆';
    case 'presets':
      return '✦';
    case 'custom':
      return '🛠';
  }
}

/** Convert a legacy ContentPair into a Scene from the presets source. */
export function pairToScene(
  pair: ContentPair,
  ctx?: { categoryId?: string; categoryName?: string; icon?: string }
): Scene {
  return {
    id: `presets:${pair.videoUrl}:${pair.audioUrl}`,
    title: pair.title,
    source: 'presets',
    video: pair.videoUrl ? { source: 'presets', ref: pair.videoUrl, title: pair.title } : undefined,
    audio: pair.audioUrl ? { source: 'presets', ref: pair.audioUrl, title: pair.title } : undefined,
    categoryId: ctx?.categoryId,
    categoryName: ctx?.categoryName,
    icon: ctx?.icon,
  };
}

/** Flatten a single category into preset Scenes. */
export function categoryToScenes(cat: Category): Scene[] {
  return cat.pairs.map((p) =>
    pairToScene(p, { categoryId: cat.id, categoryName: cat.name, icon: cat.icon })
  );
}

/** Flatten a catalog into a list of preset Scenes. */
export function catalogToScenes(catalog: Catalog): Scene[] {
  const out: Scene[] = [];
  for (const c of catalog.categories) {
    for (const p of c.pairs) {
      out.push(pairToScene(p, { categoryId: c.id, categoryName: c.name, icon: c.icon }));
    }
  }
  return out;
}

export function buildSceneId(source: SourceId, ref: string): string {
  return `${source}:${ref}`;
}

/** Build a MediaRef for an uploaded file returned by the backend. */
export function uploadedMediaRef(kind: 'video' | 'audio', url: string, title?: string): MediaRef {
  return { source: 'uploads', ref: url, title };
}
