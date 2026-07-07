import { useAppStore } from '@/store/AppStore';
import { PairCard } from '@/components/library/PairCard';
import { EmptyState, PageWrap, type PlayHandler } from '@/components/library/Shared';
import { useT } from '@/i18n/I18nContext';

export function History({ onPlay }: { onPlay: PlayHandler }) {
  const t = useT();
  const { history } = useAppStore();
  const scenes = history.map((h) => h.scene);

  return (
    <PageWrap title={t('nav.history')} icon="📜" desc={t('history.desc')}>
      {history.length === 0 ? (
        <EmptyState icon="🕒" text={t('history.empty')} />
      ) : (
        <div className="grid grid-cols-1 gap-6 pb-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 cv-auto">
          {history.map((h, i) => (
            <PairCard
              key={h.id}
              scene={h.scene}
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
