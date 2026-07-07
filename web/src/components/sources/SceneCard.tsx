import { memo } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n/I18nContext';
import type { Scene } from '@/lib/types';
import { sourceIcon, sourceLabel, youtubeThumbnail } from '@/lib/sources';

function thumbFor(scene: Scene): string | null {
  if (scene.video?.thumbnail) return scene.video.thumbnail;
  if (scene.video?.source === 'youtube') return youtubeThumbnail(scene.video.ref);
  if (scene.image?.ref) return scene.image.ref;
  return null;
}

function SceneCardImpl({
  scene,
  onPlay,
  onRemove,
  index = 0,
}: {
  scene: Scene;
  onPlay: (scene: Scene) => void;
  onRemove?: (scene: Scene) => void;
  index?: number;
}) {
  const t = useT();
  const thumb = thumbFor(scene);
  return (
    <motion.button
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.3) }}
      whileHover={{ y: -4 }}
      onClick={() => onPlay(scene)}
      className="group glass relative flex flex-col overflow-hidden rounded-2xl text-left transition-shadow hover:shadow-glow-lg"
      aria-label={`Воспроизвести ${scene.title}`}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-black/40">
        {thumb ? (
          <img
            src={thumb}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[rgb(var(--accent-glow)/0.35)] to-[rgb(var(--accent)/0.15)]">
            <span className="text-5xl opacity-80">{scene.icon ?? sourceIcon(scene.source)}</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-semibold text-white/90 backdrop-blur">
          {sourceIcon(scene.source)} {t(sourceLabel(scene.source))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgb(var(--accent)/0.9)] text-white shadow-glow-lg">
            <Play className="h-6 w-6 translate-x-0.5 fill-current" />
          </span>
        </div>
        {onRemove && (
          <span
            role="button"
            tabIndex={-1}
            aria-hidden
            onClick={(e) => {
              e.stopPropagation();
              onRemove(scene);
            }}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white/80 opacity-0 transition-opacity hover:text-rose-300 group-hover:opacity-100"
          >
            <Trash2 className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <span className="truncate text-sm font-semibold text-white">{scene.title}</span>
        {scene.categoryName && (
          <span className="shrink-0 text-xs text-white/50">{scene.categoryName}</span>
        )}
      </div>
    </motion.button>
  );
}

export const SceneCard = memo(SceneCardImpl);
