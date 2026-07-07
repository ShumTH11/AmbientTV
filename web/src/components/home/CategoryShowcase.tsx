import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { CategoryCard } from './CategoryCard';
import { Reveal } from '@/components/ui/Reveal';
import { useI18n } from '@/i18n/I18nContext';
import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';

export function CategoryShowcase({
  categories,
  onOpen,
}: {
  categories: Category[];
  onOpen: (c: Category) => void;
}) {
  const { setActiveCategory } = useTheme();
  const { t, localizeCategory } = useI18n();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [categories.length]);

  // Wheel: translate vertical wheel to horizontal scroll within the carousel area
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      // Only hijack if mostly-vertical wheel (so we don't break touchpad horizontal)
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = Math.min(el.clientWidth * 0.85, 800);
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  return (
    <section className="relative py-16">
      {/* Title block — constrained, centered */}
      <div className="mx-auto flex max-w-7xl items-end justify-between gap-4 px-6 pb-8">
        <div>
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            {t('home.title')}
          </h2>
          <p className="mt-2 max-w-xl text-[rgb(var(--ink-soft))]">{t('home.subtitle')}</p>
        </div>

        {/* Arrows */}
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <button
            onClick={() => scrollBy(-1)}
            disabled={!canScrollLeft}
            aria-label={t('common.prev')}
            className={cn(
              'glass flex h-11 w-11 items-center justify-center rounded-full text-white transition-all active:scale-95',
              canScrollLeft ? 'opacity-100 hover:scale-110' : 'pointer-events-none opacity-30'
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => scrollBy(1)}
            disabled={!canScrollRight}
            aria-label={t('common.next')}
            className={cn(
              'glass flex h-11 w-11 items-center justify-center rounded-full text-white transition-all active:scale-95',
              canScrollRight ? 'opacity-100 hover:scale-110' : 'pointer-events-none opacity-30'
            )}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Full-bleed carousel */}
      <div
        ref={scrollerRef}
        className="no-scrollbar flex gap-6 overflow-x-auto pb-6 pl-6 pr-6"
        style={{ scrollSnapType: 'x mandatory', scrollPaddingLeft: '1.5rem' }}
        role="region"
        aria-label={t('home.title')}
      >
        {categories.map((c, i) => {
          const localized = localizeCategory(c);
          return (
            <div
              key={c.id}
              className="snap-start"
              style={{ scrollSnapAlign: 'start' }}
            >
              <Reveal delay={i * 0.06}>
                <CategoryCard
                  category={localized}
                  onHover={() => setActiveCategory(c.id)}
                  onOpen={onOpen}
                  videosLabel={t('home.videos')}
                />
              </Reveal>
            </div>
          );
        })}
        {/* Trailing spacer so last card isn't flush with scroll end */}
        <div className="w-6 shrink-0" aria-hidden="true" />
      </div>
    </section>
  );
}
