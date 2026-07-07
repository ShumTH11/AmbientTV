import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Sparkle {
  id: number;
  top: string;
  left: string;
  size: number;
  delay: number;
  duration: number;
}

function SparkleIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="absolute">
      <path
        d="M12 0l1.8 8.2L22 12l-8.2 1.8L12 22l-1.8-8.2L2 12l8.2-1.8L12 0z"
        fill={color}
      />
    </svg>
  );
}

/** Floating sparkle particles. (Aceternity style) */
export function Sparkles({ count = 14, className }: { count?: number; className?: string }) {
  const sparkles = useMemo<Sparkle[]>(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        size: 6 + Math.random() * 14,
        delay: Math.random() * 4,
        duration: 2.5 + Math.random() * 3,
      })),
    [count]
  );

  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      {sparkles.map((s) => (
        <motion.div
          key={s.id}
          className="absolute"
          style={{ top: s.top, left: s.left }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1, 0.6] }}
          transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          <SparkleIcon size={s.size} color="rgb(var(--accent-soft))" />
        </motion.div>
      ))}
    </div>
  );
}
