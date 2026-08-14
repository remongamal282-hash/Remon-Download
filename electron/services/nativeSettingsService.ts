/**
 * NativeSettingsService — Main Process settings boundary.
 *
 * Phase 2 Foundation: Delegates to LocalStorageSettingsService as a bridge.
 * In Phase 2.x this will be replaced with electron-store or a JSON file
 * via Node.js fs, so settings persist across app restarts without browser storage.
 *
 * The interface is async here (unlike the Renderer-facing SettingsService which
 * is sync) because the Main Process will eventually use async I/O.
 */
import { DEFAULT_SETTINGS } from "../../src/constants/settings";
import type { AppSettings } from "../../src/types/settings";

export class NativeSettingsService {
  private settings: AppSettings = { ...DEFAULT_SETTINGS };

  async get(): Promise<AppSettings> {
    return { ...this.settings };
  }

  async update(patch: Partial<AppSettings>): Promise<AppSettings> {
    this.settings = { ...this.settings, ...patch };
    return { ...this.settings };
  }

  async reset(): Promise<AppSettings> {
    this.settings = { ...DEFAULT_SETTINGS };
    return { ...this.settings };
  }
}
