import { Globe } from 'lucide-react';
import { useI18n, type Locale, LOCALES } from './I18nContext';
import { cn } from '@/lib/utils';

const LABEL: Record<Locale, string> = {
  ru: 'RU',
  en: 'EN',
};

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();

  if (compact) {
    return (
      <div
        role="group"
        aria-label={t('common.language')}
        className="flex items-center gap-1 rounded-full glass px-1 py-1"
      >
        {LOCALES.map((l) => (
          <button
            key={l}
            onClick={() => setLocale(l)}
            aria-label={t(l === 'ru' ? 'common.russian' : 'common.english')}
            aria-pressed={locale === l}
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
              locale === l
                ? 'bg-[rgb(var(--accent-glow)/0.4)] text-white'
                : 'text-white/55 hover:text-white'
            )}
          >
            {LABEL[l]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={t('common.language')}
      className="flex items-center gap-2 rounded-xl glass px-3 py-2"
    >
      <Globe className="h-4 w-4 text-white/55" />
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="bg-transparent text-sm text-white outline-none"
        aria-label={t('common.language')}
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} className="bg-[rgb(var(--surface))] text-white">
            {LABEL[l]} — {t(l === 'ru' ? 'common.russian' : 'common.english')}
          </option>
        ))}
      </select>
    </div>
  );
}
