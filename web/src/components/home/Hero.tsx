import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronDown, Wand2 } from 'lucide-react';
import { AuroraBackground } from '@/components/ui/AuroraBackground';
import { Spotlight } from '@/components/ui/Spotlight';
import { Sparkles } from '@/components/ui/Sparkles';
import { ShimmerButton } from '@/components/ui/ShimmerButton';
import { GradientText } from '@/components/ui/GradientText';
import { useT } from '@/i18n/I18nContext';

export function Hero({ onExplore, onBuild }: { onExplore: () => void; onBuild?: () => void }) {
  const t = useT();
  const { scrollYProgress } = useScroll();
  const yIcon = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const yContent = useTransform(scrollYProgress, [0, 0.4], [0, -60]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <AuroraBackground />
      <Spotlight />
      <Sparkles count={16} />
      <div className="noise-overlay" />

      {/* Scroll progress */}
      <motion.div
        style={{ scaleX: scrollYProgress }}
        className="fixed left-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-[rgb(var(--accent-glow))] to-[rgb(var(--accent))]"
      />

      <motion.div
        style={{ y: yContent, opacity: contentOpacity }}
        className="relative z-10 flex flex-col items-center"
      >
        <motion.div
          style={{ y: yIcon }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative z-10"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="text-7xl drop-shadow-[0_0_30px_rgb(var(--accent-glow)/0.5)] sm:text-8xl"
          >
            🌌
          </motion.div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative z-10 mt-6 text-sm font-medium uppercase tracking-[0.3em] text-[rgb(var(--accent-soft))]"
        >
          {t('hero.subtitle')}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="relative z-10 mt-4 max-w-4xl font-display text-5xl font-bold leading-tight sm:text-7xl"
        >
          {t('hero.title')}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="relative z-10 mt-6 max-w-xl text-lg text-[rgb(var(--ink-soft))]"
        >
          {t('hero.desc')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          className="relative z-10 mt-10 flex flex-col items-center gap-4 sm:flex-row"
        >
          <ShimmerButton onClick={onExplore}>
            {t('hero.cta')} <ChevronDown className="h-5 w-5" />
          </ShimmerButton>
          {onBuild && (
            <button
              onClick={onBuild}
              className="group flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-7 py-4 text-base font-semibold text-white backdrop-blur transition-colors hover:border-[rgb(var(--accent-glow)/0.6)] hover:bg-[rgb(var(--accent-glow)/0.12)]"
            >
              <Wand2 className="h-5 w-5" />
              {t('hero.build')}
            </button>
          )}
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[rgb(var(--ink-faint))]"
      >
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.8, repeat: Infinity }}>
          <ChevronDown className="h-6 w-6" />
        </motion.div>
      </motion.div>
    </section>
  );
}
