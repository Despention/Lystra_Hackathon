import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme, type Theme } from '../constants/themes';
import { useSettingsStore } from '../store/settingsStore';
import { translations } from '../constants/translations';
import type { TranslationKey } from '../constants/translations';

const ThemeContext = createContext<Theme>(lightTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore((s) => s.theme);
  const systemScheme = useColorScheme();

  const activeTheme =
    theme === 'system'
      ? systemScheme === 'dark'
        ? darkTheme
        : lightTheme
      : theme === 'dark'
        ? darkTheme
        : lightTheme;

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
