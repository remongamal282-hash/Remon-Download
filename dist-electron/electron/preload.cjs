// electron/preload.ts
var import_electron = require("electron");

// electron/ipc/channels.ts
var IPC_CHANNELS = {
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
  SCHEDULER_REMOVE: "scheduler:remove"
};
var IPC_EVENTS = {
  DOWNLOAD_PROGRESS: "download:progress",
  DOWNLOAD_STATE_CHANGE: "download:state-change"
};

// electron/preload.ts
async function invoke(channel, payload) {
  const result = await import_electron.ipcRenderer.invoke(channel, payload);
  if (!result.success) {
    throw new Error(result.error.message);
  }
  return result.data;
}
var electronAPI = {
  isElectron: true,
  metadata: {
    analyze: (url) => invoke(IPC_CHANNELS.METADATA_ANALYZE, { url })
  },
  download: {
    getAll: () => invoke(IPC_CHANNELS.DOWNLOAD_GET_ALL),
    add: (item) => invoke(IPC_CHANNELS.DOWNLOAD_ADD, { item }),
    start: (id) => invoke(IPC_CHANNELS.DOWNLOAD_START, { id }),
    pause: (id) => invoke(IPC_CHANNELS.DOWNLOAD_PAUSE, { id }),
    resume: (id) => invoke(IPC_CHANNELS.DOWNLOAD_RESUME, { id }),
    cancel: (id) => invoke(IPC_CHANNELS.DOWNLOAD_CANCEL, { id }),
    retry: (id) => invoke(IPC_CHANNELS.DOWNLOAD_RETRY, { id }),
    remove: (id) => invoke(IPC_CHANNELS.DOWNLOAD_REMOVE, { id }),
    reorder: (orderedIds) => invoke(IPC_CHANNELS.DOWNLOAD_REORDER, { orderedIds }),
    // Event listeners for progress and state changes
    onProgress: (callback) => {
      const listener = (_event, data) => callback(data);
      import_electron.ipcRenderer.on(IPC_EVENTS.DOWNLOAD_PROGRESS, listener);
      return () => import_electron.ipcRenderer.removeListener(IPC_EVENTS.DOWNLOAD_PROGRESS, listener);
    },
    onStateChange: (callback) => {
      const listener = (_event, data) => callback(data);
      import_electron.ipcRenderer.on(IPC_EVENTS.DOWNLOAD_STATE_CHANGE, listener);
      return () => import_electron.ipcRenderer.removeListener(IPC_EVENTS.DOWNLOAD_STATE_CHANGE, listener);
    }
  },
  settings: {
    get: () => invoke(IPC_CHANNELS.SETTINGS_GET),
    update: (settings) => invoke(IPC_CHANNELS.SETTINGS_UPDATE, { settings }),
    reset: () => invoke(IPC_CHANNELS.SETTINGS_RESET)
  },
  history: {
    getAll: () => invoke(IPC_CHANNELS.HISTORY_GET_ALL),
    add: (item) => invoke(IPC_CHANNELS.HISTORY_ADD, { item }),
    remove: (id) => invoke(IPC_CHANNELS.HISTORY_REMOVE, { id }),
    clear: () => invoke(IPC_CHANNELS.HISTORY_CLEAR)
  },
  favorites: {
    getAll: () => invoke(IPC_CHANNELS.FAVORITES_GET_ALL),
    add: (item) => invoke(IPC_CHANNELS.FAVORITES_ADD, { item }),
    remove: (id) => invoke(IPC_CHANNELS.FAVORITES_REMOVE, { id })
  },
  scheduler: {
    getAll: () => invoke(IPC_CHANNELS.SCHEDULER_GET_ALL),
    create: (schedule) => invoke(IPC_CHANNELS.SCHEDULER_CREATE, { schedule }),
    update: (schedule) => invoke(IPC_CHANNELS.SCHEDULER_UPDATE, { schedule }),
    cancel: (id) => invoke(IPC_CHANNELS.SCHEDULER_CANCEL, { id }),
    remove: (id) => invoke(IPC_CHANNELS.SCHEDULER_REMOVE, { id })
  }
};
import_electron.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
//# sourceMappingURL=preload.cjs.map
