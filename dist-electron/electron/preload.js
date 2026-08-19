"use strict";
/**
 * Preload script — executed in a privileged context between Main and Renderer.
 *
 * Security rules enforced here:
 * - contextIsolation: true  (set in BrowserWindow webPreferences)
 * - nodeIntegration: false  (set in BrowserWindow webPreferences)
 * - Only exposes window.electronAPI via contextBridge.exposeInMainWorld
 * - No raw ipcRenderer exposed to the Renderer
 * - No Node.js fs, path, child_process, or OS APIs exposed
 * - All IPC goes through typed channel strings from IPC_CHANNELS
 */
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const channels_1 = require("./ipc/channels");
/**
 * Typed IPC invoke helper. Throws if the Main Process returns an error envelope.
 */
async function invoke(channel, payload) {
    const result = await electron_1.ipcRenderer.invoke(channel, payload);
    if (!result.success) {
        throw new Error(result.error.message);
    }
    return result.data;
}
const electronAPI = {
    isElectron: true,
    metadata: {
        analyze: (url) => invoke(channels_1.IPC_CHANNELS.METADATA_ANALYZE, { url })
    },
    download: {
        getAll: () => invoke(channels_1.IPC_CHANNELS.DOWNLOAD_GET_ALL),
        add: (item) => invoke(channels_1.IPC_CHANNELS.DOWNLOAD_ADD, { item }),
        start: (id) => invoke(channels_1.IPC_CHANNELS.DOWNLOAD_START, { id }),
        pause: (id) => invoke(channels_1.IPC_CHANNELS.DOWNLOAD_PAUSE, { id }),
        resume: (id) => invoke(channels_1.IPC_CHANNELS.DOWNLOAD_RESUME, { id }),
        cancel: (id) => invoke(channels_1.IPC_CHANNELS.DOWNLOAD_CANCEL, { id }),
        retry: (id) => invoke(channels_1.IPC_CHANNELS.DOWNLOAD_RETRY, { id }),
        remove: (id) => invoke(channels_1.IPC_CHANNELS.DOWNLOAD_REMOVE, { id }),
        reorder: (orderedIds) => invoke(channels_1.IPC_CHANNELS.DOWNLOAD_REORDER, { orderedIds }),
        // Event listeners for progress and state changes
        onProgress: (callback) => {
            const listener = (_event, data) => callback(data);
            electron_1.ipcRenderer.on(channels_1.IPC_EVENTS.DOWNLOAD_PROGRESS, listener);
            // Return unsubscribe function
            return () => electron_1.ipcRenderer.removeListener(channels_1.IPC_EVENTS.DOWNLOAD_PROGRESS, listener);
        },
        onStateChange: (callback) => {
            const listener = (_event, data) => callback(data);
            electron_1.ipcRenderer.on(channels_1.IPC_EVENTS.DOWNLOAD_STATE_CHANGE, listener);
            // Return unsubscribe function
            return () => electron_1.ipcRenderer.removeListener(channels_1.IPC_EVENTS.DOWNLOAD_STATE_CHANGE, listener);
        },
        openFolder: (path) => invoke(channels_1.IPC_CHANNELS.DOWNLOAD_OPEN_FOLDER, { path })
    },
    settings: {
        get: () => invoke(channels_1.IPC_CHANNELS.SETTINGS_GET),
        update: (settings) => invoke(channels_1.IPC_CHANNELS.SETTINGS_UPDATE, { settings }),
        reset: () => invoke(channels_1.IPC_CHANNELS.SETTINGS_RESET),
        selectDownloadFolder: () => invoke(channels_1.IPC_CHANNELS.SETTINGS_SELECT_DOWNLOAD_FOLDER)
    },
    window: {
        minimize: () => invoke(channels_1.IPC_CHANNELS.WINDOW_MINIMIZE),
        close: () => invoke(channels_1.IPC_CHANNELS.WINDOW_CLOSE)
    },
    history: {
        getAll: () => invoke(channels_1.IPC_CHANNELS.HISTORY_GET_ALL),
        add: (item) => invoke(channels_1.IPC_CHANNELS.HISTORY_ADD, { item }),
        remove: (id) => invoke(channels_1.IPC_CHANNELS.HISTORY_REMOVE, { id }),
        clear: () => invoke(channels_1.IPC_CHANNELS.HISTORY_CLEAR)
    },
    favorites: {
        getAll: () => invoke(channels_1.IPC_CHANNELS.FAVORITES_GET_ALL),
        add: (item) => invoke(channels_1.IPC_CHANNELS.FAVORITES_ADD, { item }),
        remove: (id) => invoke(channels_1.IPC_CHANNELS.FAVORITES_REMOVE, { id })
    },
    scheduler: {
        getAll: () => invoke(channels_1.IPC_CHANNELS.SCHEDULER_GET_ALL),
        create: (schedule) => invoke(channels_1.IPC_CHANNELS.SCHEDULER_CREATE, { schedule }),
        update: (schedule) => invoke(channels_1.IPC_CHANNELS.SCHEDULER_UPDATE, { schedule }),
        cancel: (id) => invoke(channels_1.IPC_CHANNELS.SCHEDULER_CANCEL, { id }),
        remove: (id) => invoke(channels_1.IPC_CHANNELS.SCHEDULER_REMOVE, { id }),
        tick: (now) => invoke(channels_1.IPC_CHANNELS.SCHEDULER_TICK, { now })
    }
};
electron_1.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
//# sourceMappingURL=preload.js.map