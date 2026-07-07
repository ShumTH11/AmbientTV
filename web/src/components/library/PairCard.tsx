import { memo, useRef, useState } from 'react';
import { Play, Heart, Plus, ListPlus, Trash2 } from 'lucide-react';
import { TiltCard } from '@/components/ui/TiltCard';
import { Reveal } from '@/components/ui/Reveal';
import { useAppStore } from '@/store/AppStore';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/context/ThemeContext';
import { useT } from '@/i18n/I18nContext';
import { cn } from '@/lib/utils';
import { youtubeThumbnail } from '@/lib/sources';
import type { Scene } from '@/lib/types';

export const PairCard = memo(function PairCard({
  scene,
  categoryId,
  onPlay,
  showPlaylistMenu = false,
  onRemove,
  delay = 0,
}: {
  scene: Scene;
  categoryId?: string;
  onPlay: (scene: Scene) => void;
  showPlaylistMenu?: boolean;
  onRemove?: () => void;
  delay?: number;
}) {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { isFavorite, toggleFavorite, playlists, addToPlaylist } = useAppStore();
  const { toast } = useToast();
  const { setActiveCategory } = useTheme();
  const fav = isFavorite(scene.id);

  const previewSrc =
    scene.video?.source === 'presets' || scene.video?.source === 'uploads'
      ? scene.video.ref
      : undefined;
  const thumb =
    scene.video?.source === 'youtube' && scene.video.ref
      ? youtubeThumbnail(scene.video.ref)
      : undefined;

  const play = () => {
    const v = videoRef.current;
    if (v) {
      v.currentTime = 0;
      v.play().catch(() => {});
    }
  };
  const stop = () => videoRef.current?.pause();

  return (
    <Reveal delay={delay}>
      <TiltCard strength={6} className="w-full">
        <div
          onMouseEnter={() => {
            setHovered(true);
            if (categoryId) setActiveCategory(categoryId);
            play();
          }}
          onMouseLeave={() => {
            setHovered(false);
            stop();
          }}
          className="group relative h-64 cursor-pointer overflow-hidden rounded-2xl glass"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--accent-glow)/0.4)] to-transparent" />
          {thumb && (
            <img
              src={thumb}
              alt=""
              loading="lazy"
              className={cn(
                'absolute inset-0 h-full w-full object-cover transition-opacity duration-500',
                hovered ? 'opacity-0' : 'opacity-80'
              )}
            />
          )}
          {previewSrc && (
            <video
              ref={videoRef}
              src={previewSrc}
              muted
              loop
              playsInline
              preload="metadata"
              className={cn(
                'absolute inset-0 h-full w-full object-cover transition-opacity duration-500',
                hovered ? 'opacity-100' : 'opacity-0'
              )}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />

          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              aria-label={t('playlist.removeItem')}
              className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full glass text-white transition-transform hover:scale-110 hover:bg-rose-500/40"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              const wasFav = fav;
              toggleFavorite(scene);
              toast(
                wasFav ? t('favorites.removed') : t('favorites.added'),
                wasFav ? 'info' : 'heart'
              );
            }}
            aria-label={fav ? t('favorites.remove') : t('favorites.add')}
            aria-pressed={fav}
            className={cn(
              'absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur transition-transform hover:scale-110',
              fav ? 'bg-rose-500/40 text-rose-200' : 'glass text-white'
            )}
          >
            <Heart className={cn('h-4 w-4', fav && 'fill-current')} />
          </button>

          {showPlaylistMenu && (
            <div className="absolute right-3 top-14">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((o) => !o);
                }}
                aria-label={t('playlist.add')}
                className="glass flex h-9 w-9 items-center justify-center rounded-full text-white transition-transform hover:scale-110"
              >
                <Plus className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-11 w-44 rounded-2xl glass-strong p-2 text-sm"
                >
                  {playlists.length === 0 && (
                    <div className="px-2 py-1.5 text-[rgb(var(--ink-soft))]">
                      {t('playlist.createFirst')}
                    </div>
                  )}
                  {playlists.map((pl) => (
                    <button
                      key={pl.id}
                      onClick={() => {
                        addToPlaylist(pl.id, scene);
                        toast(`${t('playlist.added')} «${pl.name}»`, 'check');
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-white hover:bg-white/10"
                    >
                      <ListPlus className="h-4 w-4 text-[rgb(var(--accent))]" />
                      <span className="truncate">{pl.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4">
            <h3 className="line-clamp-2 pr-2 font-display font-bold text-white">{scene.title}</h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlay(scene);
              }}
              aria-label={`${t('player.play')} ${scene.title}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[rgb(var(--accent-glow))] to-[rgb(var(--accent))] text-white shadow-glow transition-transform hover:scale-110"
            >
              <Play className="h-5 w-5 translate-x-0.5 fill-current" />
            </button>
          </div>
        </div>
      </TiltCard>
    </Reveal>
  );
});
