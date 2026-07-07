import { useEffect } from 'react';
import { motion, useMotionValue, useSpring, useMotionTemplate } from 'framer-motion';

/** Mouse-following radial spotlight. Place inside a relative parent. (Aceternity style) */
export function Spotlight({ className = '' }: { className?: string }) {
  const x = useMotionValue(50);
  const y = useMotionValue(25);
  const sx = useSpring(x, { stiffness: 60, damping: 20 });
  const sy = useSpring(y, { stiffness: 60, damping: 20 });

  const background = useMotionTemplate`radial-gradient(600px circle at ${sx}% ${sy}%, rgb(var(--accent-glow) / 0.15), transparent 80%)`;

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      x.set((e.clientX / window.innerWidth) * 100);
      y.set((e.clientY / window.innerHeight) * 100);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [x, y]);

  return (
    <motion.div
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{ background }}
    />
  );
}
