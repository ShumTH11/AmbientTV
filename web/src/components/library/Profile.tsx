import { useState } from 'react';
import { LogOut, Heart, History as HistoryIcon, ListVideo, Sun, Moon, RotateCcw } from 'lucide-react';
import { useAppStore } from '@/store/AppStore';
import { useTheme } from '@/context/ThemeContext';
import { THEME_PRESETS } from '@/lib/theme-presets';
import { PageWrap } from '@/components/library/Shared';
import { useI18n } from '@/i18n/I18nContext';
import type { View } from '@/components/layout/Header';

const inputCls =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none placeholder-white/40 focus:border-[rgb(var(--accent-glow)/0.5)]';

function tabCls(active: boolean) {
  return `flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
    active ? 'bg-[rgb(var(--accent-glow)/0.35)] text-white' : 'glass text-white/70'
  }`;
}

function ThemeSettings() {
  const { userAccent, setUserAccent, mode, setMode } = useTheme();
  const { t } = useI18n();
  return (
    <div className="glass-strong mt-6 rounded-3xl p-6">
      <h3 className="font-display text-lg font-bold text-white">{t('profile.theme')}</h3>
      <p className="mt-1 text-sm text-[rgb(var(--ink-soft))]">
        {t('profile.accent')}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={() => setUserAccent(null)}
          aria-label={t('profile.resetAccent')}
          aria-pressed={userAccent === null}
          className="flex h-10 items-center gap-2 rounded-full glass px-3 text-sm transition-transform hover:scale-105"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t('profile.resetAccent')}
        </button>
        {Object.entries(THEME_PRESETS).map(([id, p]) => (
          <button
            key={id}
            onClick={() => setUserAccent(id)}
            aria-label={`${t('profile.accent')}: ${id}`}
            aria-pressed={userAccent === id}
            title={id}
            className="h-10 w-10 rounded-full border-2 transition-transform hover:scale-110"
            style={{
              background: `rgb(${p.glow})`,
              borderColor: userAccent === id ? 'rgb(var(--ink))' : 'transparent',
            }}
          />
        ))}
      </div>
      <div className="mt-5 flex items-center gap-2">
        <span className="text-sm text-[rgb(var(--ink-soft))]">{t('profile.theme')}:</span>
        <button
          onClick={() => setMode('dark')}
          aria-pressed={mode === 'dark'}
          aria-label={t('profile.dark')}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ${
            mode === 'dark' ? 'bg-[rgb(var(--accent-glow)/0.35)] text-white' : 'glass text-white/70'
          }`}
        >
          <Moon className="h-4 w-4" /> {t('profile.dark')}
        </button>
        <button
          onClick={() => setMode('light')}
          aria-pressed={mode === 'light'}
          aria-label={t('profile.light')}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ${
            mode === 'light' ? 'bg-[rgb(var(--accent-glow)/0.35)] text-white' : 'glass text-white/70'
          }`}
        >
          <Sun className="h-4 w-4" /> {t('profile.light')}
        </button>
      </div>
    </div>
  );
}

export function Profile({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { t } = useI18n();
  const { user, login, serverLogin, serverRegister, serverLogout, favorites, history, playlists } =
    useAppStore();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) {
    const submit = async () => {
      setError(null);
      if (!email.trim() || !password) {
        setError(`${t('profile.email')} & ${t('profile.password')}`);
        return;
      }
      if (mode === 'register' && !name.trim()) {
        setError(t('profile.name'));
        return;
      }
      setBusy(true);
      try {
        if (mode === 'register') await serverRegister(email.trim(), name.trim(), password);
        else await serverLogin(email.trim(), password);
      } catch (e) {
        setError(e instanceof Error ? e.message : t('toast.error'));
      } finally {
        setBusy(false);
      }
    };

    const demo = () => {
      if (!name.trim() && !email.trim()) {
        setError(t('profile.name'));
        return;
      }
      login(email.trim() || name.trim(), name.trim() || email.trim());
    };

    return (
      <PageWrap
        title={t('profile.title')}
        icon="👤"
        desc={t('profile.syncedHint')}
      >
        <div className="glass-strong mx-auto mt-4 max-w-md rounded-3xl p-8">
          <div className="mb-4 flex gap-2">
            <button onClick={() => setMode('login')} aria-pressed={mode === 'login'} className={tabCls(mode === 'login')}>
              {t('profile.login')}
            </button>
            <button
              onClick={() => setMode('register')}
              aria-pressed={mode === 'register'}
              className={tabCls(mode === 'register')}
            >
              {t('profile.register')}
            </button>
          </div>
          <div className="space-y-3">
            {mode === 'register' && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('profile.nameOptional')}
                className={inputCls}
              />
            )}
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('profile.email')}
              type="email"
              autoComplete="email"
              className={inputCls}
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('profile.password')}
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className={inputCls}
            />
            {error && <p className="text-sm text-rose-300">{error}</p>}
            <button
              onClick={submit}
              disabled={busy}
              className="w-full rounded-xl bg-gradient-to-r from-[rgb(var(--accent-glow))] to-[rgb(var(--accent))] px-5 py-3 font-semibold text-white shadow-glow disabled:opacity-60"
            >
              {busy ? t('common.loading') : mode === 'register' ? t('profile.register') : t('profile.login')}
            </button>
            <button
              onClick={demo}
              className="w-full rounded-xl glass px-5 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10"
            >
              {t('profile.demoLogin')}
            </button>
          </div>
        </div>
        <ThemeSettings />
      </PageWrap>
    );
  }

  const stats = [
    { label: t('profile.favorites'), value: favorites.length, icon: <Heart className="h-5 w-5" />, view: 'favorites' as View },
    { label: t('profile.viewed'), value: history.length, icon: <HistoryIcon className="h-5 w-5" />, view: 'history' as View },
    { label: t('profile.playlists'), value: playlists.length, icon: <ListVideo className="h-5 w-5" />, view: 'playlists' as View },
  ];

  return (
    <PageWrap
      title={user.name}
      icon="👤"
      desc={
        <span className="flex items-center gap-2">
          {user.email}
          {user.server && (
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">
              {t('profile.synced')}
            </span>
          )}
        </span>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <button
            key={s.view}
            onClick={() => onNavigate(s.view)}
            className="glass flex items-center gap-4 rounded-2xl p-5 text-left transition-transform hover:scale-[1.02]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgb(var(--accent-glow)/0.3)] text-[rgb(var(--accent))]">
              {s.icon}
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-sm text-[rgb(var(--ink-soft))]">{s.label}</div>
            </div>
          </button>
        ))}
      </div>
      <button
        onClick={() => serverLogout()}
        className="mt-8 flex items-center gap-2 rounded-xl glass px-5 py-3 text-white transition-colors hover:bg-rose-500/20"
      >
        <LogOut className="h-4 w-4" /> {t('profile.logout')}
      </button>
      <ThemeSettings />
    </PageWrap>
  );
}
