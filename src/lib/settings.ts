/**
 * UI preferences (not business data, so they live outside the repository).
 * index.html reads the same key before React loads to avoid a flash of the wrong theme.
 */
export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_KEY = 'dayzero:theme';
const THEMES: readonly ThemePreference[] = ['system', 'light', 'dark'];

export function getThemePreference(): ThemePreference {
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    return THEMES.includes(value as ThemePreference) ? (value as ThemePreference) : 'system';
  } catch {
    return 'system';
  }
}

export function setThemePreference(theme: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage unavailable (private mode); the choice just won't persist.
  }
  applyTheme(theme);
}

export function applyTheme(theme: ThemePreference): void {
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  const dark = theme === 'dark' || (theme === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', dark);
}
