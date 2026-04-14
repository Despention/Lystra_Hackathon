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
  setServerUrl: (url: string) => void;
  setLanguage: (lang: Language) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  setCloudProvider: (p: CloudProvider) => void;
  setCloudApiKey: (key: string) => void;
  setCloudModel: (model: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      serverUrl: 'http://localhost:8001',
      language: 'ru',
      notificationsEnabled: true,
      theme: 'dark',
      cloudProvider: 'none',
      cloudApiKey: '',
      cloudModel: '',
      setServerUrl: (serverUrl) => set({ serverUrl }),
      setLanguage: (language) => set({ language }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setTheme: (theme) => set({ theme }),
      setCloudProvider: (cloudProvider) => set({ cloudProvider }),
      setCloudApiKey: (cloudApiKey) => set({ cloudApiKey }),
      setCloudModel: (cloudModel) => set({ cloudModel }),
    }),
    {
      name: 'tz-analyzer-settings',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
