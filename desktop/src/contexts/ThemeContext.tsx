import React, { createContext, useContext, useEffect, useState } from 'react';
import { applyTheme, darkTheme, lightTheme, type Theme } from '../constants/themes';
import { useSettingsStore } from '../store/settingsStore';
import { translations } from '../constants/translations';
import type { TranslationKey } from '../constants/translations';

const ThemeContext = createContext<Theme>(lightTheme);

function useSystemDarkMode(): boolean {
  const [isDark, setIsDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isDark;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore((s) => s.theme);
  const systemIsDark = useSystemDarkMode();

  const activeTheme =
    theme === 'system'
      ? systemIsDark
        ? darkTheme
        : lightTheme
      : theme === 'dark'
        ? darkTheme
        : lightTheme;

  useEffect(() => {
    applyTheme(activeTheme);
  }, [activeTheme]);

  return (
    <ThemeContext.Provider value={activeTheme}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

export function useTranslation() {
  const language = useSettingsStore((s) => s.language);
  const t = translations[language];
  return (key: TranslationKey) => t[key] as string;
}
