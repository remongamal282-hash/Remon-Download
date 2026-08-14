var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron2 = require("electron");
var path = __toESM(require("path"), 1);

// electron/ipc/handlers.ts
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

// electron/services/nativeMetadataService.ts
var YOUTUBE_PATTERN = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//;
function isYouTubeUrl(url) {
  return YOUTUBE_PATTERN.test(url);
}
function inferLinkType(url) {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    if (pathname.includes("/shorts/")) return "shorts";
    if (pathname.includes("/channel/") || pathname.includes("/@")) return "channel";
    if (parsed.searchParams.has("list") && parsed.searchParams.has("v")) return "playlist-video";
    if (parsed.searchParams.has("list")) return "playlist";
  } catch {
  }
  return "video";
}
function createVideoStub(url) {
  return {
    id: `native-video-stub`,
    sourceUrl: url,
    linkType: "video",
    thumbnail: `https://picsum.photos/seed/native-stub/320/180`,
    title: "Video (Native Stub \u2014 yt-dlp not connected yet)",
    channelName: "Native Channel",
    duration: "00:00",
    views: 0,
    qualityOptions: ["1080p", "720p", "480p"],
    videoFormats: ["mp4"],
    audioFormats: ["m4a"],
    resolution: "1080p",
    fps: 30,
    videoCodec: "H.264",
    audioCodec: "AAC",
    videoBitrate: "0 Mbps",
    audioBitrate: "0 Kbps",
    container: "mp4",
    fileSize: 0,
    uploadDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
  };
}
var NativeMetadataService = class {
  async analyze(url) {
    if (!url || typeof url !== "string") {
      throw new Error("Invalid URL: must be a non-empty string");
    }
    if (!isYouTubeUrl(url)) {
      throw new Error("unsupported_url");
    }
    const linkType = inferLinkType(url);
    return createVideoStub(url);
  }
};

// electron/services/nativeDownloadService.ts
var NativeDownloadService = class {
  items = /* @__PURE__ */ new Map();
  async getAll() {
    return Array.from(this.items.values());
  }
  async add(item) {
    this.items.set(item.id, item);
    return item;
  }
  async start(id) {
    return this.requireItem(id);
  }
  async pause(id) {
    return this.requireItem(id);
  }
  async resume(id) {
    return this.requireItem(id);
  }
  async cancel(id) {
    return this.requireItem(id);
  }
  async retry(id) {
    return this.requireItem(id);
  }
  async remove(id) {
    this.items.delete(id);
    return id;
  }
  async reorder(orderedIds) {
    const result = [];
    for (const id of orderedIds) {
      const item = this.items.get(id);
      if (item) result.push(item);
    }
    return result;
  }
  requireItem(id) {
    const item = this.items.get(id);
    if (!item) throw new Error(`Download item not found: ${id}`);
    return item;
  }
};

// src/constants/settings.ts
var DEFAULT_SETTINGS = {
  downloadFolder: "~/Downloads",
  startWithWindows: false,
  minimizeToTray: false,
  appearance: "system",
  language: "en",
  concurrentDownloads: 3,
  speedLimit: "unlimited",
  defaultQuality: "1080p",
  defaultVideoFormat: "mp4",
  defaultAudioFormat: "m4a",
  enableNotifications: true,
  notificationWhenCompleted: true,
  notificationWhenFailed: true,
  clipboardMonitoring: false,
  askBeforeDownloading: true,
  fileNameTemplate: "%(uploader)s - %(title)s [%(resolution)s].%(ext)s",
  ytdlpPath: "",
  ffmpegPath: "",
  proxy: ""
};

// electron/services/nativeSettingsService.ts
var NativeSettingsService = class {
  settings = { ...DEFAULT_SETTINGS };
  async get() {
    return { ...this.settings };
  }
  async update(patch) {
    this.settings = { ...this.settings, ...patch };
    return { ...this.settings };
  }
  async reset() {
    this.settings = { ...DEFAULT_SETTINGS };
    return { ...this.settings };
  }
};

// electron/services/nativeHistoryService.ts
var NativeHistoryService = class {
  items = [];
  async getAll() {
    return [...this.items];
  }
  async add(item) {
    this.items = [item, ...this.items.filter((i) => i.id !== item.id)];
    return item;
  }
  async remove(id) {
    this.items = this.items.filter((i) => i.id !== id);
    return id;
  }
  async clear() {
    this.items = [];
  }
};

// electron/services/nativeFavoritesService.ts
var NativeFavoritesService = class {
  items = [];
  async getAll() {
    return [...this.items];
  }
  async add(item) {
    this.items = [item, ...this.items.filter((i) => i.id !== item.id)];
    return item;
  }
  async remove(id) {
    this.items = this.items.filter((i) => i.id !== id);
    return id;
  }
};

// electron/services/nativeSchedulerService.ts
var NativeSchedulerService = class {
  items = [];
  async getAll() {
    return [...this.items];
  }
  async create(schedule) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const item = {
      ...schedule,
      id: `sched-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
      triggerCount: 0
    };
    this.items = [item, ...this.items];
    return item;
  }
  async update(schedule) {
    const updated = {
      ...schedule,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.items = this.items.map((i) => i.id === schedule.id ? updated : i);
    return updated;
  }
  async cancel(id) {
    const item = this.requireItem(id);
    const canceled = {
      ...item,
      status: "canceled",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.items = this.items.map((i) => i.id === id ? canceled : i);
    return canceled;
  }
  async remove(id) {
    this.items = this.items.filter((i) => i.id !== id);
    return id;
  }
  requireItem(id) {
    const item = this.items.find((i) => i.id === id);
    if (!item) throw new Error(`Scheduled item not found: ${id}`);
    return item;
  }
};

// electron/ipc/handlers.ts
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
function registerIpcHandlers() {
  const metadataService = new NativeMetadataService();
  const downloadService = new NativeDownloadService();
  const settingsService = new NativeSettingsService();
  const historyService = new NativeHistoryService();
  const favoritesService = new NativeFavoritesService();
  const schedulerService = new NativeSchedulerService();
  import_electron.ipcMain.handle(IPC_CHANNELS.METADATA_ANALYZE, async (_, { url }) => {
    try {
      const data = await metadataService.analyze(url);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron.ipcMain.handle(IPC_CHANNELS.DOWNLOAD_GET_ALL, async () => {
    try {
      const data = await downloadService.getAll();
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron.ipcMain.handle(IPC_CHANNELS.DOWNLOAD_ADD, async (_, { item }) => {
    try {
      const data = await downloadService.add(item);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron.ipcMain.handle(IPC_CHANNELS.DOWNLOAD_START, async (_, { id }) => {
    try {
      const data = await downloadService.start(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron.ipcMain.handle(IPC_CHANNELS.DOWNLOAD_PAUSE, async (_, { id }) => {
    try {
      const data = await downloadService.pause(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron.ipcMain.handle(IPC_CHANNELS.DOWNLOAD_RESUME, async (_, { id }) => {
    try {
      const data = await downloadService.resume(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron.ipcMain.handle(IPC_CHANNELS.DOWNLOAD_CANCEL, async (_, { id }) => {
    try {
      const data = await downloadService.cancel(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron.ipcMain.handle(IPC_CHANNELS.DOWNLOAD_RETRY, async (_, { id }) => {
    try {
      const data = await downloadService.retry(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron.ipcMain.handle(IPC_CHANNELS.DOWNLOAD_REMOVE, async (_, { id }) => {
    try {
      const data = await downloadService.remove(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron.ipcMain.handle(IPC_CHANNELS.DOWNLOAD_REORDER, async (_, { orderedIds }) => {
    try {
      const data = await downloadService.reorder(orderedIds);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron.ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    try {
      const data = await settingsService.get();
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron.ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, async (_, { settings }) => {
    try {
      const data = await settingsService.update(settings);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron.ipcMain.handle(IPC_CHANNELS.SETTINGS_RESET, async () => {
    try {
      const data = await settingsService.reset();
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron.ipcMain.handle(IPC_CHANNELS.HISTORY_GET_ALL, async () => {
    try {
      const data = await historyService.getAll();
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron.ipcMain.handle(IPC_CHANNELS.HISTORY_ADD, async (_, { item }) => {
    try {
      const data = await historyService.add(item);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron.ipcMain.handle(IPC_CHANNELS.HISTORY_REMOVE, async (_, { id }) => {
    try {
      const data = await historyService.remove(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron.ipcMain.handle(IPC_CHANNELS.HISTORY_CLEAR, async () => {
    try {
      await historyService.clear();
      return wrapSuccess(void 0);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron.ipcMain.handle(IPC_CHANNELS.FAVORITES_GET_ALL, async () => {
    try {
      const data = await favoritesService.getAll();
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron.ipcMain.handle(IPC_CHANNELS.FAVORITES_ADD, async (_, { item }) => {
    try {
      const data = await favoritesService.add(item);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron.ipcMain.handle(IPC_CHANNELS.FAVORITES_REMOVE, async (_, { id }) => {
    try {
      const data = await favoritesService.remove(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron.ipcMain.handle(IPC_CHANNELS.SCHEDULER_GET_ALL, async () => {
    try {
      const data = await schedulerService.getAll();
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron.ipcMain.handle(IPC_CHANNELS.SCHEDULER_CREATE, async (_, { schedule }) => {
    try {
      const data = await schedulerService.create(schedule);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron.ipcMain.handle(IPC_CHANNELS.SCHEDULER_UPDATE, async (_, { schedule }) => {
    try {
      const data = await schedulerService.update(schedule);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron.ipcMain.handle(IPC_CHANNELS.SCHEDULER_CANCEL, async (_, { id }) => {
    try {
      const data = await schedulerService.cancel(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron.ipcMain.handle(IPC_CHANNELS.SCHEDULER_REMOVE, async (_, { id }) => {
    try {
      const data = await schedulerService.remove(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
}

// electron/main.ts
var mainWindow = null;
function createWindow() {
  mainWindow = new import_electron2.BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1024,
    minHeight: 600,
    title: "Remon Download",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });
  registerIpcHandlers();
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl);
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
import_electron2.app.whenReady().then(() => {
  createWindow();
  import_electron2.app.on("activate", () => {
    if (import_electron2.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
import_electron2.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    import_electron2.app.quit();
  }
});
//# sourceMappingURL=main.js.map
