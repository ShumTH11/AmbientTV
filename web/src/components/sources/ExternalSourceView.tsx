import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { Scene, SourceId } from '@/lib/types';
import {
  buildSceneId,
  parseRutubeId,
  parseYouTubeId,
  sourceIcon,
  sourceLabel,
  youtubeThumbnail,
} from '@/lib/sources';
import { useAppStore } from '@/store/AppStore';
import { useToast } from '@/components/ui/Toast';
import { useT } from '@/i18n/I18nContext';
import { SceneCard } from './SceneCard';

function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <div className="glass rounded-2xl p-8 text-center text-white/60">
      {children}
    </div>
  );
}

export function ExternalSourceView({
  source,
  onPlay,
}: {
  source: Extract<SourceId, 'youtube' | 'rutube'>;
  onPlay: (scenes: Scene[], index: number) => void;
}) {
  const t = useT();
  const { youtubeItems, rutubeItems, addYouTube, removeYouTube, addRutube, removeRutube } =
    useAppStore();
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');

  const items = source === 'youtube' ? youtubeItems : rutubeItems;
  const add = source === 'youtube' ? addYouTube : addRutube;
  const remove = source === 'youtube' ? removeYouTube : removeRutube;

  const handleAdd = () => {
    const id = source === 'youtube' ? parseYouTubeId(url) : parseRutubeId(url);
    if (!id) {
      toast(t('external.invalidUrl'), 'info');
      return;
    }
    const label = title.trim() || `${t(sourceLabel(source))} — ${id}`;
    const scene: Scene = {
      id: buildSceneId(source, id),
      title: label,
      source,
      video: {
        source,
        ref: id,
        title: label,
        thumbnail: source === 'youtube' ? youtubeThumbnail(id) : undefined,
      },
      audio: { source, ref: id, title: label },
    };
    add(scene);
    toast(t('external.addedToSource'), 'check');
    setUrl('');
    setTitle('');
  };

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">{sourceIcon(source)}</span>
          <h1 className="font-display text-3xl font-bold text-white">
            {t('nav.video')}: {t(sourceLabel(source))}
          </h1>
        </div>
        <p className="mt-2 max-w-2xl text-white/60">{t('external.addHint')}</p>
      </motion.div>

      <div className="glass mt-6 flex flex-col gap-3 rounded-2xl p-4 sm:flex-row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={
            source === 'youtube'
              ? t('external.urlPlaceholderYouTube')
              : t('external.urlPlaceholderRutube')
          }
          className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-[rgb(var(--accent))]"
          aria-label={t('common.search')}
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={t('external.titlePlaceholder')}
          className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-[rgb(var(--accent))] sm:w-56"
          aria-label={t('library.playlistName')}
        />
        <button
          onClick={handleAdd}
          className="shimmer-button rounded-xl px-5 py-3 text-sm font-semibold text-white"
        >
          {t('external.addButton')}
        </button>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.length === 0 ? (
          <div className="col-span-full">
            <EmptyHint>{t('external.empty')}</EmptyHint>
          </div>
        ) : (
          items.map((s, i) => (
            <SceneCard
              key={s.id}
              scene={s}
              index={i}
              onPlay={() => onPlay(items, i)}
              onRemove={(sc) => remove(sc.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}
