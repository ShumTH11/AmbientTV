import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Video, Music, Image as ImageIcon } from 'lucide-react';
import type { Catalog, Scene, SourceId } from '@/lib/types';
import { catalogToScenes, sourceIcon, sourceLabel } from '@/lib/sources';
import { useAppStore } from '@/store/AppStore';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n/I18nContext';
import { cn } from '@/lib/utils';

const SOURCES: SourceId[] = ['presets', 'youtube', 'rutube', 'uploads'];

function SlotPanel({
  kind,
  label,
  icon,
  source,
  onSource,
  scenes,
  selected,
  onSelect,
}: {
  kind: 'visual' | 'audio';
  label: string;
  icon: React.ReactNode;
  source: SourceId;
  onSource: (s: SourceId) => void;
  scenes: Scene[];
  selected: Scene | null;
  onSelect: (s: Scene | null) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="glass-strong flex flex-col rounded-3xl p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgb(var(--accent-glow)/0.2)] text-white">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-display text-lg font-bold text-white">{label}</h3>
          <p className="text-xs text-white/40">{t(sourceLabel(source))}</p>
        </div>
        <select
          value={source}
          onChange={(e) => onSource(e.target.value as SourceId)}
          className="shrink-0 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[rgb(var(--accent))]"
          aria-label={label}
        >
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {t(sourceLabel(s))}
            </option>
          ))}
        </select>
      </div>

      <div
        className="no-scrollbar flex flex-col gap-1.5 overflow-y-auto pr-1"
        style={{ maxHeight: '280px' }}
      >
        <button
          onClick={() => onSelect(null)}
          className={cn(
            'flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm transition-colors',
            !selected
              ? 'border-[rgb(var(--accent-glow)/0.6)] bg-[rgb(var(--accent-glow)/0.15)] text-white'
              : 'border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
          )}
        >
          <span className="text-base opacity-50">—</span>
          <span className="font-medium">
            {kind === 'visual' ? t('custom.noVisual') : t('custom.noAudio')}
          </span>
        </button>

        {scenes.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/30">
            {t('custom.emptySource')}
          </div>
        )}

        {scenes.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className={cn(
              'flex items-center gap-2.5 rounded-xl border px-4 py-3 text-left text-sm transition-colors',
              selected?.id === s.id
                ? 'border-[rgb(var(--accent-glow)/0.6)] bg-[rgb(var(--accent-glow)/0.15)] text-white'
                : 'border-white/10 text-white/60 hover:border-white/20 hover:text-white'
            )}
          >
            <span className="shrink-0 text-base">{sourceIcon(s.source)}</span>
            <span className="truncate font-medium">{s.title}</span>
            {selected?.id === s.id && (
              <span className="ml-auto shrink-0 text-xs text-[rgb(var(--accent))]">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CustomView({
  catalog,
  onPlay,
  onClose,
}: {
  catalog: Catalog;
  onPlay: (scenes: Scene[], index: number) => void;
  onClose?: () => void;
}) {
  const { t } = useI18n();
  const { youtubeItems, rutubeItems, uploadedScenes } = useAppStore();
  const { toast } = useToast();
  const [videoSource, setVideoSource] = useState<SourceId>('presets');
  const [audioSource, setAudioSource] = useState<SourceId>('uploads');
  const [videoSel, setVideoSel] = useState<Scene | null>(null);
  const [audioSel, setAudioSel] = useState<Scene | null>(null);

  const presetScenes = useMemo(() => catalogToScenes(catalog), [catalog]);

  const scenesFor = (s: SourceId): Scene[] => {
    switch (s) {
      case 'presets': return presetScenes;
      case 'youtube': return youtubeItems;
      case 'rutube': return rutubeItems;
      case 'uploads': return uploadedScenes;
      default: return [];
    }
  };

  const build = () => {
    if (!videoSel && !audioSel) {
      toast(t('custom.pickAtLeastOne'), 'info');
      return;
    }
    const scene: Scene = {
      id: `custom:${videoSel?.id ?? 'novis'}:${audioSel?.id ?? 'noaud'}`,
      title: `${videoSel?.title ?? t('custom.noVisual')} + ${audioSel?.title ?? t('custom.noAudio')}`,
      source: 'custom',
      video: videoSel?.video,
      image: videoSel?.image,
      audio: audioSel?.audio,
    };
    onPlay([scene], 0);
  };

  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">✦</span>
            <h1 className="font-display text-3xl font-bold text-white">{t('custom.title')}</h1>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 transition-colors hover:border-white/20 hover:text-white"
            >
              {t('common.close')}
            </button>
          )}
        </div>
        <p className="mt-2 max-w-2xl text-white/55">{t('custom.subtitle')}</p>
      </motion.div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <SlotPanel
          kind="visual"
          label={t('custom.visual')}
          icon={<Video className="h-5 w-5" />}
          source={videoSource}
          onSource={(s) => { setVideoSource(s); setVideoSel(null); }}
          scenes={scenesFor(videoSource)}
          selected={videoSel}
          onSelect={setVideoSel}
        />
        <SlotPanel
          kind="audio"
          label={t('custom.audio')}
          icon={<Music className="h-5 w-5" />}
          source={audioSource}
          onSource={(s) => { setAudioSource(s); setAudioSel(null); }}
          scenes={scenesFor(audioSource)}
          selected={audioSel}
          onSelect={setAudioSel}
        />
      </div>

      <div className="mt-8 flex flex-col items-center gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="glass rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/30">
            {t('custom.combo')}
          </p>
          <div className="mt-2 space-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-white/40">{t('custom.visual')}:</span>
              <span className="font-medium text-white">{videoSel?.title ?? t('custom.noSelection')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/40">{t('custom.audio')}:</span>
              <span className="font-medium text-white">{audioSel?.title ?? t('custom.noSelection')}</span>
            </div>
          </div>
        </div>

        <button
          onClick={build}
          disabled={!videoSel && !audioSel}
          className="shimmer-button flex shrink-0 items-center gap-2.5 rounded-2xl px-8 py-4 text-base font-semibold text-white disabled:opacity-40"
        >
          <Play className="h-5 w-5 fill-current" />
          {t('custom.buildButton')}
        </button>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-white/25">
        <ImageIcon className="h-3 w-3" />
        <span>{t('custom.footerHint')}</span>
      </div>
    </section>
  );
}
