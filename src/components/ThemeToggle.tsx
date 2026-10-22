import { useEffect, useState } from 'react';
import { applyTheme, getThemePreference, setThemePreference, type ThemePreference } from '../lib/settings';
import { Icon, type IconName } from './Icon';

const NEXT: Record<ThemePreference, ThemePreference> = { system: 'light', light: 'dark', dark: 'system' };
const ICONS: Record<ThemePreference, IconName> = { system: 'monitor', light: 'sun', dark: 'moon' };
const LABELS: Record<ThemePreference, string> = { system: 'System theme', light: 'Light theme', dark: 'Dark theme' };

export function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  const [theme, setTheme] = useState<ThemePreference>(getThemePreference);

  // Follow the OS setting live while in "system" mode.
  useEffect(() => {
    if (theme !== 'system') return;
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    media?.addEventListener('change', onChange);
    return () => media?.removeEventListener('change', onChange);
  }, [theme]);

  const cycle = () => {
    const next = NEXT[theme];
    setTheme(next);
    setThemePreference(next);
  };

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`${LABELS[theme]} (click to change)`}
      title={LABELS[theme]}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <Icon name={ICONS[theme]} />
      {showLabel && <span>{LABELS[theme]}</span>}
    </button>
  );
}
