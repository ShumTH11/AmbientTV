import { cn } from '@/lib/utils';

/** Animated aurora gradient blobs — follows the active accent color. (Magic UI style) */
export function AuroraBackground({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div className="absolute -left-1/4 -top-1/3 h-[60vh] w-[60vh] rounded-full bg-[rgb(var(--accent-glow))] opacity-20 blur-[120px] animate-aurora-1" />
      <div className="absolute -right-1/4 top-1/4 h-[55vh] w-[55vh] rounded-full bg-[rgb(var(--accent-glow))] opacity-15 blur-[130px] animate-aurora-2" />
      <div className="absolute bottom-[-20%] left-1/3 h-[65vh] w-[65vh] rounded-full bg-[rgb(var(--accent))] opacity-10 blur-[150px] animate-aurora-3" />
    </div>
  );
}
