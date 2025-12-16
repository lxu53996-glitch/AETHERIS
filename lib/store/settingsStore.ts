import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type AIProvider = 'cloud' | 'local';

interface SettingsState {
  // State
  aiProvider: AIProvider;
  ollamaUrl: string;
  localModel: string;
  
  // Actions
  setAIProvider: (provider: AIProvider) => void;
  setOllamaUrl: (url: string) => void;
  setLocalModel: (model: string) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS = {
  aiProvider: 'cloud' as AIProvider,
  ollamaUrl: 'http://127.0.0.1:11434',
  localModel: 'llama3',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Initial state
      ...DEFAULT_SETTINGS,
      
      // Actions
      setAIProvider: (provider) => set({ aiProvider: provider }),
      setOllamaUrl: (url) => set({ ollamaUrl: url }),
      setLocalModel: (model) => set({ localModel: model }),
      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'aetheris-settings', // localStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
);
