"use strict";
/**
 * Service Resolver — Dual-mode factory.
 *
 * Returns Electron IPC Adapter implementations when running inside Electron
 * (window.electronAPI is defined by preload.ts via contextBridge).
 *
 * Returns Mock/Local Service implementations when running in:
 * - Web browser (npm run dev)
 * - Vitest (npm run test)
 *
 * No component or Zustand store should import service classes directly.
 * They must use these resolver functions instead so the correct implementation
 * is chosen at runtime.
 *
 * NOTE on SettingsService:
 * The SettingsService interface is synchronous (get/update/reset).
 * LocalStorageSettingsService satisfies this interface for Web/Vitest mode.
 * ElectronSettingsService throws on sync calls (IPC is async by nature).
 * Until the sync/async mismatch is resolved (see AI_HANDOFF.md), the settings
 * resolver always returns LocalStorageSettingsService regardless of environment.
 * This is the documented architectural trade-off for Phase 2 Foundation.
 *
 * NOTE on DownloadService:
 * In Mock mode: tick() drives progress simulation.
 * In Electron mode: progress comes from IPC events (onProgress, onStateChange).
 * ElectronDownloadService maintains a local cache updated by events.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isElectronEnvironment = isElectronEnvironment;
exports.resolveMetadataService = resolveMetadataService;
exports.resolveDownloadService = resolveDownloadService;
exports.resolveHistoryService = resolveHistoryService;
exports.resolveFavoritesService = resolveFavoritesService;
exports.resolveSchedulerService = resolveSchedulerService;
exports.resolveSettingsService = resolveSettingsService;
exports._resetServiceCache = _resetServiceCache;
exports._injectMetadataService = _injectMetadataService;
exports._injectDownloadService = _injectDownloadService;
exports._injectHistoryService = _injectHistoryService;
exports._injectFavoritesService = _injectFavoritesService;
exports._injectSchedulerService = _injectSchedulerService;
exports._injectSettingsService = _injectSettingsService;
const metadataService_1 = require("./metadataService");
const downloadService_1 = require("./downloadService");
const historyService_1 = require("./historyService");
const favoritesService_1 = require("./favoritesService");
const schedulerService_1 = require("./schedulerService");
const settingsService_1 = require("./settingsService");
const electronIpcAdapters_1 = require("./electronIpcAdapters");
// ─── Environment Detection ─────────────────────────────────────────────────
/**
 * Returns true when the renderer is running inside Electron and the preload
 * has successfully exposed window.electronAPI via contextBridge.
 */
function isElectronEnvironment() {
    return typeof window !== "undefined" && typeof window.electronAPI !== "undefined";
}
// ─── Singleton cache ───────────────────────────────────────────────────────
// Lazy singletons — one instance per runtime lifetime.
let _metadataService = null;
let _downloadService = null;
let _historyService = null;
let _favoritesService = null;
let _schedulerService = null;
let _settingsService = null;
// ─── Resolver functions ────────────────────────────────────────────────────
function resolveMetadataService() {
    if (!_metadataService) {
        _metadataService = isElectronEnvironment()
            ? new electronIpcAdapters_1.ElectronMetadataService()
            : new metadataService_1.MockMetadataService();
    }
    return _metadataService;
}
/**
 * DownloadService resolver.
 * In Electron mode: uses ElectronDownloadService with IPC event-driven progress.
 * In Web/Vitest mode: uses MockDownloadService with tick-based simulation.
 */
function resolveDownloadService() {
    if (!_downloadService) {
        _downloadService = isElectronEnvironment()
            ? new electronIpcAdapters_1.ElectronDownloadService()
            : new downloadService_1.MockDownloadService();
    }
    return _downloadService;
}
function resolveHistoryService() {
    if (!_historyService) {
        _historyService = isElectronEnvironment()
            ? new electronIpcAdapters_1.ElectronHistoryService()
            : new historyService_1.MockHistoryService();
    }
    return _historyService;
}
function resolveFavoritesService() {
    if (!_favoritesService) {
        _favoritesService = isElectronEnvironment()
            ? new electronIpcAdapters_1.ElectronFavoritesService()
            : new favoritesService_1.MockFavoritesService();
    }
    return _favoritesService;
}
function resolveSchedulerService() {
    if (!_schedulerService) {
        _schedulerService = isElectronEnvironment()
            ? new electronIpcAdapters_1.ElectronSchedulerService()
            : new schedulerService_1.MockSchedulerService();
    }
    return _schedulerService;
}
/**
 * SettingsService resolver.
 *
 * Phase 3.1 Update: Now returns ElectronSettingsService in Electron mode.
 * settingsStore has been updated to handle async operations.
 */
function resolveSettingsService() {
    if (!_settingsService) {
        _settingsService = isElectronEnvironment()
            ? new electronIpcAdapters_1.ElectronSettingsService()
            : new settingsService_1.LocalStorageSettingsService();
    }
    return _settingsService;
}
// ─── Test utilities ────────────────────────────────────────────────────────
/**
 * Reset all cached service singletons.
 * USE ONLY IN TESTS — allows injecting fresh mocks between test cases.
 */
function _resetServiceCache() {
    _metadataService = null;
    _downloadService = null;
    _historyService = null;
    _favoritesService = null;
    _schedulerService = null;
    _settingsService = null;
}
/**
 * Override cached service instances.
 * USE ONLY IN TESTS — allows injecting controlled mocks.
 */
function _injectMetadataService(s) { _metadataService = s; }
function _injectDownloadService(s) { _downloadService = s; }
function _injectHistoryService(s) { _historyService = s; }
function _injectFavoritesService(s) { _favoritesService = s; }
function _injectSchedulerService(s) { _schedulerService = s; }
function _injectSettingsService(s) { _settingsService = s; }
//# sourceMappingURL=serviceResolver.js.map