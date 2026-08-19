"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPC_EVENTS = exports.IPC_CHANNELS = void 0;
exports.IPC_CHANNELS = {
    METADATA_ANALYZE: "metadata:analyze",
    DOWNLOAD_GET_ALL: "download:get-all",
    DOWNLOAD_ADD: "download:add",
    DOWNLOAD_START: "download:start",
    DOWNLOAD_PAUSE: "download:pause",
    DOWNLOAD_RESUME: "download:resume",
    DOWNLOAD_CANCEL: "download:cancel",
    DOWNLOAD_RETRY: "download:retry",
    DOWNLOAD_REMOVE: "download:remove",
    DOWNLOAD_REORDER: "download:reorder",
    SETTINGS_GET: "settings:get",
    SETTINGS_UPDATE: "settings:update",
    SETTINGS_RESET: "settings:reset",
    SETTINGS_SELECT_DOWNLOAD_FOLDER: "settings:select-download-folder",
    WINDOW_MINIMIZE: "window:minimize",
    WINDOW_CLOSE: "window:close",
    DOWNLOAD_OPEN_FOLDER: "download:open-folder",
    HISTORY_GET_ALL: "history:get-all",
    HISTORY_ADD: "history:add",
    HISTORY_REMOVE: "history:remove",
    HISTORY_CLEAR: "history:clear",
    FAVORITES_GET_ALL: "favorites:get-all",
    FAVORITES_ADD: "favorites:add",
    FAVORITES_REMOVE: "favorites:remove",
    SCHEDULER_GET_ALL: "scheduler:get-all",
    SCHEDULER_CREATE: "scheduler:create",
    SCHEDULER_UPDATE: "scheduler:update",
    SCHEDULER_CANCEL: "scheduler:cancel",
    SCHEDULER_REMOVE: "scheduler:remove",
    SCHEDULER_TICK: "scheduler:tick"
};
/**
 * IPC Event Channels (Main → Renderer push events, not request/response)
 */
exports.IPC_EVENTS = {
    DOWNLOAD_PROGRESS: "download:progress",
    DOWNLOAD_STATE_CHANGE: "download:state-change"
};
//# sourceMappingURL=channels.js.map