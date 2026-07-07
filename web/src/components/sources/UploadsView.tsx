import { useState } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, Loader2 } from 'lucide-react';
import type { Scene } from '@/lib/types';
import { buildSceneId } from '@/lib/sources';
import { uploadFile } from '@/lib/api';
import { useAppStore } from '@/store/AppStore';
import { useToast } from '@/components/ui/Toast';
import { useT } from '@/i18n/I18nContext';
import { SceneCard } from './SceneCard';

export function UploadsView({ onPlay }: { onPlay: (scenes: Scene[], index: number) => void }) {
  const t = useT();
  const { uploadedScenes, addUploadedScene } = useAppStore();
  const { toast } = useToast();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const handleUpload = async () => {
    if (!videoFile && !audioFile && !imageFile) {
      toast(t('custom.pickAtLeastOne'), 'info');
      return;
    }
    setBusy(true);
    try {
      const [v, a, im] = await Promise.all([
        videoFile ? uploadFile(videoFile, 'video') : Promise.resolve(null),
        audioFile ? uploadFile(audioFile, 'audio') : Promise.resolve(null),
        imageFile ? uploadFile(imageFile, 'image') : Promise.resolve(null),
      ]);
      const title = (v?.originalName || a?.originalName || im?.originalName || t('uploads.uploaded')).replace(
        /\.[^.]+$/,
        ''
      );
      const scene: Scene = {
        id: buildSceneId('uploads', [v?.url, a?.url, im?.url].filter(Boolean).join('|')),
        title,
        source: 'uploads',
        video: v ? { source: 'uploads', ref: v.url, title } : undefined,
        image: im ? { source: 'uploads', ref: im.url, title } : undefined,
        audio: a ? { source: 'uploads', ref: a.url, title } : undefined,
      };
      addUploadedScene(scene);
      toast(t('uploads.uploaded'), 'check');
      setVideoFile(null);
      setAudioFile(null);
      setImageFile(null);
      const form = document.getElementById('upload-form') as HTMLFormElement | null;
      form?.reset();
    } catch (e) {
      toast(`${t('toast.error')}: ${(e as Error).message}`, 'info');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">↑</span>
          <h1 className="font-display text-3xl font-bold text-white">{t('uploads.title')}</h1>
        </div>
        <p className="mt-2 max-w-2xl text-white/60">{t('uploads.subtitle')}</p>
      </motion.div>

      <form
        id="upload-form"
        className="glass mt-6 grid gap-4 rounded-2xl p-5 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          handleUpload();
        }}
      >
        <label className="flex flex-col gap-1 text-sm text-white/70">
          {t('custom.video')}
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            className="block w-full text-xs text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-[rgb(var(--accent-glow)/0.3)] file:px-3 file:py-2 file:text-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-white/70">
          {t('custom.audio')}
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
            className="block w-full text-xs text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-[rgb(var(--accent-glow)/0.3)] file:px-3 file:py-2 file:text-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-white/70">
          {t('uploads.image')}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            className="block w-full text-xs text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-[rgb(var(--accent-glow)/0.3)] file:px-3 file:py-2 file:text-white"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="shimmer-button flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          {t('common.add')}
        </button>
      </form>

      <p className="mt-3 text-xs text-white/40">
        {t('uploads.hint')} {t('uploads.imageHint')}
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {uploadedScenes.length === 0 ? (
          <div className="col-span-full">
            <div className="glass rounded-2xl p-8 text-center text-white/60">
              {t('uploads.empty')}
            </div>
          </div>
        ) : (
          uploadedScenes.map((s, i) => (
            <SceneCard key={s.id} scene={s} index={i} onPlay={() => onPlay(uploadedScenes, i)} />
          ))
        )}
      </div>
    </section>
  );
}
