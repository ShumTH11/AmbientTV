import { describe, it, expect } from 'vitest';
import { getThemePreset, THEME_PRESETS } from '@/lib/theme-presets';

describe('getThemePreset', () => {
  it('returns the matching category preset', () => {
    expect(getThemePreset('nature').accent).toBe(THEME_PRESETS.nature.accent);
  });
  it('falls back to default for unknown / null', () => {
    expect(getThemePreset(null)).toBe(THEME_PRESETS.default);
    expect(getThemePreset('does-not-exist')).toBe(THEME_PRESETS.default);
  });
  it('exposes all expected category accents', () => {
    expect(Object.keys(THEME_PRESETS)).toEqual(
      expect.arrayContaining([
        'default',
        'nature',
        'rain',
        'lofi',
        'cyberpunk',
        'space',
        'japan',
        'vaporwave',
      ])
    );
  });
});
