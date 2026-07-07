import { describe, it, expect } from 'vitest';
import {
  parseYouTubeId,
  parseRutubeId,
  categoryToScenes,
  youtubeEmbedUrl,
  rutubeEmbedUrl,
  sourceIcon,
} from '@/lib/sources';

describe('parseYouTubeId', () => {
  it('parses watch url', () => {
    expect(parseYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('parses youtu.be short link', () => {
    expect(parseYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('parses embed url', () => {
    expect(parseYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('returns a raw id unchanged', () => {
    expect(parseYouTubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('returns null for junk', () => {
    expect(parseYouTubeId('not a url')).toBeNull();
  });
});

describe('parseRutubeId', () => {
  it('parses video url', () => {
    expect(parseRutubeId('https://rutube.ru/video/abc123def/')).toBe('abc123def');
  });
  it('returns a raw id unchanged', () => {
    expect(parseRutubeId('abc123def')).toBe('abc123def');
  });
  it('returns null for unrelated url', () => {
    expect(parseRutubeId('https://example.com/x')).toBeNull();
  });
});

describe('categoryToScenes', () => {
  it('maps pairs to scenes with category context', () => {
    const scenes = categoryToScenes({
      id: 'nature',
      name: 'Природа',
      icon: '🌿',
      description: 'd',
      pairs: [
        {
          title: 'Forest',
          videoUrl: 'https://x/v.mp4',
          audioUrl: 'https://x/a.mp3',
          tags: [],
        },
      ],
    });
    expect(scenes).toHaveLength(1);
    expect(scenes[0].categoryId).toBe('nature');
    expect(scenes[0].categoryName).toBe('Природа');
    expect(scenes[0].video?.source).toBe('presets');
    expect(scenes[0].audio?.source).toBe('presets');
  });
});

describe('embed urls', () => {
  it('youtube reflects the mute flag and id', () => {
    expect(youtubeEmbedUrl('ID', true)).toContain('mute=1');
    expect(youtubeEmbedUrl('ID', false)).toContain('mute=0');
    expect(youtubeEmbedUrl('ID', true)).toContain('ID');
  });
  it('rutube embed contains the id', () => {
    expect(rutubeEmbedUrl('ID', true)).toContain('ID');
  });
});

describe('sourceIcon', () => {
  it('returns an icon for known sources', () => {
    expect(sourceIcon('youtube')).toBeTruthy();
    expect(sourceIcon('rutube')).toBeTruthy();
    expect(sourceIcon('uploads')).toBeTruthy();
  });
});
