import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ShimmerButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit';
}

/** Gradient button with a sweeping shimmer highlight. (Magic UI style) */
export function ShimmerButton({ children, onClick, className, type = 'button' }: ShimmerButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        'group relative inline-flex items-center justify-center overflow-hidden rounded-full px-8 py-3.5 font-semibold text-white shadow-glow transition-transform active:scale-[0.98]',
        className
      )}
    >
      <span className="absolute inset-0 rounded-full bg-gradient-to-r from-[rgb(var(--accent-glow))] via-[rgb(var(--accent))] to-[rgb(var(--accent-glow))]" />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent animate-shimmer" />
    </button>
  );
}
