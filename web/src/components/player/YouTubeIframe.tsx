import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { loadYouTubeApi } from './youtubeApi';

export interface YouTubeHandle {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  getTime: () => number;
  getDuration: () => number;
  setMuted: (m: boolean) => void;
  getIframe: () => HTMLIFrameElement | null;
}

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (s: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  mute: () => void;
  unMute: () => void;
  getIframe?: () => HTMLIFrameElement;
  destroy: () => void;
};

export const YouTubeIframe = forwardRef<
  YouTubeHandle,
  {
    videoId: string;
    hidden?: boolean;
    autoplay?: boolean;
    onTick?: (current: number, duration: number) => void;
    onState?: (state: number) => void;
    onReady?: () => void;
    className?: string;
  }
>(function YouTubeIframe({ videoId, hidden, autoplay = true, onTick, onState, onReady, className }, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi().then(() => {
      const w = window as unknown as { YT?: { Player: new (el: HTMLElement, opts: object) => YTPlayer } };
      if (cancelled || !hostRef.current || !w.YT) return;
      playerRef.current = new w.YT.Player(hostRef.current, {
        videoId,
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          controls: 0,
          mute: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          iv_load_policy: 3,
          disablekb: 1,
          fs: 0,
        },
        events: {
          onReady: () => {
            if (!cancelled) {
              setReady(true);
              onReady?.();
            }
          },
          onStateChange: (e: { data: number }) => onState?.(e.data),
        },
      });
    });
    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      try {
        onTick?.(p.getCurrentTime() || 0, p.getDuration() || 0);
      } catch {
        /* ignore */
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [ready, onTick]);

  useImperativeHandle(
    ref,
    () => ({
      play: () => playerRef.current?.playVideo(),
      pause: () => playerRef.current?.pauseVideo(),
      seekTo: (s: number) => playerRef.current?.seekTo(s, true),
      getTime: () => playerRef.current?.getCurrentTime() || 0,
      getDuration: () => playerRef.current?.getDuration() || 0,
      setMuted: (m: boolean) => (m ? playerRef.current?.mute() : playerRef.current?.unMute()),
      getIframe: () => playerRef.current?.getIframe?.() ?? null,
    }),
    []
  );

  return (
    <div
      ref={hostRef}
      className={cn(
        'absolute inset-0 h-full w-full border-0',
        hidden ? '' : 'pointer-events-none',
        className
      )}
      style={
        hidden
          ? { width: 1, height: 1, opacity: 0, pointerEvents: 'none', top: 0, left: 0, zIndex: -1 }
          : undefined
      }
    />
  );
});
