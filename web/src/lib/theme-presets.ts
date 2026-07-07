/**
 * Per-category accent palettes.
 * Values are space-separated RGB triplets for CSS custom properties.
 * Used by ThemeContext to retheme the whole UI when a category is active.
 */
export interface ThemePreset {
  accent: string; // primary accent (text/borders)
  accentSoft: string; // lighter accent (gradients)
  glow: string; // glow / shadow color
}

export const THEME_PRESETS: Record<string, ThemePreset> = {
  default: { accent: '125 211 252', accentSoft: '186 230 253', glow: '14 165 233' },
  nature: { accent: '82 183 136', accentSoft: '163 230 178', glow: '45 106 79' },
  rain: { accent: '125 211 252', accentSoft: '186 230 253', glow: '65 90 119' },
  lofi: { accent: '240 230 140', accentSoft: '253 246 200', glow: '74 74 122' },
  cyberpunk: { accent: '199 125 255', accentSoft: '224 187 255', glow: '123 44 191' },
  space: { accent: '76 201 240', accentSoft: '144 224 255', glow: '26 26 64' },
  japan: { accent: '244 162 97', accentSoft: '250 204 160', glow: '139 64 64' },
  vaporwave: { accent: '255 113 206', accentSoft: '255 173 230', glow: '122 45 122' },
};

export function getThemePreset(categoryId?: string | null): ThemePreset {
  if (categoryId && THEME_PRESETS[categoryId]) return THEME_PRESETS[categoryId];
  return THEME_PRESETS.default;
}

/** Warm-start accent class per category (for static styling when needed). */
export const CATEGORY_GRADIENT: Record<string, string> = {
  nature: 'from-emerald-500/30',
  rain: 'from-sky-500/30',
  lofi: 'from-amber-300/30',
  cyberpunk: 'from-fuchsia-500/30',
  space: 'from-cyan-400/30',
  japan: 'from-orange-400/30',
  vaporwave: 'from-pink-400/30',
};
