"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerIpcHandlers = registerIpcHandlers;
const electron_1 = require("electron");
const channels_1 = require("./channels");
const nativeMetadataService_1 = require("../services/nativeMetadataService");
const nativeDownloadService_1 = require("../services/nativeDownloadService");
const nativeSettingsService_1 = require("../services/nativeSettingsService");
const nativeSchedulerService_1 = require("../services/nativeSchedulerService");
const nativeHistoryService_1 = require("../services/nativeHistoryService");
const nativeFavoritesService_1 = require("../services/nativeFavoritesService");
const nativeNotificationService_1 = require("../services/nativeNotificationService");
const tray_1 = require("../tray");
function wrapSuccess(data) {
    return { success: true, data };
}
function wrapError(err) {
    const message = err instanceof Error ? err.message : String(err);
    const errorModel = {
        code: "unknown",
        message,
        recoverable: true
    };
    return { success: false, error: errorModel };
}
function registerIpcHandlers(options = {}) {
    const settingsService = new nativeSettingsService_1.NativeSettingsService();
    const historyService = new nativeHistoryService_1.NativeHistoryService();
    const favoritesService = new nativeFavoritesService_1.NativeFavoritesService();
    const schedulerService = options.schedulerService ?? new nativeSchedulerService_1.NativeSchedulerService();
    let notificationService = null;
    // Initialize services with persistent storage
    const initServices = async () => {
        try {
            await settingsService.initialize();
            console.log('[IPC] NativeSettingsService initialized');
        }
        catch (err) {
            console.error('[IPC] Failed to initialize NativeSettingsService:', err);
        }
        try {
            await historyService.initialize();
            console.log('[IPC] NativeHistoryService initialized');
        }
        catch (err) {
            console.error('[IPC] Failed to initialize NativeHistoryService:', err);
        }
        try {
            await favoritesService.initialize();
            console.log('[IPC] NativeFavoritesService initialized');
        }
        catch (err) {
            console.error('[IPC] Failed to initialize NativeFavoritesService:', err);
        }
        try {
            await schedulerService.initialize();
            console.log('[IPC] NativeSchedulerService initialized');
        }
        catch (err) {
            console.error('[IPC] Failed to initialize NativeSchedulerService:', err);
        }
    };
    // Initialize on startup
    void initServices();
    // Initialize NativeDownloadService with settings (async)
    let downloadService = null;
    let downloadServiceReady = false;
    const downloadItems = new Map();
    let startQueuedDownloadsPromise = Promise.resolve();
    const startQueuedDownloads = async () => {
        const service = await ensureDownloadService();
        const settings = await settingsService.get();
        const items = await service.getAll();
        const activeStatuses = ["downloading", "retrying", "merging", "converting"];
        let availableSlots = Math.max(0, settings.concurrentDownloads - items.filter((item) => activeStatuses.includes(item.status)).length);
        for (const item of items.sort((left, right) => left.order - right.order)) {
            if (availableSlots <= 0) {
                break;
            }
            if (item.status !== "queued") {
                continue;
            }
            try {
                await service.start(item.id);
                availableSlots -= 1;
            }
            catch (error) {
                console.error(`[IPC] Failed to auto-start queued download ${item.id}:`, error);
            }
        }
    };
    const queueAutoStart = () => {
        startQueuedDownloadsPromise = startQueuedDownloadsPromise
            .then(() => startQueuedDownloads())
            .catch((error) => {
            console.error("[IPC] Failed to start queued downloads:", error);
        });
    };
    const initDownloadService = async () => {
        try {
            const settings = await settingsService.get();
            downloadService = new nativeDownloadService_1.NativeDownloadService(settings);
            options.onDownloadServiceReady?.(downloadService);
            notificationService = notificationService ?? new nativeNotificationService_1.NativeNotificationService(settings);
            options.onNotificationServiceReady?.(notificationService);
            downloadServiceReady = true;
            // Forward download progress events to Renderer
            downloadService.on("download:progress", (payload) => {
                const windows = electron_1.BrowserWindow.getAllWindows();
                windows.forEach((win) => {
                    win.webContents.send(channels_1.IPC_EVENTS.DOWNLOAD_PROGRESS, payload);
                });
            });
            // Forward download state change events to Renderer
            downloadService.on("download:state-change", (payload) => {
                const cachedItem = downloadItems.get(payload.id);
                if (cachedItem) {
                    downloadItems.set(payload.id, {
                        ...cachedItem,
                        status: payload.status,
                        progress: payload.progress,
                        downloadedSize: payload.downloadedSize,
                        fileSize: payload.fileSize ?? cachedItem.fileSize,
                        speed: payload.speed,
                        eta: payload.eta,
                        errorMessage: payload.errorMessage,
                        errorCode: payload.errorCode,
                        lastUpdatedAt: Date.now()
                    });
                }
                const windows = electron_1.BrowserWindow.getAllWindows();
                windows.forEach((win) => {
                    win.webContents.send(channels_1.IPC_EVENTS.DOWNLOAD_STATE_CHANGE, payload);
                });
                const item = downloadItems.get(payload.id);
                if (item) {
                    notificationService?.handleDownloadStateChange(payload, item);
                }
                else {
                    void downloadService?.getAll().then((items) => {
                        const uncachedItem = items.find((downloadItem) => downloadItem.id === payload.id);
                        if (uncachedItem) {
                            notificationService?.handleDownloadStateChange(payload, uncachedItem);
                            return;
                        }
                        console.warn(`[IPC] Download notification skipped; item not found: ${payload.id}`);
                    }).catch((error) => {
                        console.error(`[IPC] Failed to load download for notification: ${payload.id}`, error);
                    });
                }
            });
        }
        catch (err) {
            console.error("Failed to initialize NativeDownloadService:", err);
        }
    };
    // Initialize on first call
    void initDownloadService();
    // Helper to ensure downloadService is ready
    const ensureDownloadService = async () => {
        if (!downloadServiceReady || !downloadService) {
            await initDownloadService();
            if (!downloadService) {
                throw new Error("Failed to initialize download service");
            }
        }
        return downloadService;
    };
    // Metadata - creates new instance per request to use latest settings
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.METADATA_ANALYZE, async (_, { url }) => {
        try {
            const settings = await settingsService.get();
            const metadataService = new nativeMetadataService_1.NativeMetadataService(settings.ytdlpPath);
            const data = await metadataService.analyze(url);
            return wrapSuccess(data);
        }
        catch (err) {
            return wrapError(err);
        }
    });
    // Download
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.DOWNLOAD_GET_ALL, async () => {
        try {
            const service = await ensureDownloadService();
            const data = await service.getAll();
            return wrapSuccess(data);
        }
        catch (err) {
            return wrapError(err);
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.DOWNLOAD_ADD, async (_, { item }) => {
        try {
            const service = await ensureDownloadService();
            const data = await service.add(item);
            downloadItems.set(data.id, data);
            queueAutoStart();
            return wrapSuccess(data);
        }
        catch (err) {
            return wrapError(err);
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.DOWNLOAD_START, async (_, { id }) => {
        try {
            const service = await ensureDownloadService();
            const data = await service.start(id);
            return wrapSuccess(data);
        }
        catch (err) {
            return wrapError(err);
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.DOWNLOAD_PAUSE, async (_, { id }) => {
        try {
            const service = await ensureDownloadService();
            const data = await service.pause(id);
            return wrapSuccess(data);
        }
        catch (err) {
            return wrapError(err);
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.DOWNLOAD_RESUME, async (_, { id }) => {
        try {
            const service = await ensureDownloadService();
            const data = await service.resume(id);
            return wrapSuccess(data);
        }
        catch (err) {
            return wrapError(err);
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.DOWNLOAD_CANCEL, async (_, { id }) => {
        try {
            const service = await ensureDownloadService();
            const data = await service.cancel(id);
            return wrapSuccess(data);
        }
        catch (err) {
            return wrapError(err);
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.DOWNLOAD_RETRY, async (_, { id }) => {
        try {
            const service = await ensureDownloadService();
            const data = await service.retry(id);
            return wrapSuccess(data);
        }
        catch (err) {
            return wrapError(err);
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.DOWNLOAD_REMOVE, async (_, { id }) => {
        try {
            const service = await ensureDownloadService();
            const data = await service.remove(id);
            downloadItems.delete(id);
            return wrapSuccess(data);
        }
        catch (err) {
            return wrapError(err);
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.DOWNLOAD_REORDER, async (_, { orderedIds }) => {
        try {
            const service = await ensureDownloadService();
            const data = await service.reorder(orderedIds);
            return wrapSuccess(data);
        }
        catch (err) {
            return wrapError(err);
        }
    });
    // Settings
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.SETTINGS_GET, async () => {
        try {
            const data = await settingsService.get();
            return wrapSuccess(data);
        }
        catch (err) {
            return wrapError(err);
        }
    });
    // SETTINGS_UPDATE handler already defined above (with downloadService.updateSettings)
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.SETTINGS_UPDATE, async (_, { settings }) => {
        try {
            const data = await settingsService.update(settings);
            if (downloadService) {
                downloadService.updateSettings(data);
            }
            notificationService?.updateSettings(data);
            return wrapSuccess(data);
        }
        catch (err) {
            return wrapError(err);
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.SETTINGS_RESET, async () => {
        try {
            const data = await settingsService.reset();
            if (downloadService) {
                downloadService.updateSettings(data);
            }
            notificationService?.updateSettings(data);
            return wrapSuccess(data);
        }
        catch (err) {
            return wrapError(err);
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.WINDOW_MINIMIZE, async () => {
        const focusedWindow = electron_1.BrowserWindow.getFocusedWindow();
        if (focusedWindow) {
            focusedWindow.minimize();
        }
        return wrapSuccess(undefined);
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.WINDOW_CLOSE, async () => {
        const focusedWindow = electron_1.BrowserWindow.getFocusedWindow();
        if (focusedWindow) {
            (0, tray_1.hideWindow)(focusedWindow);
        }
        return wrapSuccess(undefined);
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.SETTINGS_SELECT_DOWNLOAD_FOLDER, async () => {
        try {
            const focusedWindow = electron_1.BrowserWindow.getFocusedWindow();
            const result = await electron_1.dialog.showOpenDialog(focusedWindow || new electron_1.BrowserWindow(), {
                properties: ["openDirectory"]
            });
            if (result.canceled || result.filePaths.length === 0) {
                return wrapSuccess(null);
            }
            const folderPath = result.filePaths[0];
            // Update settings with the new download folder
            const updatedSettings = await settingsService.update({ downloadFolder: folderPath });
            if (downloadService) {
                downloadService.updateSettings(updatedSettings);
            }
            return wrapSuccess(folderPath);
        }
        catch (err) {
            return wrapError(err);
        }
    });
    function resolveDownloadFolderPath(folderPath) {
        if (!folderPath || folderPath.trim() === "") {
            return electron_1.app.getPath("downloads");
        }
        if (folderPath === "~") {
            return electron_1.app.getPath("home");
        }
        if (folderPath.startsWith("~/")) {
            return `${electron_1.app.getPath("home")}${folderPath.slice(1)}`;
        }
        if (folderPath.startsWith("~\\")) {
            return `${electron_1.app.getPath("home")}${folderPath.slice(1)}`;
        }
        return folderPath;
    }
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.DOWNLOAD_OPEN_FOLDER, async (_, { path }) => {
        try {
            const folderPath = resolveDownloadFolderPath(path ?? "");
            await electron_1.shell.openPath(folderPath);
            return wrapSuccess(undefined);
        }
        catch (err) {
            return wrapError(err);
        }
    });
    // History
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.HISTORY_GET_ALL, async () => {
        try {
            const data = await historyService.getAll();
            return wrapSuccess(data);
        }
        catch (err) {
            return wrapError(err);
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.HISTORY_ADD, async (_, { item }) => {
        try {
            const data = await historyService.add(item);
            return wrapSuccess(data);
        }
        catch (err) {
            return wrapError(err);
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.HISTORY_REMOVE, async (_, { id }) => {
        try {
            const data = await historyService.remove(id);
            return wrapSuccess(data);
        }
        catch (err) {
            return wrapError(err);
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.HISTORY_CLEAR, async () => {
        try {
            await historyService.clear();
            return wrapSuccess(undefined);
        }
        catch (err) {
            return wrapError(err);
        }
    });
    // Favorites
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.FAVORITES_GET_ALL, async () => {
        try {
            const data = await favoritesService.getAll();
            return wrapSuccess(data);
        }
        catch (err) {
            return wrapError(err);
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.FAVORITES_ADD, async (_, { item }) => {
        try {
            const data = await favoritesService.add(item);
            return wrapSuccess(data);
        }
        catch (err) {
            return wrapError(err);
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.FAVORITES_REMOVE, async (_, { id }) => {
        try {
            const data = await favoritesService.remove(id);
            return wrapSuccess(data);
        }
        catch (err) {
            return wrapError(err);
        }
    });
    // Scheduler
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.SCHEDULER_GET_ALL, async () => {
        try {
            const data = await schedulerService.getAll();
            return wrapSuccess(data);
        }
        catch (err) {
            return wrapError(err);
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.SCHEDULER_CREATE, async (_, { schedule }) => {
        try {
            const data = await schedulerService.create(schedule);
            return wrapSuccess(data);
        }
        catch (err) {
            return wrapError(err);
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.SCHEDULER_UPDATE, async (_, { schedule }) => {
        try {
            const data = await schedulerService.update(schedule);
            return wrapSuccess(data);
        }
        catch (err) {
            return wrapError(err);
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.SCHEDULER_CANCEL, async (_, { id }) => {
        try {
            const data = await schedulerService.cancel(id);
            return wrapSuccess(data);
        }
        catch (err) {
            return wrapError(err);
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.SCHEDULER_REMOVE, async (_, { id }) => {
        try {
            const data = await schedulerService.remove(id);
            return wrapSuccess(data);
        }
        catch (err) {
            return wrapError(err);
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.SCHEDULER_TICK, async (_, { now }) => {
        try {
            const data = await schedulerService.tick(now);
            const settings = await settingsService.get();
            notificationService = notificationService ?? new nativeNotificationService_1.NativeNotificationService(settings);
            notificationService.updateSettings(settings);
            data.triggered.forEach(({ schedule, metadata }) => {
                notificationService?.notifyScheduledDownload(schedule, metadata);
            });
            return wrapSuccess(data);
        }
        catch (err) {
            return wrapError(err);
        }
    });
}
//# sourceMappingURL=handlers.js.map