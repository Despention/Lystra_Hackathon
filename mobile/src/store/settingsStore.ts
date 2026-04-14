import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ThemeMode } from '../constants/themes';
import type { Language } from '../constants/translations';

export type CloudProvider = 'none' | 'anthropic' | 'openai';

interface SettingsState {
  serverUrl: string;
  language: Language;
  notificationsEnabled: boolean;
  theme: ThemeMode;
  // Cloud LLM
  cloudProvider: CloudProvider;
  cloudApiKey: string;
  cloudModel: string;
  _hasHydrated: boolean;
  setServerUrl: (url: string) => void;
  setLanguage: (lang: Language) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  setCloudProvider: (p: CloudProvider) => void;
  setCloudApiKey: (key: string) => void;
  setCloudModel: (model: string) => void;
  setHasHydrated: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      serverUrl: 'http://10.0.2.2:8001',
      language: 'ru',
      notificationsEnabled: true,
      theme: 'system',
      cloudProvider: 'none',
      cloudApiKey: '',
      cloudModel: '',
      _hasHydrated: false,
      setServerUrl: (serverUrl) => set({ serverUrl }),
      setLanguage: (language) => set({ language }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setTheme: (theme) => set({ theme }),
      setCloudProvider: (cloudProvider) => set({ cloudProvider }),
      setCloudApiKey: (cloudApiKey) => set({ cloudApiKey }),
      setCloudModel: (cloudModel) => set({ cloudModel }),
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
