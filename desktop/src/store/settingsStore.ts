import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ThemeMode } from '../constants/themes';
import type { Language } from '../constants/translations';

interface SettingsState {
  serverUrl: string;
  language: Language;
  notificationsEnabled: boolean;
  theme: ThemeMode;
  setServerUrl: (url: string) => void;
  setLanguage: (lang: Language) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      serverUrl: 'http://localhost:8001',
      language: 'ru',
      notificationsEnabled: true,
      theme: 'system',
      setServerUrl: (serverUrl) => set({ serverUrl }),
      setLanguage: (language) => set({ language }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'tz-analyzer-settings',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
