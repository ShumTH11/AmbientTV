import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sourceIcon } from '@/lib/sources';
import { useI18n, useT } from '@/i18n/I18nContext';
import { LanguageSwitcher } from '@/i18n/LanguageSwitcher';
import type { User, SearchResult } from '@/lib/types';

export type View =
  | 'home'
  | 'favorites'
  | 'history'
  | 'playlists'
  | 'profile'
  | 'youtube'
  | 'rutube'
  | 'uploads'
  | 'custom';

const NAV_IDS: { id: View; icon: string; key: string }[] = [
  { id: 'home', icon: '🏠', key: 'nav.home' },
  { id: 'favorites', icon: '♥', key: 'nav.favorites' },
  { id: 'history', icon: '⏱', key: 'nav.history' },
  { id: 'playlists', icon: '▶', key: 'nav.playlists' },
];

const SOURCE_IDS: { id: View; icon: string; key: string }[] = [
  { id: 'youtube', icon: '▶', key: 'sources.youtube' },
  { id: 'rutube', icon: '▶', key: 'sources.rutube' },
  { id: 'uploads', icon: '↑', key: 'sources.uploads' },
  { id: 'custom', icon: '✦', key: 'sources.custom' },
];

function SearchBox({
  query,
  setQuery,
  results,
  onPick,
}: {
  query: string;
  setQuery: (q: string) => void;
  results: SearchResult[];
  onPick: (r: SearchResult) => void;
}) {
  const t = useT();
  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-full glass px-3 py-2">
        <Search className="h-4 w-4 text-white/50" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('common.searchPlaceholder')}
          aria-label={t('common.search')}
          className="w-40 bg-transparent text-sm text-white outline-none placeholder-white/40"
        />
      </div>
      {results.length > 0 && (
        <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl glass-strong p-2">
          {results.map((r) => (
            <button
              key={r.scene.id}
              onClick={() => onPick(r)}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <span>{sourceIcon(r.scene.source)}</span>
              <span className="truncate">{r.scene.title}</span>
              {r.scene.categoryName && (
                <span className="ml-auto truncate text-xs text-white/40">{r.scene.categoryName}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Header({
  view,
  setView,
  user,
  searchPool,
  onOpenScenes,
}: {
  view: View;
  setView: (v: View) => void;
  user: User | null;
  searchPool?: SearchResult[];
  onOpenScenes?: (scenes: SearchResult['scenes'], index: number) => void;
}) {
  const { t, locale } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');

  const nav = useMemo(
    () =>
      NAV_IDS.map((n) => ({
        ...n,
        label: t(n.key),
      })),
    [t, locale]
  );

  const sources = useMemo(
    () =>
      SOURCE_IDS.map((n) => ({
        ...n,
        label: t(n.key),
      })),
    [t, locale]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !searchPool) return [];
    return searchPool.filter((r) => r.scene.title.toLowerCase().includes(q)).slice(0, 8);
  }, [query, searchPool]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={cn(
          'fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-3 px-5 py-4 transition-colors duration-300 sm:px-8',
          scrolled
            ? 'border-b border-white/5 bg-[rgb(var(--surface)/0.7)] backdrop-blur-xl'
            : 'bg-transparent'
        )}
      >
        {/* Mobile burger */}
        <button
          onClick={() => setMobileOpen(true)}
          aria-label={t('common.open')}
          className="glass flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white md:hidden"
        >
          <span className="text-lg">☰</span>
        </button>

        {/* Logo */}
        <button
          onClick={() => setView('home')}
          aria-label={`${t('common.appName')} — ${t('nav.home')}`}
          className="flex shrink-0 items-center gap-2 transition-transform hover:scale-105 active:scale-95"
        >
          <span className="text-2xl">✦</span>
          <span className="font-display text-lg font-bold text-[rgb(var(--accent))]">
            {t('common.appName')}
          </span>
        </button>

        {/* Desktop nav */}
        <nav
          className="hidden flex-1 items-center justify-center gap-1 lg:flex"
          aria-label={t('nav.home')}
        >
          {nav.map((n) => (
            <NavButton key={n.id} n={n} view={view} setView={setView} />
          ))}

          <span className="mx-1 h-5 w-px bg-white/10" aria-hidden />

          <span className="mr-1 shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/35 ring-1 ring-white/5">
            {t('nav.video')}
          </span>
          {sources.map((n) => (
            <NavButton key={n.id} n={n} view={view} setView={setView} />
          ))}
        </nav>

        {/* Search + lang (desktop) */}
        <div className="hidden items-center gap-2 lg:flex">
          <SearchBox
            query={query}
            setQuery={setQuery}
            results={results}
            onPick={(r) => {
              onOpenScenes?.(r.scenes, r.index);
              setQuery('');
            }}
          />
          <LanguageSwitcher compact />
        </div>

        {/* Profile button */}
        <button
          onClick={() => setView('profile')}
          aria-label={user ? `${t('nav.profile')}: ${user.name}` : t('profile.login')}
          className="glass flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-transform hover:scale-105 active:scale-95"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[rgb(var(--accent-glow)/0.4)] text-xs font-bold text-white">
            {user ? user.name.charAt(0).toUpperCase() : '?'}
          </span>
          <span className="hidden sm:inline">{user ? user.name : t('profile.login')}</span>
        </button>
      </motion.header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden"
          >
            <motion.nav
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', stiffness: 360, damping: 36 }}
              onClick={(e) => e.stopPropagation()}
              className="flex h-full w-72 max-w-[80%] flex-col gap-0.5 overflow-y-auto bg-[rgb(var(--surface)/0.97)] p-5 shadow-2xl"
              aria-label={t('nav.home')}
            >
              {/* Drawer header */}
              <div className="mb-4 flex items-center justify-between">
                <span className="font-display text-lg font-bold text-[rgb(var(--accent))]">
                  {t('common.appName')}
                </span>
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label={t('common.close')}
                  className="glass flex h-9 w-9 items-center justify-center rounded-full text-white"
                >
                  ✕
                </button>
              </div>

              {/* Search + lang inside drawer */}
              <div className="mb-3 space-y-3 px-1">
                <SearchBox
                  query={query}
                  setQuery={setQuery}
                  results={results}
                  onPick={(r) => {
                    onOpenScenes?.(r.scenes, r.index);
                    setQuery('');
                    setMobileOpen(false);
                  }}
                />
                <LanguageSwitcher compact />
              </div>

              {/* NAV items */}
              {nav.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    setView(n.id);
                    setMobileOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors',
                    view === n.id
                      ? 'bg-[rgb(var(--accent-glow)/0.2)] text-white'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <span className="text-base">{n.icon}</span>
                  <span>{n.label}</span>
                </button>
              ))}

              {/* Sources group label */}
              <div className="mt-3 mb-1 px-4 text-[10px] font-semibold uppercase tracking-widest text-white/35">
                {t('nav.videoSources')}
              </div>

              {sources.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    setView(n.id);
                    setMobileOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors',
                    view === n.id
                      ? 'bg-[rgb(var(--accent-glow)/0.2)] text-white'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <span className="text-base">{n.icon}</span>
                  <span>{n.label}</span>
                </button>
              ))}
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function NavButton({
  n,
  view,
  setView,
}: {
  n: { id: View; label: string; icon: string };
  view: View;
  setView: (v: View) => void;
}) {
  return (
    <button
      onClick={() => setView(n.id)}
      aria-label={n.label}
      aria-current={view === n.id ? 'page' : undefined}
      className={cn(
        'relative shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors active:scale-95',
        view === n.id ? 'text-white' : 'text-[rgb(var(--ink-soft))] hover:text-white'
      )}
    >
      {view === n.id && (
        <motion.span
          layoutId="nav-pill"
          className="absolute inset-0 rounded-full bg-white/10 accent-ring"
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        />
      )}
      <span className="relative flex items-center gap-1">
        <span>{n.icon}</span>
        <span className="hidden xl:inline">{n.label}</span>
      </span>
    </button>
  );
}
