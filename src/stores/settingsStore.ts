import { create } from "zustand";
import i18n from "../i18n";
import { settingsService } from "../services/settingsService";
import type { AppSettings } from "../types/settings";

interface SettingsState {
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;
  reloadSettings: () => void;
}

export function applyDocumentPreferences(settings: AppSettings): void {
  document.documentElement.lang = settings.language;
  document.documentElement.dir = settings.language === "ar" ? "rtl" : "ltr";

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const useDark = settings.appearance === "dark" || (settings.appearance === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", useDark);
  void i18n.changeLanguage(settings.language);
}

const initialSettings = settingsService.get();

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: initialSettings,
  updateSettings: (settings) => {
    const nextSettings = settingsService.update(settings);
    applyDocumentPreferences(nextSettings);
    set({ settings: nextSettings });
  },
  resetSettings: () => {
    const nextSettings = settingsService.reset();
    applyDocumentPreferences(nextSettings);
    set({ settings: nextSettings });
  },
  reloadSettings: () => {
    const nextSettings = settingsService.get();
    applyDocumentPreferences(nextSettings);
    set({ settings: nextSettings });
  }
}));

export function initializeSettings(): void {
  applyDocumentPreferences(initialSettings);
}
