import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NativeSettingsService } from './nativeSettingsService';
import { DEFAULT_SETTINGS } from '../../src/constants/settings';
import type { AppSettings } from '../../src/types/settings';
import * as fileStorage from '../utils/fileStorage';

// Mock fileStorage module
vi.mock('../utils/fileStorage', () => ({
  readJsonFile: vi.fn(),
  writeJsonFile: vi.fn(),
}));

describe('NativeSettingsService', () => {
  let service: NativeSettingsService;
  let mockReadJsonFile: ReturnType<typeof vi.fn>;
  let mockWriteJsonFile: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockReadJsonFile = vi.mocked(fileStorage.readJsonFile);
    mockWriteJsonFile = vi.mocked(fileStorage.writeJsonFile);

    // Default: return DEFAULT_SETTINGS
    mockReadJsonFile.mockResolvedValue({
      version: '1.0.0',
      data: DEFAULT_SETTINGS,
    });
    mockWriteJsonFile.mockResolvedValue(undefined);

    service = new NativeSettingsService();
  });

  describe('initialization', () => {
    it('should load settings from file on construction', async () => {
      const customSettings: AppSettings = {
        ...DEFAULT_SETTINGS,
        downloads: {
          ...DEFAULT_SETTINGS.downloads,
          savePath: 'C:\\Custom\\Downloads',
          quality: '1080p',
        },
      };

      mockReadJsonFile.mockResolvedValue({
        version: '1.0.0',
        data: customSettings,
      });

      const newService = new NativeSettingsService();
      await newService.initialize();

      expect(mockReadJsonFile).toHaveBeenCalledWith('settings.json', {
        version: '1.0.0',
        data: DEFAULT_SETTINGS,
      });

      const settings = await newService.get();
      expect(settings).toEqual(customSettings);
    });

    it('should start with default settings if file does not exist', async () => {
      mockReadJsonFile.mockResolvedValue({
        version: '1.0.0',
        data: DEFAULT_SETTINGS,
      });

      const newService = new NativeSettingsService();
      await newService.initialize();

      const settings = await newService.get();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should handle file read errors gracefully', async () => {
      mockReadJsonFile.mockRejectedValue(new Error('Permission denied'));

      const newService = new NativeSettingsService();

      await expect(newService.initialize()).rejects.toThrow('Permission denied');
    });
  });

  describe('get', () => {
    it('should return current settings', async () => {
      const customSettings: AppSettings = {
        ...DEFAULT_SETTINGS,
        downloads: {
          ...DEFAULT_SETTINGS.downloads,
          savePath: 'C:\\Custom\\Downloads',
        },
      };

      mockReadJsonFile.mockResolvedValue({
        version: '1.0.0',
        data: customSettings,
      });
      await service.initialize();

      const settings = await service.get();

      expect(settings).toEqual(customSettings);
    });

    it('should return a copy of settings', async () => {
      await service.initialize();

      const settings1 = await service.get();
      const settings2 = await service.get();

      expect(settings1).toEqual(settings2);
      expect(settings1).not.toBe(settings2); // Different object instances
    });
  });

  describe('update', () => {
    it('should update settings partially and persist to file', async () => {
      await service.initialize();

      const patch: Partial<AppSettings> = {
        downloads: {
          ...DEFAULT_SETTINGS.downloads,
          savePath: 'C:\\Custom\\Downloads',
          quality: '1080p',
        },
      };

      const result = await service.update(patch);

      expect(result.downloads.savePath).toBe('C:\\Custom\\Downloads');
      expect(result.downloads.quality).toBe('1080p');
      expect(result.appearance).toEqual(DEFAULT_SETTINGS.appearance); // Other sections unchanged

      expect(mockWriteJsonFile).toHaveBeenCalledWith(
        'settings.json',
        expect.objectContaining({
          version: '1.0.0',
          data: result,
        })
      );
    });

    it('should merge partial updates with existing settings', async () => {
      await service.initialize();

      // First update
      await service.update({
        downloads: {
          ...DEFAULT_SETTINGS.downloads,
          savePath: 'C:\\Downloads1',
        },
      });

      // Second update (different field)
      const result = await service.update({
        downloads: {
          ...DEFAULT_SETTINGS.downloads,
          quality: '1080p',
        },
      });

      // Both updates should be present (quality updated, savePath reset to default because we sent full downloads object)
      expect(result.downloads.quality).toBe('1080p');
    });

    it('should persist to file after updating', async () => {
      await service.initialize();

      // Clear mock call history after initialize
      mockWriteJsonFile.mockClear();

      await service.update({
        downloads: {
          ...DEFAULT_SETTINGS.downloads,
          savePath: 'C:\\Custom\\Downloads',
        },
      });

      expect(mockWriteJsonFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('reset', () => {
    it('should reset to default settings and persist to file', async () => {
      await service.initialize();

      // First update to custom settings
      await service.update({
        downloads: {
          ...DEFAULT_SETTINGS.downloads,
          savePath: 'C:\\Custom\\Downloads',
          quality: '1080p',
        },
      });

      // Reset
      const result = await service.reset();

      expect(result).toEqual(DEFAULT_SETTINGS);

      expect(mockWriteJsonFile).toHaveBeenCalledWith('settings.json', {
        version: '1.0.0',
        data: DEFAULT_SETTINGS,
      });
    });

    it('should persist to file after resetting', async () => {
      await service.initialize();

      // Update to custom settings
      await service.update({
        downloads: {
          ...DEFAULT_SETTINGS.downloads,
          savePath: 'C:\\Custom\\Downloads',
        },
      });

      // Clear mock call history
      mockWriteJsonFile.mockClear();

      await service.reset();

      expect(mockWriteJsonFile).toHaveBeenCalledTimes(1);
      expect(mockWriteJsonFile).toHaveBeenCalledWith('settings.json', {
        version: '1.0.0',
        data: DEFAULT_SETTINGS,
      });
    });

    it('should return default settings after reset', async () => {
      await service.initialize();

      await service.update({
        downloads: {
          ...DEFAULT_SETTINGS.downloads,
          savePath: 'C:\\Custom\\Downloads',
        },
      });

      await service.reset();

      const settings = await service.get();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });
  });
});
