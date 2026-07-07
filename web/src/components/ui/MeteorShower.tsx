import { useMemo } from 'react';
import { cn } from '@/lib/utils';

/** Falling meteors. (Magic UI style) */
export function MeteorShower({ number = 14, className }: { number?: number; className?: string }) {
  const meteors = useMemo(
    () =>
      Array.from({ length: number }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `-${Math.random() * 40}%`,
        delay: Math.random() * 6,
        duration: 4 + Math.random() * 5,
      })),
    [number]
  );

  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      {meteors.map((m) => (
        <span
          key={m.id}
          className="absolute h-0.5 w-0.5 rotate-[215deg] rounded-full bg-[rgb(var(--accent-soft))] shadow-[0_0_0_1px_rgb(var(--accent-glow)/0.4)] animate-meteor"
          style={{ left: m.left, top: m.top, animationDelay: `${m.delay}s`, animationDuration: `${m.duration}s` }}
        >
          <span className="absolute top-1/2 -z-10 h-px w-[70px] -translate-y-1/2 bg-gradient-to-r from-[rgb(var(--accent-glow)/0.7)] to-transparent" />
        </span>
      ))}
    </div>
  );
}
