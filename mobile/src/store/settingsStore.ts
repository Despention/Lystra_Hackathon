import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ThemeMode } from '../constants/themes';
import type { Language } from '../constants/translations';

interface SettingsState {
  serverUrl: string;
  language: Language;
  notificationsEnabled: boolean;
  theme: ThemeMode;
  _hasHydrated: boolean;
  setServerUrl: (url: string) => void;
  setLanguage: (lang: Language) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  setHasHydrated: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      serverUrl: 'http://10.0.2.2:8001',
      language: 'ru',
      notificationsEnabled: true,
      theme: 'system',
      _hasHydrated: false,
      setServerUrl: (serverUrl) => set({ serverUrl }),
      setLanguage: (language) => set({ language }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setTheme: (theme) => set({ theme }),
      setHasHydrated: (_hasHydrated) => set({ _hasHydrated }),
    }),
    {
      name: 'tz-analyzer-settings',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
