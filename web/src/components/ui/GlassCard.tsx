import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  strong?: boolean;
  onClick?: () => void;
}

/** Glassmorphism surface. */
export function GlassCard({ children, className, strong, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        strong ? 'glass-strong' : 'glass',
        'transition-all duration-300',
        onClick && 'cursor-pointer hover:border-[rgb(var(--accent-glow)/0.4)] hover:shadow-glow',
        className
      )}
    >
      {children}
    </div>
  );
}
