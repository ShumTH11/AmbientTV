import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getThemePreset, type ThemePreset } from '@/lib/theme-presets';

export type ThemeMode = 'dark' | 'light';

interface ThemeContextValue {
  activeCategory: string | null;
  setActiveCategory: (id: string | null) => void;
  preset: ThemePreset;
  userAccent: string | null;
  setUserAccent: (id: string | null) => void;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}

const LS = { accent: 'ambient_accent', mode: 'ambient_mode' };

const ThemeContext = createContext<ThemeContextValue>({
  activeCategory: null,
  setActiveCategory: () => {},
  preset: getThemePreset(null),
  userAccent: null,
  setUserAccent: () => {},
  mode: 'dark',
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [userAccent, setUserAccentState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LS.accent);
    } catch {
      return null;
    }
  });
  const [mode, setModeState] = useState<ThemeMode>(() => {
    try {
      return (localStorage.getItem(LS.mode) as ThemeMode) || 'dark';
    } catch {
      return 'dark';
    }
  });

  const setUserAccent = (id: string | null) => {
    setUserAccentState(id);
    try {
      if (id) localStorage.setItem(LS.accent, id);
      else localStorage.removeItem(LS.accent);
    } catch {
      /* ignore */
    }
  };
  const setMode = (m: ThemeMode) => {
    setModeState(m);
    try {
      localStorage.setItem(LS.mode, m);
    } catch {
      /* ignore */
    }
  };

  // Hovering a category overrides the accent transiently; otherwise the user's
  // chosen (or default) accent applies.
  const preset = useMemo(
    () => (activeCategory ? getThemePreset(activeCategory) : getThemePreset(userAccent)),
    [activeCategory, userAccent]
  );

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent', preset.accent);
    root.style.setProperty('--accent-soft', preset.accentSoft);
    root.style.setProperty('--accent-glow', preset.glow);
    root.dataset.theme = mode;
  }, [preset, mode]);

  const value = useMemo(
    () => ({ activeCategory, setActiveCategory, preset, userAccent, setUserAccent, mode, setMode }),
    [activeCategory, preset, userAccent, mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
