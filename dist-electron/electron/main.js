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
var import_child_process = require("child_process");
var import_promises = require("fs/promises");
var YTDLP_TIMEOUT_MS = 3e4;
var YOUTUBE_HOSTNAMES = /* @__PURE__ */ new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be"
]);
var DefaultProcessExecutor = class {
  spawn(command, args, options) {
    return (0, import_child_process.spawn)(command, args, options);
  }
  async checkAccess(path2, mode) {
    return (0, import_promises.access)(path2, mode);
  }
};
function isYouTubeUrl(url) {
  try {
    const parsed = new URL(url);
    return YOUTUBE_HOSTNAMES.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}
function classifyYouTubeUrl(url) {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    if (pathname.includes("/shorts/")) {
      return "shorts";
    }
    if (pathname.includes("/channel/") || pathname.includes("/@")) {
      return "channel";
    }
    if (parsed.searchParams.has("list") && parsed.searchParams.has("v")) {
      return "playlist-video";
    }
    if (parsed.searchParams.has("list")) {
      return "playlist";
    }
  } catch {
  }
  return "video";
}
function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
function formatFileSize(size) {
  return size && size > 0 ? size : 0;
}
function extractThumbnail(raw) {
  if (raw.thumbnail) return raw.thumbnail;
  if (raw.thumbnails && raw.thumbnails.length > 0) {
    return raw.thumbnails[0]?.url ?? "";
  }
  return "";
}
function parseVideoMetadata(raw, linkType, index = 1) {
  const videoId = raw.id ?? `unknown-${index}`;
  const formats = raw.formats ?? [];
  const heights = /* @__PURE__ */ new Set();
  formats.forEach((f) => {
    if (f.height && f.height > 0) heights.add(f.height);
  });
  const qualityOptions = Array.from(heights).sort((a, b) => b - a).map((h) => `${h}p`);
  const videoFormats = new Set(formats.map((f) => f.ext).filter(Boolean));
  const audioFormats = /* @__PURE__ */ new Set(["m4a", "mp3", "opus"]);
  const bestFormat = formats.find((f) => f.height && f.height > 0) ?? formats[0];
  const resolution = bestFormat?.height ? `${bestFormat.height}p` : "1080p";
  const fps = bestFormat?.fps ?? 30;
  const videoCodec = bestFormat?.vcodec ?? "H.264";
  const audioCodec = bestFormat?.acodec ?? "AAC";
  const videoBitrate = bestFormat?.tbr ? `${(bestFormat.tbr / 1e3).toFixed(1)} Mbps` : "0 Mbps";
  const audioBitrate = bestFormat?.abr ? `${Math.round(bestFormat.abr)} Kbps` : "0 Kbps";
  const fileSize = formatFileSize(bestFormat?.filesize ?? bestFormat?.filesize_approx);
  return {
    id: `yt-${linkType}-${videoId}`,
    sourceUrl: raw.webpage_url ?? "",
    linkType,
    thumbnail: extractThumbnail(raw),
    title: raw.title ?? "Unknown Title",
    channelName: raw.uploader ?? raw.channel ?? "Unknown Channel",
    duration: formatDuration(raw.duration),
    views: raw.view_count ?? 0,
    qualityOptions: qualityOptions.length > 0 ? qualityOptions : ["1080p", "720p", "480p"],
    videoFormats: Array.from(videoFormats).slice(0, 3),
    // Limit to 3
    audioFormats: Array.from(audioFormats),
    resolution,
    fps,
    videoCodec,
    audioCodec,
    videoBitrate,
    audioBitrate,
    container: bestFormat?.ext ?? "mp4",
    fileSize,
    uploadDate: raw.upload_date ?? (/* @__PURE__ */ new Date()).toISOString().split("T")[0] ?? ""
  };
}
function parsePlaylistMetadata(raw, url) {
  const playlistId = raw.id ?? "unknown-playlist";
  const entries = raw.entries ?? [];
  const videos = entries.slice(0, 10).map(
    (entry, index) => parseVideoMetadata(entry, "playlist-video", index + 1)
  );
  return {
    id: `yt-playlist-${playlistId}`,
    sourceUrl: url,
    linkType: "playlist",
    title: raw.title ?? "Unknown Playlist",
    thumbnail: extractThumbnail(raw),
    videos
  };
}
function parseChannelMetadata(raw, url) {
  const channelId = raw.id ?? "unknown-channel";
  const entries = raw.entries ?? [];
  const latestVideos = entries.slice(0, 4).map(
    (entry, index) => parseVideoMetadata(entry, "video", index + 1)
  );
  return {
    id: `yt-channel-${channelId}`,
    sourceUrl: url,
    linkType: "channel",
    name: raw.title ?? "Unknown Channel",
    thumbnail: extractThumbnail(raw),
    mockVideoCount: entries.length,
    latestVideos
  };
}
var NativeMetadataService = class {
  constructor(settingsYtdlpPath, executor) {
    this.settingsYtdlpPath = settingsYtdlpPath;
    this.executor = executor ?? new DefaultProcessExecutor();
  }
  settingsYtdlpPath;
  ytdlpPath = null;
  executor;
  /**
   * Resolves yt-dlp executable path.
   * Priority: settingsPath → system PATH.
   */
  async resolveYtdlpPath() {
    if (this.settingsYtdlpPath && this.settingsYtdlpPath.trim()) {
      try {
        await this.executor.checkAccess(this.settingsYtdlpPath, import_promises.constants.X_OK);
        return this.settingsYtdlpPath;
      } catch {
      }
    }
    const candidates = ["yt-dlp", "yt-dlp.exe", "youtube-dl", "youtube-dl.exe"];
    for (const candidate of candidates) {
      try {
        await new Promise((resolve, reject) => {
          const proc = this.executor.spawn(candidate, ["--version"], { timeout: 5e3 });
          proc.on("error", reject);
          proc.on("exit", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Exit code ${code}`));
          });
        });
        return candidate;
      } catch {
      }
    }
    throw new Error("ytdlp_not_found");
  }
  /**
   * Spawns yt-dlp process and returns parsed JSON output.
   */
  async executeYtdlp(ytdlpPath, url, isPlaylist = false) {
    return new Promise((resolve, reject) => {
      const args = [
        "--dump-single-json",
        isPlaylist ? "--yes-playlist" : "--no-playlist",
        ...isPlaylist ? ["--flat-playlist"] : [],
        "--skip-download",
        "--no-warnings",
        url
      ];
      const timeout = isPlaylist ? YTDLP_TIMEOUT_MS * 2 : YTDLP_TIMEOUT_MS;
      const proc = this.executor.spawn(ytdlpPath, args, {
        timeout,
        windowsHide: true
      });
      let stdout = "";
      let stderr = "";
      proc.stdout?.on("data", (data) => {
        stdout += data.toString();
      });
      proc.stderr?.on("data", (data) => {
        stderr += data.toString();
      });
      proc.on("error", (err) => {
        if (err.code === "ETIMEDOUT") {
          reject(new Error("ytdlp_timeout"));
        } else if (err.code === "ENOENT") {
          reject(new Error("ytdlp_not_found"));
        } else {
          reject(new Error("ytdlp_spawn_failed"));
        }
      });
      proc.on("exit", (code) => {
        if (code === 0) {
          try {
            const parsed = JSON.parse(stdout);
            resolve(parsed);
          } catch {
            reject(new Error("ytdlp_invalid_json"));
          }
        } else {
          const stderrLower = stderr.toLowerCase();
          if (stderrLower.includes("private video") || stderrLower.includes("members-only")) {
            reject(new Error("video_private"));
          } else if (stderrLower.includes("video unavailable") || stderrLower.includes("not available")) {
            reject(new Error("video_unavailable"));
          } else if (stderrLower.includes("unsupported url")) {
            reject(new Error("unsupported_url"));
          } else if (stderrLower.includes("network") || stderrLower.includes("connection")) {
            reject(new Error("network_error"));
          } else {
            reject(new Error("ytdlp_failed"));
          }
        }
      });
    });
  }
  /**
   * Analyzes a YouTube URL using yt-dlp and returns typed AnalysisResult.
   */
  async analyze(url) {
    if (!url || typeof url !== "string") {
      throw new Error("invalid_url");
    }
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      throw new Error("invalid_url");
    }
    try {
      new URL(trimmedUrl);
    } catch {
      throw new Error("invalid_url");
    }
    if (!isYouTubeUrl(trimmedUrl)) {
      throw new Error("unsupported_url");
    }
    if (!this.ytdlpPath) {
      this.ytdlpPath = await this.resolveYtdlpPath();
    }
    const linkType = classifyYouTubeUrl(trimmedUrl);
    if (linkType === "playlist" || linkType === "channel") {
      const raw2 = await this.executeYtdlp(this.ytdlpPath, trimmedUrl, true);
      if (linkType === "playlist") {
        return parsePlaylistMetadata(raw2, trimmedUrl);
      } else {
        return parseChannelMetadata(raw2, trimmedUrl);
      }
    }
    const raw = await this.executeYtdlp(this.ytdlpPath, trimmedUrl, false);
    return parseVideoMetadata(raw, linkType, 1);
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
  const downloadService = new NativeDownloadService();
  const settingsService = new NativeSettingsService();
  const historyService = new NativeHistoryService();
  const favoritesService = new NativeFavoritesService();
  const schedulerService = new NativeSchedulerService();
  import_electron.ipcMain.handle(IPC_CHANNELS.METADATA_ANALYZE, async (_, { url }) => {
    try {
      const settings = await settingsService.get();
      const metadataService = new NativeMetadataService(settings.ytdlpPath);
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
