"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsService = exports.LocalStorageSettingsService = void 0;
const zod_1 = require("zod");
const settings_1 = require("../constants/settings");
const STORAGE_KEY = "remon-download-settings";
const settingsSchema = zod_1.z.object({
    downloadFolder: zod_1.z.string(),
    startWithWindows: zod_1.z.boolean(),
    minimizeToTray: zod_1.z.boolean(),
    appearance: zod_1.z.enum(["light", "dark", "system"]),
    language: zod_1.z.enum(["ar", "en"]),
    concurrentDownloads: zod_1.z.union([
        zod_1.z.literal(1),
        zod_1.z.literal(2),
        zod_1.z.literal(3),
        zod_1.z.literal(4),
        zod_1.z.literal(5),
        zod_1.z.literal(10)
    ]),
    speedLimit: zod_1.z.union([zod_1.z.number().positive(), zod_1.z.literal("unlimited")]),
    defaultQuality: zod_1.z.string(),
    defaultVideoFormat: zod_1.z.string(),
    defaultAudioFormat: zod_1.z.string(),
    enableNotifications: zod_1.z.boolean(),
    notificationWhenCompleted: zod_1.z.boolean(),
    notificationWhenFailed: zod_1.z.boolean(),
    clipboardMonitoring: zod_1.z.boolean(),
    askBeforeDownloading: zod_1.z.boolean(),
    fileNameTemplate: zod_1.z.string(),
    ytdlpPath: zod_1.z.string(),
    ffmpegPath: zod_1.z.string(),
    proxy: zod_1.z.string()
});
class LocalStorageSettingsService {
    get() {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return settings_1.DEFAULT_SETTINGS;
        }
        try {
            const parsed = JSON.parse(raw);
            return settingsSchema.parse({ ...settings_1.DEFAULT_SETTINGS, ...parsed });
        }
        catch {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings_1.DEFAULT_SETTINGS));
            return settings_1.DEFAULT_SETTINGS;
        }
    }
    update(settings) {
        const nextSettings = settingsSchema.parse({ ...this.get(), ...settings });
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
        return nextSettings;
    }
    reset() {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings_1.DEFAULT_SETTINGS));
        return settings_1.DEFAULT_SETTINGS;
    }
}
exports.LocalStorageSettingsService = LocalStorageSettingsService;
exports.settingsService = new LocalStorageSettingsService();
//# sourceMappingURL=settingsService.js.map