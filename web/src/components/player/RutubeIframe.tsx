import { cn } from '@/lib/utils';
import { rutubeEmbedUrl } from '@/lib/sources';

/**
 * Embeds a Rutube video as the visual/audio layer. See YouTubeIframe for behavior.
 */
export function RutubeIframe({
  videoId,
  playing,
  muted,
  hidden,
  className,
}: {
  videoId: string;
  playing: boolean;
  muted: boolean;
  hidden?: boolean;
  className?: string;
}) {
  if (!playing) return null;
  const src = rutubeEmbedUrl(videoId, muted);
  return (
    <iframe
      key={`ru-${videoId}-${muted}-${hidden ? 'h' : 'v'}`}
      src={src}
      title="Rutube"
      allow="autoplay; encrypted-media; fullscreen"
      allowFullScreen
      className={cn(
        'absolute inset-0 h-full w-full border-0',
        hidden ? '' : 'pointer-events-none',
        className
      )}
      style={
        hidden
          ? {
              width: 1,
              height: 1,
              opacity: 0,
              pointerEvents: 'none',
              top: 0,
              left: 0,
              zIndex: -1,
            }
          : undefined
      }
    />
  );
}
