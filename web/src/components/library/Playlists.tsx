import { useState } from 'react';
import { Plus, Trash2, ChevronLeft } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { useToast } from '@/components/ui/Toast';
import { PairCard } from '@/components/library/PairCard';
import { EmptyState, PageWrap, type PlayHandler } from '@/components/library/Shared';
import { useT } from '@/i18n/I18nContext';

export function Playlists({ onPlay }: { onPlay: PlayHandler }) {
  const t = useT();
  const { playlists, createPlaylist, deletePlaylist, removeFromPlaylist } = useAppStore();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState('');

  const pl = playlists.find((p) => p.id === selected) ?? null;

  const handleCreate = () => {
    const n = name.trim();
    if (!n) return;
    createPlaylist(n);
    setName('');
    toast(`${t('playlist.created')} «${n}»`, 'check');
  };

  if (pl) {
    const scenes = pl.items.map((it) => it.scene);
    return (
      <PageWrap title={pl.name} icon="📂" desc={`${pl.items.length} ${t('home.videos')}`}>
        <button
          onClick={() => setSelected(null)}
          className="mb-6 flex items-center gap-2 text-sm text-[rgb(var(--ink-soft))] hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" /> {t('playlist.back')}
        </button>
        {pl.items.length === 0 ? (
          <EmptyState icon="🎞" text={t('playlist.empty')} />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 cv-auto">
            {pl.items.map((it, i) => (
              <PairCard
                key={it.id}
                scene={it.scene}
                delay={i * 0.04}
                onRemove={() => removeFromPlaylist(pl.id, it.id)}
                onPlay={(s) => onPlay(scenes, scenes.findIndex((x) => x.id === s.id))}
              />
            ))}
          </div>
        )}
      </PageWrap>
    );
  }

  return (
    <PageWrap title={t('nav.playlists')} icon="📂" desc={t('playlist.desc')}>
      <div className="glass-strong mb-8 flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder={t('playlist.placeholder')}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none placeholder-white/40 focus:border-[rgb(var(--accent-glow)/0.5)]"
        />
        <button
          onClick={handleCreate}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[rgb(var(--accent-glow))] to-[rgb(var(--accent))] px-5 py-2.5 font-semibold text-white shadow-glow"
        >
          <Plus className="h-4 w-4" /> {t('common.add')}
        </button>
      </div>

      {playlists.length === 0 ? (
        <EmptyState icon="📂" text={t('playlist.emptyFirst')} />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 cv-auto">
          {playlists.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelected(p.id)}
              className="group relative h-40 cursor-pointer overflow-hidden rounded-2xl glass p-5"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--accent-glow)/0.4)] to-transparent" />
              <div className="relative flex h-full flex-col justify-between">
                <div className="text-3xl">📂</div>
                <div>
                  <h3 className="font-display text-lg font-bold text-white">{p.name}</h3>
                  <p className="text-sm text-white/70">
                    {p.items.length} {t('home.videos')}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deletePlaylist(p.id);
                  toast(t('playlist.deleted'), 'info');
                }}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full glass text-white opacity-0 transition-opacity hover:bg-rose-500/40 group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </PageWrap>
  );
}
