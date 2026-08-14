/**
 * NativeSettingsService — Main Process settings boundary with persistent storage.
 *
 * Phase 3.1: Persistent storage using fs-based JSON files.
 * Settings are stored in %APPDATA%/remon-download/settings.json
 *
 * The interface is async (unlike the Renderer-facing SettingsService which is sync)
 * because the Main Process uses async I/O.
 */
import { DEFAULT_SETTINGS } from '../../src/constants/settings';
import type { AppSettings } from '../../src/types/settings';
import { readJsonFile, writeJsonFile } from '../utils/fileStorage';

interface SettingsFileFormat {
  version: string;
  data: AppSettings;
}

export class NativeSettingsService {
  private settings: AppSettings = { ...DEFAULT_SETTINGS };
  private readonly SETTINGS_FILE = 'settings.json';
  private readonly FILE_VERSION = '1.0.0';

  /**
   * Initialize service by loading settings from disk
   * Must be called after construction
   */
  async initialize(): Promise<void> {
    const fileData = await readJsonFile<SettingsFileFormat>(
      this.SETTINGS_FILE,
      {
        version: this.FILE_VERSION,
        data: DEFAULT_SETTINGS,
      }
    );

    this.settings = fileData.data;
  }

  /**
   * Persist current settings to disk
   */
  private async persist(): Promise<void> {
    await writeJsonFile<SettingsFileFormat>(this.SETTINGS_FILE, {
      version: this.FILE_VERSION,
      data: this.settings,
    });
  }

  async get(): Promise<AppSettings> {
    return { ...this.settings };
  }

  async update(patch: Partial<AppSettings>): Promise<AppSettings> {
    this.settings = { ...this.settings, ...patch };
    await this.persist();
    return { ...this.settings };
  }

  async reset(): Promise<AppSettings> {
    this.settings = { ...DEFAULT_SETTINGS };
    await this.persist();
    return { ...this.settings };
  }
}
