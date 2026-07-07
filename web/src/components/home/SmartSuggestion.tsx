import { Sparkles as SparkleIcon, ArrowRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useT } from '@/i18n/I18nContext';
import type { Category } from '@/lib/types';

export function SmartSuggestion({
  category,
  onOpen,
}: {
  category: Category;
  onOpen: (c: Category) => void;
}) {
  const t = useT();
  return (
    <div className="mx-auto mt-4 max-w-7xl px-6">
      <GlassCard strong className="relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[rgb(var(--accent-glow)/0.25)] blur-3xl animate-float" />
        </div>
        <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[rgb(var(--accent))]">
              <SparkleIcon className="h-4 w-4" /> {t('home.suggested')}
            </div>
            <h3 className="mt-2 font-display text-2xl font-bold text-white">{category.name}</h3>
            <p className="mt-1 max-w-md text-sm text-[rgb(var(--ink-soft))]">
              {category.description}
            </p>
          </div>
          <button
            onClick={() => onOpen(category)}
            className="group flex shrink-0 items-center gap-2 rounded-full border border-[rgb(var(--accent-glow)/0.4)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[rgb(var(--accent-glow)/0.15)]"
          >
            {t('home.explore')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
