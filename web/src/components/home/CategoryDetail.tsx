import { useMemo } from 'react';
import { ChevronLeft, Copy } from 'lucide-react';
import { PairCard } from '@/components/library/PairCard';
import { pairToScene } from '@/lib/sources';
import { useT } from '@/i18n/I18nContext';
import { useAppStore } from '@/store/AppStore';
import { useToast } from '@/components/ui/Toast';
import type { Category, Scene } from '@/lib/types';

export function CategoryDetail({
  category,
  onPlay,
  onBack,
  localizeTitle,
}: {
  category: Category;
  onPlay: (scenes: Scene[], index: number) => void;
  onBack: () => void;
  localizeTitle?: (title: string, categoryId: string, index: number) => string;
}) {
  const t = useT();
  const { cloneCategoryToPlaylist } = useAppStore();
  const { toast } = useToast();
  const scenes = useMemo(
    () =>
      category.pairs.map((p) =>
        pairToScene(p, {
          categoryId: category.id,
          categoryName: category.name,
          icon: category.icon,
        })
      ),
    [category]
  );

  // Apply localized titles
  const displayScenes = useMemo(() => {
    if (!localizeTitle) return scenes;
    return scenes.map((s, i) => ({
      ...s,
      title: localizeTitle(s.title, category.id, i),
    }));
  }, [scenes, localizeTitle, category.id]);

  const handleClone = () => {
    cloneCategoryToPlaylist(category);
    toast(`${t('playlist.cloned')} «${category.name}»`, 'check');
  };

  return (
    <div className="px-6 pb-16 pt-28">
      <div className="mx-auto max-w-7xl">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-sm text-[rgb(var(--ink-soft))] transition-colors hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" /> {t('common.prev')} {t('home.title').toLowerCase()}
        </button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="text-5xl drop-shadow-[0_0_20px_rgb(var(--accent-glow)/0.5)]">
              {category.icon}
            </div>
            <div>
              <h1 className="font-display text-4xl font-bold text-white">{category.name}</h1>
              <p className="text-[rgb(var(--ink-soft))]">{category.description}</p>
            </div>
          </div>
          <button
            onClick={handleClone}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-colors hover:border-[rgb(var(--accent-glow)/0.6)] hover:bg-[rgb(var(--accent-glow)/0.12)]"
          >
            <Copy className="h-4 w-4" />
            {t('category.clone')}
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 cv-auto">
          {displayScenes.map((s, i) => (
            <PairCard
              key={s.id}
              scene={s}
              categoryId={category.id}
              delay={i * 0.04}
              onPlay={(sc) => onPlay(scenes, scenes.findIndex((x) => x.id === sc.id))}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
