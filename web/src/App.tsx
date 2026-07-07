import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { AppStoreProvider, useAppStore } from '@/store/AppStore';
import { ToastProvider } from '@/components/ui/Toast';
import { Loader } from '@/components/ui/Loader';
import { Header, type View } from '@/components/layout/Header';
import { Hero } from '@/components/home/Hero';
import { SmartSuggestion } from '@/components/home/SmartSuggestion';
import { CategoryShowcase } from '@/components/home/CategoryShowcase';
import { CategoryDetail } from '@/components/home/CategoryDetail';
import { fetchCatalog, USING_MOCK } from '@/lib/api';
import { catalogToScenes, categoryToScenes } from '@/lib/sources';
import { useI18n } from '@/i18n/I18nContext';
import type { Catalog, Category, Scene, SearchResult } from '@/lib/types';

const Favorites = lazy(() =>
  import('@/components/library/Favorites').then((m) => ({ default: m.Favorites }))
);
const History = lazy(() =>
  import('@/components/library/History').then((m) => ({ default: m.History }))
);
const Playlists = lazy(() =>
  import('@/components/library/Playlists').then((m) => ({ default: m.Playlists }))
);
const Profile = lazy(() =>
  import('@/components/library/Profile').then((m) => ({ default: m.Profile }))
);
const Player = lazy(() =>
  import('@/components/player/Player').then((m) => ({ default: m.Player }))
);
const ExternalSourceView = lazy(() =>
  import('@/components/sources/ExternalSourceView').then((m) => ({ default: m.ExternalSourceView }))
);
const UploadsView = lazy(() =>
  import('@/components/sources/UploadsView').then((m) => ({ default: m.UploadsView }))
);
const CustomView = lazy(() =>
  import('@/components/sources/CustomView').then((m) => ({ default: m.CustomView }))
);

type AppView = View | 'category';

function pickSuggestion(catalog: Catalog): Category {
  const hour = new Date().getHours();
  const map = hour < 6 ? 'space' : hour < 12 ? 'nature' : hour < 18 ? 'lofi' : 'cyberpunk';
  return catalog.categories.find((c) => c.id === map) ?? catalog.categories[0];
}

function Shell() {
  const { localizeCategory, localizeSceneTitle, t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [view, setView] = useState<AppView>('home');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [player, setPlayer] = useState<{
    scenes: Scene[];
    startIndex: number;
  } | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const { setActiveCategory } = useTheme();
  const { addHistory, youtubeItems, rutubeItems, uploadedScenes } = useAppStore();

  useEffect(() => {
    fetchCatalog().then((c) => {
      setCatalog(c);
      setTimeout(() => setLoading(false), 900);
    });
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view, selectedCategory]);

  const searchPool = useMemo<SearchResult[]>(() => {
    const pool: SearchResult[] = [];
    if (catalog) {
      for (const cat of catalog.categories) {
        const scenes = categoryToScenes(cat);
        scenes.forEach((s, i) => pool.push({ scene: s, scenes, index: i }));
      }
    }
    for (const it of youtubeItems) pool.push({ scene: it, scenes: [it], index: 0 });
    for (const it of rutubeItems) pool.push({ scene: it, scenes: [it], index: 0 });
    for (const it of uploadedScenes) pool.push({ scene: it, scenes: [it], index: 0 });
    return pool;
  }, [catalog, youtubeItems, rutubeItems, uploadedScenes]);

  const openCategory = (c: Category) => {
    setActiveCategory(c.id);
    setSelectedCategory(c);
    setView('category');
  };
  const openScenes = (scenes: Scene[], index = 0) => {
    setPlayer({ scenes, startIndex: index });
    if (scenes[index]) addHistory(scenes[index]);
  };
  const goExplore = () =>
    document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' });

  const headerView: View = view === 'category' ? 'home' : (view as View);
  const viewKey = view === 'category' ? `category-${selectedCategory?.id}` : view;

  return (
    <div className="relative min-h-screen">
      <a href="#main" className="skip-link">
        {t('common.open')}
      </a>
      <Loader visible={loading} />
      <Header
        view={headerView}
        setView={setView}
        user={null}
        searchPool={searchPool}
        onOpenScenes={openScenes}
      />

      <AnimatePresence mode="wait">
        <motion.main
          id="main"
          tabIndex={-1}
          key={viewKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          {view === 'home' && catalog && (
            <>
              <Hero onExplore={goExplore} onBuild={() => setBuilderOpen(true)} />
              <div id="categories" className="scroll-mt-24">
                <SmartSuggestion
                  category={localizeCategory(pickSuggestion(catalog))}
                  onOpen={(c) => openCategory(c)}
                />
                <CategoryShowcase
                  categories={catalog.categories.map(localizeCategory)}
                  onOpen={(c) => openCategory(c)}
                />
              </div>
            </>
          )}

          {view === 'category' && selectedCategory && (
            <CategoryDetail
              category={selectedCategory}
              onPlay={openScenes}
              onBack={() => setView('home')}
              localizeTitle={localizeSceneTitle}
            />
          )}

          {view === 'favorites' && (
            <Suspense fallback={<Loader visible />}>
              <Favorites onPlay={openScenes} />
            </Suspense>
          )}
          {view === 'history' && (
            <Suspense fallback={<Loader visible />}>
              <History onPlay={openScenes} />
            </Suspense>
          )}
          {view === 'playlists' && (
            <Suspense fallback={<Loader visible />}>
              <Playlists onPlay={openScenes} />
            </Suspense>
          )}
          {view === 'profile' && (
            <Suspense fallback={<Loader visible />}>
              <Profile onNavigate={setView} />
            </Suspense>
          )}

          {view === 'youtube' && (
            <Suspense fallback={<Loader visible />}>
              <ExternalSourceView source="youtube" onPlay={openScenes} />
            </Suspense>
          )}
          {view === 'rutube' && (
            <Suspense fallback={<Loader visible />}>
              <ExternalSourceView source="rutube" onPlay={openScenes} />
            </Suspense>
          )}
          {view === 'uploads' && (
            <Suspense fallback={<Loader visible />}>
              <UploadsView onPlay={openScenes} />
            </Suspense>
          )}
          {view === 'custom' && catalog && (
            <Suspense fallback={<Loader visible />}>
              <CustomView catalog={catalog} onPlay={openScenes} />
            </Suspense>
          )}
        </motion.main>
      </AnimatePresence>

      <footer className="border-t border-white/5 px-6 py-10 text-center text-sm text-[rgb(var(--ink-faint))]">
        <div className="font-display text-lg font-bold text-[rgb(var(--accent))]">
          {t('common.appName')}
        </div>
        <p className="mt-1">
          {t('common.appName')} — {new Date().getFullYear()}
        </p>
      </footer>

      <AnimatePresence>
        {builderOpen && catalog && (
          <motion.div
            className="fixed inset-0 z-[150] overflow-y-auto bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="min-h-full py-10">
              <Suspense fallback={<Loader visible />}>
                <CustomView
                  catalog={catalog}
                  onClose={() => setBuilderOpen(false)}
                  onPlay={(scenes, index) => {
                    setBuilderOpen(false);
                    openScenes(scenes, index);
                  }}
                />
              </Suspense>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {player && (
          <Suspense fallback={<Loader visible />}>
            <Player
              key={player.scenes[player.startIndex]?.id ?? 'player'}
              scenes={player.scenes}
              startIndex={player.startIndex}
              onClose={() => setPlayer(null)}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {USING_MOCK && (
        <div className="fixed bottom-4 left-4 z-40 rounded-full bg-amber-500/20 px-3 py-1 text-xs text-amber-200 backdrop-blur">
          demo mode — backend offline
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <AppStoreProvider>
          <ToastProvider>
            <Shell />
          </ToastProvider>
        </AppStoreProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}
