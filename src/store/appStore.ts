import { create } from "zustand";
import { initializeDatabase } from "@/services/database/database";
import { loadSettings, saveSettings } from "@/services/settings/settingsStorage";
import { countLocalPhotos } from "@/repositories/photoRepository";
import type { AppSettings } from "@/types/settings";

type AppState = {
  initialized: boolean;
  initializationError: string | null;
  settings: AppSettings | null;
  localPhotoCount: number;
  initialize: () => Promise<void>;
  refreshLocalPhotoCount: () => Promise<void>;
  updateSettings: (settings: AppSettings) => Promise<void>;
};

export const useAppStore = create<AppState>((set, get) => ({
  initialized: false,
  initializationError: null,
  settings: null,
  localPhotoCount: 0,
  initialize: async () => {
    try {
      await initializeDatabase();
      const settings = await loadSettings();
      const localPhotoCount = await countLocalPhotos();
      set({ initialized: true, initializationError: null, settings, localPhotoCount });
    } catch (error: unknown) {
      set({
        initialized: true,
        initializationError: error instanceof Error ? error.message : String(error)
      });
    }
  },
  refreshLocalPhotoCount: async () => {
    const localPhotoCount = await countLocalPhotos();
    set({ localPhotoCount });
  },
  updateSettings: async (settings) => {
    await saveSettings(settings);
    set({ settings });
    await get().refreshLocalPhotoCount();
  }
}));
