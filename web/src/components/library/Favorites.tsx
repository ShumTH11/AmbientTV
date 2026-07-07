import { useAppStore } from '@/store/AppStore';
import { PairCard } from '@/components/library/PairCard';
import { EmptyState, PageWrap, type PlayHandler } from '@/components/library/Shared';
import { useT } from '@/i18n/I18nContext';

export function Favorites({ onPlay }: { onPlay: PlayHandler }) {
  const t = useT();
  const { favorites } = useAppStore();
  const scenes = favorites.map((f) => f.scene);

  return (
    <PageWrap
      title={t('nav.favorites')}
      icon="❤"
      desc={t('favorites.desc')}
    >
      {favorites.length === 0 ? (
        <EmptyState icon="🤍" text={t('favorites.empty')} />
      ) : (
        <div className="grid grid-cols-1 gap-6 pb-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 cv-auto">
          {favorites.map((f, i) => (
            <PairCard
              key={f.id}
              scene={f.scene}
              showPlaylistMenu
              delay={i * 0.04}
              onPlay={(s) => onPlay(scenes, scenes.findIndex((x) => x.id === s.id))}
            />
          ))}
        </div>
      )}
    </PageWrap>
  );
}
