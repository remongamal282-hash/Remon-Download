"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const nativeSettingsService_1 = require("./nativeSettingsService");
const settings_1 = require("../../src/constants/settings");
const fileStorage = __importStar(require("../utils/fileStorage"));
// Mock fileStorage module
vitest_1.vi.mock('../utils/fileStorage', () => ({
    readJsonFile: vitest_1.vi.fn(),
    writeJsonFile: vitest_1.vi.fn(),
}));
(0, vitest_1.describe)('NativeSettingsService', () => {
    let service;
    let mockReadJsonFile;
    let mockWriteJsonFile;
    (0, vitest_1.beforeEach)(() => {
        mockReadJsonFile = vitest_1.vi.mocked(fileStorage.readJsonFile);
        mockWriteJsonFile = vitest_1.vi.mocked(fileStorage.writeJsonFile);
        // Default: return DEFAULT_SETTINGS wrapped in file format
        mockReadJsonFile.mockResolvedValue({
            version: '1.0.0',
            data: settings_1.DEFAULT_SETTINGS,
        });
        mockWriteJsonFile.mockResolvedValue(undefined);
        service = new nativeSettingsService_1.NativeSettingsService();
    });
    // ─── initialization ───────────────────────────────────────────────────────
    (0, vitest_1.describe)('initialization', () => {
        (0, vitest_1.it)('should load settings from file on initialize()', async () => {
            const customSettings = {
                ...settings_1.DEFAULT_SETTINGS,
                downloadFolder: 'C:\\Custom\\Downloads',
                defaultQuality: '1080p',
            };
            mockReadJsonFile.mockResolvedValue({
                version: '1.0.0',
                data: customSettings,
            });
            const newService = new nativeSettingsService_1.NativeSettingsService();
            await newService.initialize();
            (0, vitest_1.expect)(mockReadJsonFile).toHaveBeenCalledWith('settings.json', {
                version: '1.0.0',
                data: settings_1.DEFAULT_SETTINGS,
            });
            const settings = await newService.get();
            (0, vitest_1.expect)(settings.downloadFolder).toBe('C:\\Custom\\Downloads');
            (0, vitest_1.expect)(settings.defaultQuality).toBe('1080p');
        });
        (0, vitest_1.it)('should start with DEFAULT_SETTINGS if file does not exist', async () => {
            mockReadJsonFile.mockResolvedValue({
                version: '1.0.0',
                data: settings_1.DEFAULT_SETTINGS,
            });
            const newService = new nativeSettingsService_1.NativeSettingsService();
            await newService.initialize();
            const settings = await newService.get();
            (0, vitest_1.expect)(settings).toEqual(settings_1.DEFAULT_SETTINGS);
        });
        (0, vitest_1.it)('should merge missing keys from DEFAULT_SETTINGS (handles new settings added in upgrades)', async () => {
            // Simulate old settings file missing new keys
            const partialSettings = {
                downloadFolder: 'C:\\Old\\Downloads',
                language: 'ar',
            };
            mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: partialSettings });
            const newService = new nativeSettingsService_1.NativeSettingsService();
            await newService.initialize();
            const settings = await newService.get();
            // Known key from file is preserved
            (0, vitest_1.expect)(settings.downloadFolder).toBe('C:\\Old\\Downloads');
            (0, vitest_1.expect)(settings.language).toBe('ar');
            // New/missing keys filled from defaults
            (0, vitest_1.expect)(settings.concurrentDownloads).toBe(settings_1.DEFAULT_SETTINGS.concurrentDownloads);
            (0, vitest_1.expect)(settings.defaultQuality).toBe(settings_1.DEFAULT_SETTINGS.defaultQuality);
        });
        (0, vitest_1.it)('should fall back to DEFAULT_SETTINGS for corrupted/non-object JSON', async () => {
            // Non-{ version, data } structure
            mockReadJsonFile.mockResolvedValue('corrupted string');
            const newService = new nativeSettingsService_1.NativeSettingsService();
            await newService.initialize();
            const settings = await newService.get();
            (0, vitest_1.expect)(settings).toEqual(settings_1.DEFAULT_SETTINGS);
        });
        (0, vitest_1.it)('should handle file read errors by propagating', async () => {
            mockReadJsonFile.mockRejectedValue(new Error('Permission denied'));
            const newService = new nativeSettingsService_1.NativeSettingsService();
            await (0, vitest_1.expect)(newService.initialize()).rejects.toThrow('Permission denied');
        });
        (0, vitest_1.it)('should be idempotent — calling initialize() twice reads file only once', async () => {
            const newService = new nativeSettingsService_1.NativeSettingsService();
            mockReadJsonFile.mockClear();
            await newService.initialize();
            await newService.initialize();
            (0, vitest_1.expect)(mockReadJsonFile).toHaveBeenCalledTimes(1);
        });
        (0, vitest_1.it)('should lazy-initialize on first get() without explicit initialize()', async () => {
            const newService = new nativeSettingsService_1.NativeSettingsService();
            mockReadJsonFile.mockClear();
            const settings = await newService.get();
            (0, vitest_1.expect)(settings).toEqual(settings_1.DEFAULT_SETTINGS);
            (0, vitest_1.expect)(mockReadJsonFile).toHaveBeenCalledTimes(1);
        });
    });
    // ─── get ─────────────────────────────────────────────────────────────────
    (0, vitest_1.describe)('get', () => {
        (0, vitest_1.it)('should return current settings', async () => {
            const customSettings = {
                ...settings_1.DEFAULT_SETTINGS,
                downloadFolder: 'C:\\Custom\\Downloads',
            };
            mockReadJsonFile.mockResolvedValue({ version: '1.0.0', data: customSettings });
            await service.initialize();
            const settings = await service.get();
            (0, vitest_1.expect)(settings.downloadFolder).toBe('C:\\Custom\\Downloads');
        });
        (0, vitest_1.it)('should return a copy (not the same object reference)', async () => {
            await service.initialize();
            const s1 = await service.get();
            const s2 = await service.get();
            (0, vitest_1.expect)(s1).toEqual(s2);
            (0, vitest_1.expect)(s1).not.toBe(s2);
        });
    });
    // ─── update ───────────────────────────────────────────────────────────────
    (0, vitest_1.describe)('update', () => {
        (0, vitest_1.it)('should apply a partial patch and persist', async () => {
            await service.initialize();
            const result = await service.update({ downloadFolder: 'C:\\Custom\\Downloads', defaultQuality: '1080p' });
            (0, vitest_1.expect)(result.downloadFolder).toBe('C:\\Custom\\Downloads');
            (0, vitest_1.expect)(result.defaultQuality).toBe('1080p');
            // Un-patched keys remain unchanged
            (0, vitest_1.expect)(result.language).toBe(settings_1.DEFAULT_SETTINGS.language);
            (0, vitest_1.expect)(mockWriteJsonFile).toHaveBeenCalledWith('settings.json', vitest_1.expect.objectContaining({
                version: '1.0.0',
                data: result,
            }));
        });
        (0, vitest_1.it)('should accumulate multiple patches', async () => {
            await service.initialize();
            await service.update({ downloadFolder: 'C:\\Downloads1' });
            const result = await service.update({ defaultQuality: '1080p' });
            (0, vitest_1.expect)(result.downloadFolder).toBe('C:\\Downloads1');
            (0, vitest_1.expect)(result.defaultQuality).toBe('1080p');
        });
        (0, vitest_1.it)('should persist exactly once per update call', async () => {
            await service.initialize();
            mockWriteJsonFile.mockClear();
            await service.update({ downloadFolder: 'C:\\Custom\\Downloads' });
            (0, vitest_1.expect)(mockWriteJsonFile).toHaveBeenCalledTimes(1);
        });
    });
    // ─── reset ────────────────────────────────────────────────────────────────
    (0, vitest_1.describe)('reset', () => {
        (0, vitest_1.it)('should reset to DEFAULT_SETTINGS and persist', async () => {
            await service.initialize();
            await service.update({ downloadFolder: 'C:\\Custom\\Downloads', defaultQuality: '1080p' });
            const result = await service.reset();
            (0, vitest_1.expect)(result).toEqual(settings_1.DEFAULT_SETTINGS);
            (0, vitest_1.expect)(mockWriteJsonFile).toHaveBeenCalledWith('settings.json', {
                version: '1.0.0',
                data: settings_1.DEFAULT_SETTINGS,
            });
        });
        (0, vitest_1.it)('should persist exactly once per reset call', async () => {
            await service.initialize();
            await service.update({ downloadFolder: 'C:\\Custom\\Downloads' });
            mockWriteJsonFile.mockClear();
            await service.reset();
            (0, vitest_1.expect)(mockWriteJsonFile).toHaveBeenCalledTimes(1);
        });
        (0, vitest_1.it)('should return DEFAULT_SETTINGS from subsequent get() after reset', async () => {
            await service.initialize();
            await service.update({ downloadFolder: 'C:\\Custom\\Downloads' });
            await service.reset();
            const settings = await service.get();
            (0, vitest_1.expect)(settings).toEqual(settings_1.DEFAULT_SETTINGS);
        });
    });
});
//# sourceMappingURL=nativeSettingsService.test.js.map