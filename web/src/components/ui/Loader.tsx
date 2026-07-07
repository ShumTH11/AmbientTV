import { AnimatePresence, motion } from 'framer-motion';
import { useT } from '@/i18n/I18nContext';

/** Immersive full-screen loader with pulsing logo + aurora. */
export function Loader({ visible }: { visible: boolean }) {
  const t = useT();
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-[rgb(var(--surface))]"
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-1/2 top-1/3 h-[50vh] w-[50vh] -translate-x-1/2 rounded-full bg-[rgb(var(--accent-glow))] opacity-20 blur-[130px] animate-pulse-glow" />
          </div>
          <div className="relative text-center">
            <motion.div
              className="text-6xl"
              animate={{ scale: [1, 1.12, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              🌌
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 font-display text-2xl font-bold text-[rgb(var(--accent))]"
            >
              AmbientTV
            </motion.div>
            <div className="mt-2 text-sm text-[rgb(var(--ink-soft))]">{t('loader.loading')}</div>
            <div className="mx-auto mt-6 h-1 w-40 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[rgb(var(--accent-glow))] to-[rgb(var(--accent))]"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
