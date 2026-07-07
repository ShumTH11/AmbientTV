import { memo, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { TiltCard } from '@/components/ui/TiltCard';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/types';

export const CategoryCard = memo(function CategoryCard({
  category,
  onHover,
  onOpen,
  videosLabel,
}: {
  category: Category;
  onHover: () => void;
  onOpen: (c: Category) => void;
  videosLabel?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovered, setHovered] = useState(false);

  const play = () => {
    const v = videoRef.current;
    if (v) {
      v.currentTime = 0;
      v.play().catch(() => {});
    }
  };
  const stop = () => {
    const v = videoRef.current;
    if (v) v.pause();
  };

  const firstVideo = category.pairs[0]?.videoUrl;

  return (
    <TiltCard strength={8} className="shrink-0">
      <div
        onMouseEnter={() => {
          setHovered(true);
          onHover();
          play();
        }}
        onMouseLeave={() => {
          setHovered(false);
          stop();
        }}
        onClick={() => onOpen(category)}
        className="group relative h-[440px] w-[300px] cursor-pointer overflow-hidden rounded-3xl glass sm:w-[340px]"
      >
        {/* Default gradient + watermark */}
        <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--accent-glow)/0.45)] via-[rgb(var(--accent)/0.2)] to-transparent transition-opacity duration-500" />
        <div className="absolute -right-6 -top-6 text-[10rem] opacity-10 transition-transform duration-700 group-hover:scale-110">
          {category.icon}
        </div>

        {/* Hover video preview */}
        {firstVideo && (
          <video
            ref={videoRef}
            src={firstVideo}
            muted
            loop
            playsInline
            preload="none"
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-500',
              hovered ? 'opacity-100' : 'opacity-0'
            )}
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="accent-glow-layer absolute inset-0 opacity-30 mix-blend-screen" />

        <div className="relative flex h-full flex-col justify-end p-6">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl backdrop-blur transition-all duration-300',
              hovered && 'scale-110 bg-[rgb(var(--accent-glow)/0.4)]'
            )}
          >
            {category.icon}
          </div>
          <h3 className="mt-4 font-display text-2xl font-bold text-white">{category.name}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-white/70">{category.description}</p>
          <div className="mt-4 flex items-center gap-2 text-sm font-medium text-white/85">
            <Play className="h-4 w-4 fill-current" />
            {category.pairs.length} {videosLabel}
          </div>
        </div>
      </div>
    </TiltCard>
  );
});
