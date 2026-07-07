import type { ReactNode } from 'react';
import type { Scene } from '@/lib/types';

export type PlayHandler = (scenes: Scene[], index: number) => void;

export function PageWrap({
  title,
  icon,
  desc,
  children,
}: {
  title: string;
  icon: string;
  desc?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="px-6 pb-16 pt-28">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center gap-4">
          <div className="text-5xl drop-shadow-[0_0_20px_rgb(var(--accent-glow)/0.5)]">
            {icon}
          </div>
          <div>
            <h1 className="font-display text-4xl font-bold text-white">{title}</h1>
            {desc && <p className="text-[rgb(var(--ink-soft))]">{desc}</p>}
          </div>
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="glass-strong mx-auto mt-10 max-w-md rounded-3xl p-10 text-center">
      <div className="text-5xl">{icon}</div>
      <p className="mt-3 text-[rgb(var(--ink-soft))]">{text}</p>
    </div>
  );
}
