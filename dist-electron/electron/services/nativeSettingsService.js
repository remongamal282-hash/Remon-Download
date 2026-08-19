"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativeSettingsService = void 0;
/**
 * NativeSettingsService — Main Process settings boundary with persistent storage.
 *
 * Phase 3.1: Persistent storage using fs-based JSON files.
 * Settings are stored in %APPDATA%/remon-download/settings.json
 *
 * Implements the same lazy-initialization pattern as NativeFavoritesService:
 * - initializationPromise guard (idempotent)
 * - merge loaded settings with DEFAULT_SETTINGS (handles missing keys gracefully)
 * - isSettingsFileFormat type guard
 * - persist() after update/reset
 *
 * The interface is async (unlike the Renderer-facing SettingsService which is sync)
 * because the Main Process uses async I/O.
 */
const settings_1 = require("../../src/constants/settings");
const fileStorage_1 = require("../utils/fileStorage");
function isSettingsFileFormat(value) {
    return (!!value &&
        typeof value === 'object' &&
        'data' in value &&
        !!value.data &&
        typeof value.data === 'object');
}
/**
 * Merge loaded settings with DEFAULT_SETTINGS.
 * Any keys missing from disk (e.g., new keys added in newer versions)
 * are filled in from defaults, preventing runtime errors.
 */
function mergeWithDefaults(loaded) {
    return { ...settings_1.DEFAULT_SETTINGS, ...loaded };
}
class NativeSettingsService {
    constructor() {
        this.settings = { ...settings_1.DEFAULT_SETTINGS };
        this.SETTINGS_FILE = 'settings.json';
        this.FILE_VERSION = '1.0.0';
        this.initializationPromise = null;
    }
    /**
     * Initialize service by loading settings from disk.
     * Idempotent — multiple calls return the same promise.
     */
    async initialize() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }
        this.initializationPromise = (async () => {
            const fileData = await (0, fileStorage_1.readJsonFile)(this.SETTINGS_FILE, {
                version: this.FILE_VERSION,
                data: settings_1.DEFAULT_SETTINGS,
            });
            if (isSettingsFileFormat(fileData)) {
                // Merge with defaults to handle missing/new keys
                this.settings = mergeWithDefaults(fileData.data);
                return;
            }
            // Corrupted / legacy format — fall back to defaults
            this.settings = { ...settings_1.DEFAULT_SETTINGS };
        })();
        return this.initializationPromise;
    }
    /**
     * Ensure service is initialized before any operation.
     */
    async ensureInitialized() {
        if (!this.initializationPromise) {
            await this.initialize();
        }
        else {
            await this.initializationPromise;
        }
    }
    /**
     * Persist current settings to disk.
     */
    async persist() {
        await (0, fileStorage_1.writeJsonFile)(this.SETTINGS_FILE, {
            version: this.FILE_VERSION,
            data: this.settings,
        });
    }
    async get() {
        await this.ensureInitialized();
        return { ...this.settings };
    }
    async update(patch) {
        await this.ensureInitialized();
        this.settings = { ...this.settings, ...patch };
        await this.persist();
        return { ...this.settings };
    }
    async reset() {
        await this.ensureInitialized();
        this.settings = { ...settings_1.DEFAULT_SETTINGS };
        await this.persist();
        return { ...this.settings };
    }
}
exports.NativeSettingsService = NativeSettingsService;
//# sourceMappingURL=nativeSettingsService.js.map