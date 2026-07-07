import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
  Heart,
  Shuffle,
  Repeat,
  Moon,
  Maximize,
  Minimize,
  AudioLines,
  Radio,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/AppStore';
import { useToast } from '@/components/ui/Toast';
import { useT } from '@/i18n/I18nContext';
import type { Scene } from '@/lib/types';
import { isIframeSource, isGifRef, sourceIcon, sourceLabel } from '@/lib/sources';
import { AuroraBackground } from '@/components/ui/AuroraBackground';
import { Sparkles as SparklesFx } from '@/components/ui/Sparkles';
import { Visualizer, type VisualizerMode } from './Visualizer';
import { YouTubeIframe, type YouTubeHandle } from './YouTubeIframe';
import { RutubeIframe } from './RutubeIframe';

const VIZ_MODES: VisualizerMode[] = ['bars', 'radial', 'particles'];
const VIZ_ICON: Record<VisualizerMode, typeof AudioLines> = {
  bars: AudioLines,
  radial: Radio,
  particles: Sparkles,
};
const SLEEP_PRESETS = [15, 30, 45, 60];

function rampVolume(el: HTMLAudioElement | null, target: number, ms: number) {
  if (!el) return;
  const start = el.volume;
  const t0 = performance.now();
  const step = () => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    el.volume = start + (target - start) * k;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function Player({
  scenes,
  startIndex = 0,
  onClose,
}: {
  scenes: Scene[];
  startIndex?: number;
  onClose: () => void;
}) {
  const t = useT();
  const [index, setIndex] = useState(startIndex);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [uiVisible, setUiVisible] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [vizMode, setVizMode] = useState<VisualizerMode>('bars');
  const [shuffle, setShuffle] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [sleepMin, setSleepMin] = useState<number | null>(null);
  const [sleepLeft, setSleepLeft] = useState(0);
  const [isFs, setIsFs] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioARef = useRef<HTMLAudioElement>(null);
  const audioBRef = useRef<HTMLAudioElement>(null);
  const activeAudioRef = useRef(0);
  const videoYtRef = useRef<YouTubeHandle>(null);
  const audioYtRef = useRef<YouTubeHandle>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const scene = scenes[index];

  const { isFavorite, toggleFavorite } = useAppStore();
  const { toast } = useToast();
  const fav = isFavorite(scene?.id ?? '');
  const vMed = scene?.video;
  const aMed = scene?.audio;
  const iMed = scene?.image;
  const vIframe = isIframeSource(vMed?.source);
  const aIframe = isIframeSource(aMed?.source);
  const sameIframe = !!vIframe && !!aIframe && vMed!.ref === aMed!.ref;
  const hasHtmlAudio = !!aMed && !aIframe;
  const vYoutube = vMed?.source === 'youtube';
  const seekable = (!!vMed && (vMed.source === 'presets' || vMed.source === 'uploads' || vYoutube)) || (hasHtmlAudio && !!aMed);

  let videoMuted: boolean;
  if (!aMed) videoMuted = muted;
  else if (sameIframe) videoMuted = muted;
  else videoMuted = true;

  const next = () =>
    changeIndex(() =>
      setIndex((i) => {
        if (shuffle && scenes.length > 1) {
          let r = i;
          while (r === i) r = Math.floor(Math.random() * scenes.length);
          return r;
        }
        return (i + 1) % scenes.length;
      })
    );
  const prev = () =>
    changeIndex(() => setIndex((i) => (i - 1 + scenes.length) % scenes.length));

  const changeIndex = (fn: () => void) => {
    setTransitioning(true);
    setTimeout(() => {
      fn();
      setTransitioning(false);
    }, 320);
  };

  const applyVideoYt = () => {
    videoYtRef.current?.setMuted(videoMuted);
    if (playing) videoYtRef.current?.play();
    else videoYtRef.current?.pause();
  };
  const applyAudioYt = () => {
    audioYtRef.current?.setMuted(muted);
    if (playing) audioYtRef.current?.play();
    else audioYtRef.current?.pause();
  };

  // Load html media + html-audio crossfade on scene change
  useEffect(() => {
    setProgress(0);
    setDuration(0);
    const v = videoRef.current;
    if (v) {
      v.loop = !autoAdvance;
      v.load();
      if (playing) v.play().catch(() => {});
    }
    if (hasHtmlAudio && aMed) {
      const incoming = activeAudioRef.current === 0 ? audioBRef.current : audioARef.current;
      const outgoing = activeAudioRef.current === 0 ? audioARef.current : audioBRef.current;
      if (incoming) {
        incoming.src = aMed.ref;
        incoming.loop = !autoAdvance;
        incoming.volume = 0;
        incoming.load();
        if (playing) incoming.play().catch(() => {});
        rampVolume(incoming, volume, 600);
      }
      if (outgoing) {
        rampVolume(outgoing, 0, 600);
        window.setTimeout(() => outgoing.pause(), 660);
      }
      activeAudioRef.current = activeAudioRef.current === 0 ? 1 : 0;
    } else {
      audioARef.current?.pause();
      audioBRef.current?.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Play / pause html media + apply to iframe handles
  useEffect(() => {
    const v = videoRef.current;
    if (playing) v?.play().catch(() => {});
    else v?.pause();
    const aEl = activeAudioRef.current === 0 ? audioARef.current : audioBRef.current;
    if (hasHtmlAudio) {
      if (playing) aEl?.play().catch(() => {});
      else aEl?.pause();
    }
    if (vYoutube) applyVideoYt();
    if (aMed?.source === 'youtube' && aIframe && !sameIframe) applyAudioYt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, index]);

  // Volume / mute on the html <audio> element (iframe audio controlled via handle)
  useEffect(() => {
    const aEl = activeAudioRef.current === 0 ? audioARef.current : audioBRef.current;
    if (aEl && !aIframe) aEl.volume = volume;
  }, [volume, index]);

  useEffect(() => {
    videoYtRef.current?.setMuted(videoMuted);
    audioYtRef.current?.setMuted(muted);
  }, [videoMuted, muted, index]);

  // Progress tracking (html video)
  const onTime = () => {
    const v = videoRef.current;
    if (v && v.duration) {
      setDuration(v.duration);
      setProgress(v.currentTime / v.duration);
    }
  };
  const onYtTick = (current: number, dur: number) => {
    setDuration(dur);
    setProgress(dur ? current / dur : 0);
  };
  const onYtState = (s: number) => {
    if (s === 0 && autoAdvance) next();
  };
  const handleEnded = () => {
    if (autoAdvance) next();
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pct = Number(e.target.value) / 100;
    if (vYoutube && vIframe) {
      const dur = videoYtRef.current?.getDuration() || duration;
      videoYtRef.current?.seekTo(pct * dur);
      setProgress(pct);
    } else if (videoRef.current && videoRef.current.duration) {
      videoRef.current.currentTime = pct * videoRef.current.duration;
      setProgress(pct);
    } else if (hasHtmlAudio && aMed) {
      // Seek the active crossfade audio element
      const aEl = activeAudioRef.current === 0 ? audioARef.current : audioBRef.current;
      if (aEl && aEl.duration) {
        aEl.currentTime = pct * aEl.duration;
        setProgress(pct);
      }
    }
  };

  // Ambient auto-hide UI
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const reset = () => {
      setUiVisible(true);
      clearTimeout(t);
      t = setTimeout(() => setUiVisible(false), 3200);
    };
    window.addEventListener('mousemove', reset);
    reset();
    return () => {
      window.removeEventListener('mousemove', reset);
      clearTimeout(t);
    };
  }, []);

  // Esc to close, space to play/pause
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Focus trap + scroll lock + restore focus on unmount
  useEffect(() => {
    const prevActive = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const root = rootRef.current;
    const focusables = () =>
      root
        ? Array.from(
            root.querySelectorAll<HTMLElement>(
              'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
            )
          )
        : [];
    const autofocus = root?.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0];
    autofocus?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const list = focusables();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevActive?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sleep timer
  useEffect(() => {
    if (sleepMin == null) {
      setSleepLeft(0);
      return;
    }
    const end = Date.now() + sleepMin * 60000;
    setSleepLeft(sleepMin);
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.round((end - Date.now()) / 1000));
      setSleepLeft(left);
      if (left <= 0) {
        window.clearInterval(id);
        setSleepMin(null);
        setPlaying(false);
        onClose();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [sleepMin, onClose]);

  // Fullscreen state sync
  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const toggleFullscreen = () => {
    const el = mediaRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  };

  const cycleSleep = () => {
    const cur = sleepMin == null ? -1 : SLEEP_PRESETS.indexOf(sleepMin);
    const nextIdx = cur + 1;
    setSleepMin(nextIdx >= 0 && nextIdx < SLEEP_PRESETS.length ? SLEEP_PRESETS[nextIdx] : null);
  };

  const VizIcon = VIZ_ICON[vizMode];

  return (
    <motion.div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Плеер — ${scene?.title ?? ''}`}
      tabIndex={-1}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[200] overflow-hidden bg-black"
    >
      {/* Video layer (crossfade) */}
      <motion.div
        ref={mediaRef}
        animate={{ opacity: transitioning ? 0 : 1 }}
        transition={{ duration: 0.32 }}
        className="absolute inset-0"
      >
        {!vMed ? (
          iMed ? (
            isGifRef(iMed.ref) ? (
              <video
                src={iMed.ref}
                muted
                autoPlay
                loop
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <img
                src={iMed.ref}
                alt={scene?.title ?? ''}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )
          ) : (
            <div className="absolute inset-0">
              <AuroraBackground />
              <SparklesFx className="opacity-40" />
            </div>
          )
        ) : vIframe ? (
          vMed.source === 'youtube' ? (
            <YouTubeIframe
              ref={videoYtRef}
              videoId={vMed.ref}
              onReady={applyVideoYt}
              onTick={onYtTick}
              onState={onYtState}
            />
          ) : (
            <RutubeIframe videoId={vMed.ref} playing={playing} muted={videoMuted} />
          )
        ) : (
          <video
            ref={videoRef}
            src={vMed.ref}
            muted={videoMuted}
            playsInline
            autoPlay
            onTimeUpdate={onTime}
            onEnded={handleEnded}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </motion.div>

      {/* Audio layer — hidden iframe when audio comes from youtube/rutube separately */}
      {aMed && aIframe && !sameIframe &&
        (aMed.source === 'youtube' ? (
          <YouTubeIframe
            ref={audioYtRef}
            videoId={aMed.ref}
            hidden
            onReady={applyAudioYt}
          />
        ) : (
          <RutubeIframe videoId={aMed.ref} playing={playing} muted={muted} hidden />
        ))}
      {/* Audio layer — html audio for presets/uploads (real FFT + crossfade) */}
      {aMed && !aIframe && (
        <>
          <audio
            ref={audioARef}
            loop={!autoAdvance}
            preload="auto"
            crossOrigin="anonymous"
            onEnded={handleEnded}
          />
          <audio
            ref={audioBRef}
            loop={!autoAdvance}
            preload="auto"
            crossOrigin="anonymous"
            onEnded={handleEnded}
          />
        </>
      )}

      {/* Edge glow (accent) — pulses with the beat */}
      <div
        className="pointer-events-none absolute inset-0 shadow-[inset_0_0_140px_50px_rgb(var(--accent-glow)/0.3)]"
        style={{ opacity: 'calc(0.2 + var(--beat, 0) * 0.8)' }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
      <div className="noise-overlay" />

      <AnimatePresence>
        {uiVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col justify-between p-6 sm:p-10"
          >
            {/* Top bar */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-[rgb(var(--accent-soft))]">
                  {sourceIcon(scene.source)} {t(sourceLabel(scene.source))}
                  {scene.categoryName ? ` · ${scene.categoryName}` : ''}
                </div>
                <h2 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">
                  {scene.title}
                </h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Закрыть плеер"
                className="glass flex h-11 w-11 items-center justify-center rounded-full text-white transition-transform hover:scale-110"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Center transport */}
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={prev}
                aria-label="Предыдущая сцена"
                className="glass flex h-14 w-14 items-center justify-center rounded-full text-white transition-transform hover:scale-110"
              >
                <SkipBack className="h-6 w-6" />
              </button>
              <button
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? 'Пауза' : 'Воспроизвести'}
                data-autofocus
                className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[rgb(var(--accent-glow))] to-[rgb(var(--accent))] text-white shadow-glow-lg transition-transform hover:scale-105"
              >
                {playing ? (
                  <Pause className="h-8 w-8 fill-current" />
                ) : (
                  <Play className="h-8 w-8 translate-x-1 fill-current" />
                )}
              </button>
              <button
                onClick={next}
                aria-label="Следующая сцена"
                className="glass flex h-14 w-14 items-center justify-center rounded-full text-white transition-transform hover:scale-110"
              >
                <SkipForward className="h-6 w-6" />
              </button>
            </div>

            {/* Bottom controls */}
            <div className="glass-strong rounded-2xl p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-3">
                <Visualizer
                  audioRef={audioARef}
                  playing={playing}
                  mode={vizMode}
                  className="h-10 min-w-[120px] flex-1 opacity-90"
                />
                <div className="hidden flex-col sm:flex">
                  <span className="text-sm font-semibold text-white">{scene.title}</span>
                  <span className="text-xs text-white/60">
                    {playing ? t('player.nowPlaying') : t('player.paused')} · {t(sourceLabel(scene.source))}
                  </span>
                </div>
                <button
                  onClick={() => setVizMode((m) => VIZ_MODES[(VIZ_MODES.indexOf(m) + 1) % VIZ_MODES.length])}
                  aria-label={`${t('player.vizMode')}: ${vizMode}`}
                  className="glass flex h-10 w-10 items-center justify-center rounded-full text-white transition-transform hover:scale-110"
                >
                  <VizIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setShuffle((s) => !s)}
                  aria-label="Перемешивание"
                  aria-pressed={shuffle}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:scale-110',
                    shuffle ? 'bg-[rgb(var(--accent-glow)/0.4)] text-white' : 'glass text-white'
                  )}
                >
                  <Shuffle className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setAutoAdvance((a) => !a)}
                  aria-label="Авто-переход к следующей сцене"
                  aria-pressed={autoAdvance}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:scale-110',
                    autoAdvance ? 'bg-[rgb(var(--accent-glow)/0.4)] text-white' : 'glass text-white'
                  )}
                >
                  <Repeat className="h-5 w-5" />
                </button>
                <button
                  onClick={cycleSleep}
                  aria-label="Таймер сна"
                  aria-pressed={sleepMin != null}
                  className={cn(
                    'flex h-10 items-center justify-center gap-1 rounded-full px-3 transition-transform hover:scale-110',
                    sleepMin != null
                      ? 'bg-[rgb(var(--accent-glow)/0.4)] text-white'
                      : 'glass text-white'
                  )}
                >
                  <Moon className="h-5 w-5" />
                  {sleepMin != null && (
                    <span className="text-xs font-semibold">
                      {Math.floor(sleepLeft / 60)}:{String(sleepLeft % 60).padStart(2, '0')}
                    </span>
                  )}
                </button>
                <button
                  onClick={toggleFullscreen}
                  aria-label="Полноэкранный режим"
                  className="glass flex h-10 w-10 items-center justify-center rounded-full text-white transition-transform hover:scale-110"
                >
                  {isFs ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                </button>
                <button
                  onClick={() => {
                    toggleFavorite(scene);
                    toast(
                      fav ? 'Убрано из избранного' : 'Добавлено в избранное',
                      fav ? 'info' : 'heart'
                    );
                  }}
                  aria-label={fav ? 'Убрать из избранного' : 'В избранное'}
                  aria-pressed={fav}
                  className={cn(
                    'ml-auto flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:scale-110',
                    fav ? 'bg-rose-500/30 text-rose-300' : 'glass text-white'
                  )}
                >
                  <Heart className={cn('h-5 w-5', fav && 'fill-current')} />
                </button>
                <button
                  onClick={() => setMuted((m) => !m)}
                  aria-label={muted ? 'Включить звук' : 'Выключить звук'}
                  aria-pressed={muted}
                  className="glass flex h-10 w-10 items-center justify-center rounded-full text-white transition-transform hover:scale-110"
                >
                  {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(volume * 100)}
                  onChange={(e) => setVolume(Number(e.target.value) / 100)}
                  className="hidden w-24 accent-[rgb(var(--accent))] sm:block"
                  aria-label="Громкость"
                />
              </div>

              {seekable && (
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(progress * 100)}
                  onChange={seek}
                  className="mt-4 w-full accent-[rgb(var(--accent))]"
                  aria-label="Перемотка"
                />
              )}

              {/* Scene selector */}
              <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
                {scenes.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => changeIndex(() => setIndex(i))}
                    className={cn(
                      'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                      i === index
                        ? 'bg-[rgb(var(--accent-glow)/0.4)] text-white'
                        : 'glass text-white/70 hover:text-white'
                    )}
                  >
                    {s.title.split(' ').slice(0, 2).join(' ')}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
