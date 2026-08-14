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
var import_electron3 = require("electron");
var path2 = __toESM(require("path"), 1);

// electron/ipc/handlers.ts
var import_electron2 = require("electron");

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
  async checkAccess(path3, mode) {
    return (0, import_promises.access)(path3, mode);
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
var import_events = require("events");
var path = __toESM(require("path"), 1);
var fs = __toESM(require("fs/promises"), 1);
var import_fs = require("fs");
var DefaultProcessExecutor2 = class {
  spawn(command, args, options) {
    const { spawn } = require("child_process");
    return spawn(command, args, options);
  }
  checkAccess(path3, mode) {
    return fs.access(path3, mode);
  }
};
var NativeDownloadService = class extends import_events.EventEmitter {
  activeDownloads = /* @__PURE__ */ new Map();
  items = /* @__PURE__ */ new Map();
  executor;
  ytdlpPath = null;
  settings;
  constructor(settings, executor) {
    super();
    this.settings = settings;
    this.executor = executor ?? new DefaultProcessExecutor2();
  }
  /**
   * Update settings (called when settings change in Main Process)
   */
  updateSettings(settings) {
    this.settings = settings;
    if (settings.ytdlpPath !== this.settings.ytdlpPath) {
      this.ytdlpPath = null;
    }
  }
  /**
   * Resolves yt-dlp executable path (same strategy as NativeMetadataService)
   * Priority: Settings ytdlpPath → system PATH candidates
   */
  async resolveYtdlpPath() {
    if (this.settings.ytdlpPath && this.settings.ytdlpPath.trim()) {
      try {
        await this.executor.checkAccess(this.settings.ytdlpPath, import_fs.constants.X_OK);
        return this.settings.ytdlpPath;
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
   * Builds yt-dlp arguments array for download
   */
  buildYtdlpArgs(item, outputPath, isResume) {
    const args = [];
    if (isResume) {
      args.push("--continue");
    } else {
      args.push("--no-continue");
    }
    args.push("-o", outputPath);
    if (item.quality && item.quality !== "auto") {
      const height = item.quality.replace("p", "");
      args.push("-f", `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`);
    } else {
      args.push("-f", "best");
    }
    if (item.format && item.format !== "auto") {
      args.push("--merge-output-format", item.format);
      args.push("--remux-video", item.format);
    }
    if (this.settings.speedLimit !== "unlimited") {
      const limitKB = Math.floor(this.settings.speedLimit / 1024);
      args.push("-r", `${limitKB}K`);
    }
    if (this.settings.ffmpegPath && this.settings.ffmpegPath.trim()) {
      args.push("--ffmpeg-location", this.settings.ffmpegPath);
    }
    args.push("--newline");
    args.push("--progress-template", "download:%(progress._percent_str)s|%(progress._downloaded_bytes_str)s|%(progress._total_bytes_str)s|%(progress._speed_str)s|%(progress._eta_str)s");
    args.push("--no-warnings");
    args.push(item.sourceUrl);
    return args;
  }
  /**
   * Parse yt-dlp progress line
   * Format: "download:15.2%|1.5MiB|10MiB|500KiB/s|00:15"
   */
  parseProgressLine(line) {
    if (!line.startsWith("download:")) {
      return null;
    }
    const data = line.substring(9);
    const parts = data.split("|");
    if (parts.length < 5) {
      return null;
    }
    const percentStr = parts[0].trim().replace("%", "");
    const progress = parseFloat(percentStr) || 0;
    const downloadedSize = this.parseSize(parts[1].trim());
    const totalSize = this.parseSize(parts[2].trim());
    const speed = this.parseSize(parts[3].trim().replace("/s", ""));
    const eta = parts[4].trim() === "Unknown ETA" ? "--" : parts[4].trim();
    return {
      progress: Math.min(100, progress),
      downloadedSize,
      totalSize,
      speed,
      eta
    };
  }
  /**
   * Parse size string (e.g., "1.5MiB", "500KiB") to bytes
   */
  parseSize(sizeStr) {
    if (!sizeStr || sizeStr === "N/A" || sizeStr === "Unknown") {
      return 0;
    }
    const match = sizeStr.match(/^([\d.]+)\s*([KMGT]i?B)?$/i);
    if (!match) {
      return 0;
    }
    const value = parseFloat(match[1]);
    const unit = (match[2] || "B").toUpperCase();
    const multipliers = {
      "B": 1,
      "KB": 1e3,
      "KIB": 1024,
      "MB": 1e3 * 1e3,
      "MIB": 1024 * 1024,
      "GB": 1e3 * 1e3 * 1e3,
      "GIB": 1024 * 1024 * 1024,
      "TB": 1e3 * 1e3 * 1e3 * 1e3,
      "TIB": 1024 * 1024 * 1024 * 1024
    };
    return Math.floor(value * (multipliers[unit] || 1));
  }
  /**
   * Emits progress event to Main Process (which forwards to Renderer)
   */
  emitProgress(id, progress) {
    this.emit("download:progress", {
      id,
      progress: progress.progress,
      downloadedSize: progress.downloadedSize,
      totalSize: progress.totalSize,
      speed: progress.speed,
      eta: progress.eta
    });
  }
  /**
   * Emits state change event to Main Process
   */
  emitStateChange(id, status, errorCode, errorMessage) {
    this.emit("download:state-change", {
      id,
      status,
      errorCode,
      errorMessage
    });
  }
  /**
   * Spawns yt-dlp process for download
   */
  async spawnDownload(item, isResume) {
    if (!this.ytdlpPath) {
      this.ytdlpPath = await this.resolveYtdlpPath();
    }
    const fileName = `${item.title.replace(/[<>:"/\\|?*]/g, "_")}.${item.format}`;
    const outputPath = path.join(this.settings.downloadFolder, fileName);
    const args = this.buildYtdlpArgs(item, outputPath, isResume);
    const proc = this.executor.spawn(this.ytdlpPath, args, {
      windowsHide: true,
      shell: false
      // Security: never use shell
    });
    const activeDownload = {
      item,
      process: proc,
      outputPath,
      startTime: Date.now(),
      lastProgressTime: Date.now()
    };
    this.activeDownloads.set(item.id, activeDownload);
    this.updateItemStatus(item.id, "downloading");
    this.emitStateChange(item.id, "downloading");
    let stdoutBuffer = "";
    let stderrBuffer = "";
    proc.stdout?.on("data", (data) => {
      stdoutBuffer += data.toString();
      const lines = stdoutBuffer.split("\n");
      stdoutBuffer = lines.pop() || "";
      for (const line of lines) {
        const progress = this.parseProgressLine(line.trim());
        if (progress) {
          activeDownload.lastProgressTime = Date.now();
          this.emitProgress(item.id, progress);
          const currentItem = this.items.get(item.id);
          if (currentItem) {
            this.items.set(item.id, {
              ...currentItem,
              progress: progress.progress,
              downloadedSize: progress.downloadedSize,
              fileSize: progress.totalSize || currentItem.fileSize,
              speed: progress.speed,
              eta: progress.eta,
              lastUpdatedAt: Date.now()
            });
          }
        }
      }
    });
    proc.stderr?.on("data", (data) => {
      stderrBuffer += data.toString();
    });
    proc.on("exit", (code) => {
      this.activeDownloads.delete(item.id);
      if (code === 0) {
        const currentItem = this.items.get(item.id);
        if (currentItem) {
          this.updateItemStatus(item.id, "merging");
          this.emitStateChange(item.id, "merging");
          setTimeout(() => {
            const mergingItem = this.items.get(item.id);
            if (mergingItem && mergingItem.status === "merging") {
              this.updateItemStatus(item.id, "converting");
              this.emitStateChange(item.id, "converting");
              setTimeout(() => {
                const convertingItem = this.items.get(item.id);
                if (convertingItem && convertingItem.status === "converting") {
                  this.updateItemStatus(item.id, "completed", {
                    progress: 100,
                    downloadedSize: convertingItem.fileSize,
                    speed: 0,
                    eta: "--"
                  });
                  this.emitStateChange(item.id, "completed");
                }
              }, 500);
            }
          }, 500);
        }
      } else {
        const currentItem = this.items.get(item.id);
        if (currentItem && currentItem.status !== "paused" && currentItem.status !== "canceled") {
          const errorMessage = this.mapYtdlpError(stderrBuffer, code);
          this.updateItemStatus(item.id, "failed", {
            errorCode: errorMessage.code,
            errorMessage: errorMessage.message,
            speed: 0,
            eta: "--"
          });
          this.emitStateChange(item.id, "failed", errorMessage.code, errorMessage.message);
        }
      }
    });
    proc.on("error", (err) => {
      this.activeDownloads.delete(item.id);
      let errorCode = "ytdlp_spawn_failed";
      let errorMessage = "Failed to spawn yt-dlp process";
      if (err.code === "ENOENT") {
        errorCode = "ytdlp_not_found";
        errorMessage = "yt-dlp executable not found";
      }
      this.updateItemStatus(item.id, "failed", {
        errorCode,
        errorMessage,
        speed: 0,
        eta: "--"
      });
      this.emitStateChange(item.id, "failed", errorCode, errorMessage);
    });
  }
  /**
   * Maps yt-dlp stderr output to error codes
   */
  mapYtdlpError(stderr, exitCode) {
    const stderrLower = stderr.toLowerCase();
    if (stderrLower.includes("private video") || stderrLower.includes("members-only")) {
      return { code: "video_private", message: "Video is private or members-only" };
    }
    if (stderrLower.includes("video unavailable") || stderrLower.includes("not available")) {
      return { code: "video_unavailable", message: "Video is unavailable" };
    }
    if (stderrLower.includes("unsupported url")) {
      return { code: "unsupported_url", message: "URL is not supported" };
    }
    if (stderrLower.includes("network") || stderrLower.includes("connection") || stderrLower.includes("timeout")) {
      return { code: "network_error", message: "Network error occurred" };
    }
    if (stderrLower.includes("http error 4") || stderrLower.includes("403") || stderrLower.includes("404")) {
      return { code: "video_unavailable", message: "Video not found or access denied" };
    }
    if (stderrLower.includes("ffmpeg") || stderrLower.includes("postprocessor")) {
      return { code: "ffmpeg_error", message: "FFmpeg processing failed" };
    }
    return { code: "download_failed", message: `Download failed with exit code ${exitCode}` };
  }
  /**
   * Updates item in memory
   */
  updateItemStatus(id, status, updates) {
    const item = this.items.get(id);
    if (!item) return;
    this.items.set(id, {
      ...item,
      status,
      ...updates,
      lastUpdatedAt: Date.now()
    });
  }
  /**
   * Get all download items
   */
  async getAll() {
    return Array.from(this.items.values());
  }
  /**
   * Add download item to queue
   */
  async add(item) {
    this.items.set(item.id, item);
    return item;
  }
  /**
   * Start download (transition from analyzing to downloading)
   */
  async start(id) {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Download item not found: ${id}`);
    }
    const activeCount = Array.from(this.items.values()).filter(
      (i) => ["downloading", "merging", "converting"].includes(i.status)
    ).length;
    if (activeCount >= this.settings.concurrentDownloads) {
      throw new Error("Concurrent download limit reached");
    }
    try {
      await this.spawnDownload(item, false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      const errorCode = errorMessage.includes("ytdlp_not_found") ? "ytdlp_not_found" : "download_failed";
      this.updateItemStatus(id, "failed", {
        errorCode,
        errorMessage,
        speed: 0,
        eta: "--"
      });
      this.emitStateChange(id, "failed", errorCode, errorMessage);
      throw err;
    }
    return this.items.get(id);
  }
  /**
   * Pause download (kill process + keep .part file)
   */
  async pause(id) {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Download item not found: ${id}`);
    }
    const activeDownload = this.activeDownloads.get(id);
    if (activeDownload && activeDownload.process) {
      activeDownload.process.kill();
      this.activeDownloads.delete(id);
    }
    this.updateItemStatus(id, "paused", {
      speed: 0,
      eta: "--"
    });
    this.emitStateChange(id, "paused");
    return this.items.get(id);
  }
  /**
   * Resume download (restart yt-dlp with --continue)
   */
  async resume(id) {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Download item not found: ${id}`);
    }
    if (item.status !== "paused") {
      throw new Error(`Cannot resume download in status: ${item.status}`);
    }
    const activeCount = Array.from(this.items.values()).filter(
      (i) => ["analyzing", "downloading", "merging", "converting"].includes(i.status)
    ).length;
    if (activeCount >= this.settings.concurrentDownloads) {
      throw new Error("Concurrent download limit reached");
    }
    try {
      await this.spawnDownload(item, true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      const errorCode = errorMessage.includes("ytdlp_not_found") ? "ytdlp_not_found" : "download_failed";
      this.updateItemStatus(id, "failed", {
        errorCode,
        errorMessage,
        speed: 0,
        eta: "--"
      });
      this.emitStateChange(id, "failed", errorCode, errorMessage);
      throw err;
    }
    return this.items.get(id);
  }
  /**
   * Cancel download (kill process + optionally clean partial files)
   */
  async cancel(id) {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Download item not found: ${id}`);
    }
    const activeDownload = this.activeDownloads.get(id);
    if (activeDownload && activeDownload.process) {
      activeDownload.process.kill();
      this.activeDownloads.delete(id);
    }
    this.updateItemStatus(id, "canceled", {
      speed: 0,
      eta: "--"
    });
    this.emitStateChange(id, "canceled");
    return this.items.get(id);
  }
  /**
   * Retry failed/canceled download
   */
  async retry(id) {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Download item not found: ${id}`);
    }
    if (item.status !== "failed" && item.status !== "canceled") {
      throw new Error(`Cannot retry download in status: ${item.status}`);
    }
    this.updateItemStatus(id, "retrying", {
      progress: 0,
      downloadedSize: 0,
      speed: 0,
      eta: "--",
      retryCount: item.retryCount + 1,
      errorCode: void 0,
      errorMessage: void 0
    });
    this.emitStateChange(id, "retrying");
    setTimeout(() => {
      const currentItem = this.items.get(id);
      if (currentItem && currentItem.status === "retrying") {
        this.updateItemStatus(id, "analyzing");
        this.emitStateChange(id, "analyzing");
      }
    }, 300);
    return this.items.get(id);
  }
  /**
   * Remove download item
   */
  async remove(id) {
    const activeDownload = this.activeDownloads.get(id);
    if (activeDownload && activeDownload.process) {
      activeDownload.process.kill();
      this.activeDownloads.delete(id);
    }
    this.items.delete(id);
    return id;
  }
  /**
   * Reorder downloads
   */
  async reorder(orderedIds) {
    const result = [];
    for (const id of orderedIds) {
      const item = this.items.get(id);
      if (item) result.push(item);
    }
    return result;
  }
  /**
   * Get count of active downloads
   */
  getActiveCount() {
    return Array.from(this.items.values()).filter(
      (i) => ["analyzing", "downloading", "merging", "converting"].includes(i.status)
    ).length;
  }
  /**
   * Clean up all active downloads (called on app shutdown)
   */
  cleanup() {
    for (const [id, activeDownload] of this.activeDownloads.entries()) {
      if (activeDownload.process) {
        activeDownload.process.kill();
      }
    }
    this.activeDownloads.clear();
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

// electron/utils/fileStorage.ts
var import_fs2 = require("fs");
var import_path = require("path");
var import_electron = require("electron");
var realFs = {
  mkdir: (path3, options) => import_fs2.promises.mkdir(path3, options).then(() => void 0),
  readFile: (path3, encoding) => import_fs2.promises.readFile(path3, encoding),
  writeFile: (path3, data, encoding) => import_fs2.promises.writeFile(path3, data, encoding)
};
var realApp = {
  getUserDataPath: () => import_electron.app.getPath("userData")
};
var fsOps = realFs;
var appPath = realApp;
function getStoragePath(filename) {
  const userDataPath = appPath.getUserDataPath();
  return (0, import_path.join)(userDataPath, "remon-download", filename);
}
async function ensureStorageDirectory() {
  const userDataPath = appPath.getUserDataPath();
  const storageDir = (0, import_path.join)(userDataPath, "remon-download");
  await fsOps.mkdir(storageDir, { recursive: true });
}
async function readJsonFile(filename, fallback) {
  try {
    const filePath = getStoragePath(filename);
    const fileContent = await fsOps.readFile(filePath, "utf-8");
    if (!fileContent || fileContent.trim() === "") {
      return fallback;
    }
    const parsed = JSON.parse(fileContent);
    return parsed;
  } catch (error) {
    if (error.code === "ENOENT") {
      return fallback;
    }
    if (error instanceof SyntaxError) {
      console.warn(`[fileStorage] Invalid JSON in ${filename}, using fallback:`, error.message);
      return fallback;
    }
    throw error;
  }
}
async function writeJsonFile(filename, data) {
  await ensureStorageDirectory();
  const filePath = getStoragePath(filename);
  const jsonString = JSON.stringify(data, null, 2);
  await fsOps.writeFile(filePath, jsonString, "utf-8");
}

// electron/services/nativeSettingsService.ts
var NativeSettingsService = class {
  settings = { ...DEFAULT_SETTINGS };
  SETTINGS_FILE = "settings.json";
  FILE_VERSION = "1.0.0";
  initializationPromise = null;
  /**
   * Initialize service by loading settings from disk
   * Must be called after construction
   */
  async initialize() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    this.initializationPromise = (async () => {
      const fileData = await readJsonFile(
        this.SETTINGS_FILE,
        {
          version: this.FILE_VERSION,
          data: DEFAULT_SETTINGS
        }
      );
      this.settings = fileData.data;
    })();
    return this.initializationPromise;
  }
  /**
   * Ensure service is initialized before proceeding
   */
  async ensureInitialized() {
    if (!this.initializationPromise) {
      await this.initialize();
    } else {
      await this.initializationPromise;
    }
  }
  /**
   * Persist current settings to disk
   */
  async persist() {
    await writeJsonFile(this.SETTINGS_FILE, {
      version: this.FILE_VERSION,
      data: this.settings
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
    this.settings = { ...DEFAULT_SETTINGS };
    await this.persist();
    return { ...this.settings };
  }
};

// electron/services/nativeHistoryService.ts
var NativeHistoryService = class {
  items = [];
  HISTORY_FILE = "history.json";
  FILE_VERSION = "1.0.0";
  initializationPromise = null;
  /**
   * Initialize service by loading history from disk
   * Must be called after construction
   */
  async initialize() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    this.initializationPromise = (async () => {
      const fileData = await readJsonFile(this.HISTORY_FILE, {
        version: this.FILE_VERSION,
        data: []
      });
      this.items = fileData.data.map((item) => ({
        ...item,
        downloadedAt: new Date(item.downloadedAt)
      }));
    })();
    return this.initializationPromise;
  }
  /**
   * Ensure service is initialized before proceeding
   */
  async ensureInitialized() {
    if (!this.initializationPromise) {
      await this.initialize();
    } else {
      await this.initializationPromise;
    }
  }
  /**
   * Persist current history to disk
   */
  async persist() {
    await writeJsonFile(this.HISTORY_FILE, {
      version: this.FILE_VERSION,
      data: this.items
    });
  }
  async getAll() {
    await this.ensureInitialized();
    return [...this.items];
  }
  async add(item) {
    this.items = [item, ...this.items.filter((i) => i.id !== item.id)];
    await this.persist();
    return item;
  }
  async remove(id) {
    this.items = this.items.filter((i) => i.id !== id);
    await this.persist();
    return id;
  }
  async clear() {
    this.items = [];
    await this.persist();
  }
};

// electron/services/nativeFavoritesService.ts
function isFavoritesFileFormat(value) {
  return !!value && typeof value === "object" && "data" in value && Array.isArray(value.data);
}
function normalizeFavoriteItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }
  const dateValue = typeof item.dateAdded === "string" ? item.dateAdded : (/* @__PURE__ */ new Date()).toISOString();
  const parsedDate = new Date(dateValue);
  const normalizedDate = Number.isNaN(parsedDate.getTime()) ? (/* @__PURE__ */ new Date()).toISOString() : parsedDate.toISOString();
  return {
    id: String(item.id ?? crypto.randomUUID()),
    sourceUrl: String(item.sourceUrl ?? ""),
    thumbnail: String(item.thumbnail ?? ""),
    title: String(item.title ?? "Untitled Favorite"),
    channel: String(item.channel ?? "Unknown channel"),
    dateAdded: normalizedDate
  };
}
var NativeFavoritesService = class {
  items = [];
  FAVORITES_FILE = "favorites.json";
  FILE_VERSION = "1.0.0";
  initializationPromise = null;
  /**
   * Initialize service by loading favorites from disk
   * Must be called after construction
   */
  async initialize() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    this.initializationPromise = (async () => {
      const fileData = await readJsonFile(
        this.FAVORITES_FILE,
        {
          version: this.FILE_VERSION,
          data: []
        }
      );
      if (isFavoritesFileFormat(fileData)) {
        this.items = fileData.data.map((item) => normalizeFavoriteItem(item)).filter((item) => item !== null);
        return;
      }
      this.items = [];
    })();
    return this.initializationPromise;
  }
  /**
   * Ensure service is initialized before proceeding
   */
  async ensureInitialized() {
    if (!this.initializationPromise) {
      await this.initialize();
    } else {
      await this.initializationPromise;
    }
  }
  /**
   * Persist current favorites to disk
   */
  async persist() {
    await writeJsonFile(this.FAVORITES_FILE, {
      version: this.FILE_VERSION,
      data: this.items
    });
  }
  async getAll() {
    await this.ensureInitialized();
    return [...this.items];
  }
  async add(item) {
    this.items = [item, ...this.items.filter((i) => i.id !== item.id)];
    await this.persist();
    return item;
  }
  async remove(id) {
    this.items = this.items.filter((i) => i.id !== id);
    await this.persist();
    return id;
  }
};

// electron/services/nativeSchedulerService.ts
var NativeSchedulerService = class {
  items = [];
  SCHEDULER_FILE = "scheduler.json";
  FILE_VERSION = "1.0.0";
  /**
   * Initialize service by loading scheduler from disk
   * Must be called after construction
   */
  async initialize() {
    const fileData = await readJsonFile(
      this.SCHEDULER_FILE,
      {
        version: this.FILE_VERSION,
        data: []
      }
    );
    this.items = fileData.data;
  }
  /**
   * Persist current scheduler to disk
   */
  async persist() {
    await writeJsonFile(this.SCHEDULER_FILE, {
      version: this.FILE_VERSION,
      data: this.items
    });
  }
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
    await this.persist();
    return item;
  }
  async update(schedule) {
    const updated = {
      ...schedule,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.items = this.items.map((i) => i.id === schedule.id ? updated : i);
    await this.persist();
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
    await this.persist();
    return canceled;
  }
  async remove(id) {
    this.items = this.items.filter((i) => i.id !== id);
    await this.persist();
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
  const settingsService = new NativeSettingsService();
  const historyService = new NativeHistoryService();
  const favoritesService = new NativeFavoritesService();
  const schedulerService = new NativeSchedulerService();
  const initServices = async () => {
    try {
      await settingsService.initialize();
      console.log("[IPC] NativeSettingsService initialized");
    } catch (err) {
      console.error("[IPC] Failed to initialize NativeSettingsService:", err);
    }
    try {
      await historyService.initialize();
      console.log("[IPC] NativeHistoryService initialized");
    } catch (err) {
      console.error("[IPC] Failed to initialize NativeHistoryService:", err);
    }
    try {
      await favoritesService.initialize();
      console.log("[IPC] NativeFavoritesService initialized");
    } catch (err) {
      console.error("[IPC] Failed to initialize NativeFavoritesService:", err);
    }
    try {
      await schedulerService.initialize();
      console.log("[IPC] NativeSchedulerService initialized");
    } catch (err) {
      console.error("[IPC] Failed to initialize NativeSchedulerService:", err);
    }
  };
  void initServices();
  let downloadService = null;
  let downloadServiceReady = false;
  const initDownloadService = async () => {
    try {
      const settings = await settingsService.get();
      downloadService = new NativeDownloadService(settings);
      downloadServiceReady = true;
      downloadService.on("download:progress", (payload) => {
        const windows = import_electron2.BrowserWindow.getAllWindows();
        windows.forEach((win) => {
          win.webContents.send(IPC_EVENTS.DOWNLOAD_PROGRESS, payload);
        });
      });
      downloadService.on("download:state-change", (payload) => {
        const windows = import_electron2.BrowserWindow.getAllWindows();
        windows.forEach((win) => {
          win.webContents.send(IPC_EVENTS.DOWNLOAD_STATE_CHANGE, payload);
        });
      });
    } catch (err) {
      console.error("Failed to initialize NativeDownloadService:", err);
    }
  };
  void initDownloadService();
  const ensureDownloadService = async () => {
    if (!downloadServiceReady || !downloadService) {
      await initDownloadService();
      if (!downloadService) {
        throw new Error("Failed to initialize download service");
      }
    }
    return downloadService;
  };
  import_electron2.ipcMain.handle(IPC_CHANNELS.METADATA_ANALYZE, async (_, { url }) => {
    try {
      const settings = await settingsService.get();
      const metadataService = new NativeMetadataService(settings.ytdlpPath);
      const data = await metadataService.analyze(url);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron2.ipcMain.handle(IPC_CHANNELS.DOWNLOAD_GET_ALL, async () => {
    try {
      const service = await ensureDownloadService();
      const data = await service.getAll();
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron2.ipcMain.handle(IPC_CHANNELS.DOWNLOAD_ADD, async (_, { item }) => {
    try {
      const service = await ensureDownloadService();
      const data = await service.add(item);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron2.ipcMain.handle(IPC_CHANNELS.DOWNLOAD_START, async (_, { id }) => {
    try {
      const service = await ensureDownloadService();
      const data = await service.start(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron2.ipcMain.handle(IPC_CHANNELS.DOWNLOAD_PAUSE, async (_, { id }) => {
    try {
      const service = await ensureDownloadService();
      const data = await service.pause(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron2.ipcMain.handle(IPC_CHANNELS.DOWNLOAD_RESUME, async (_, { id }) => {
    try {
      const service = await ensureDownloadService();
      const data = await service.resume(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron2.ipcMain.handle(IPC_CHANNELS.DOWNLOAD_CANCEL, async (_, { id }) => {
    try {
      const service = await ensureDownloadService();
      const data = await service.cancel(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron2.ipcMain.handle(IPC_CHANNELS.DOWNLOAD_RETRY, async (_, { id }) => {
    try {
      const service = await ensureDownloadService();
      const data = await service.retry(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron2.ipcMain.handle(IPC_CHANNELS.DOWNLOAD_REMOVE, async (_, { id }) => {
    try {
      const service = await ensureDownloadService();
      const data = await service.remove(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron2.ipcMain.handle(IPC_CHANNELS.DOWNLOAD_REORDER, async (_, { orderedIds }) => {
    try {
      const service = await ensureDownloadService();
      const data = await service.reorder(orderedIds);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron2.ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    try {
      const data = await settingsService.get();
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron2.ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, async (_, { settings }) => {
    try {
      const data = await settingsService.update(settings);
      if (downloadService) {
        downloadService.updateSettings(data);
      }
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron2.ipcMain.handle(IPC_CHANNELS.SETTINGS_RESET, async () => {
    try {
      const data = await settingsService.reset();
      if (downloadService) {
        downloadService.updateSettings(data);
      }
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron2.ipcMain.handle(IPC_CHANNELS.HISTORY_GET_ALL, async () => {
    try {
      const data = await historyService.getAll();
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron2.ipcMain.handle(IPC_CHANNELS.HISTORY_ADD, async (_, { item }) => {
    try {
      const data = await historyService.add(item);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron2.ipcMain.handle(IPC_CHANNELS.HISTORY_REMOVE, async (_, { id }) => {
    try {
      const data = await historyService.remove(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron2.ipcMain.handle(IPC_CHANNELS.HISTORY_CLEAR, async () => {
    try {
      await historyService.clear();
      return wrapSuccess(void 0);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron2.ipcMain.handle(IPC_CHANNELS.FAVORITES_GET_ALL, async () => {
    try {
      const data = await favoritesService.getAll();
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron2.ipcMain.handle(IPC_CHANNELS.FAVORITES_ADD, async (_, { item }) => {
    try {
      const data = await favoritesService.add(item);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron2.ipcMain.handle(IPC_CHANNELS.FAVORITES_REMOVE, async (_, { id }) => {
    try {
      const data = await favoritesService.remove(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron2.ipcMain.handle(IPC_CHANNELS.SCHEDULER_GET_ALL, async () => {
    try {
      const data = await schedulerService.getAll();
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron2.ipcMain.handle(IPC_CHANNELS.SCHEDULER_CREATE, async (_, { schedule }) => {
    try {
      const data = await schedulerService.create(schedule);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron2.ipcMain.handle(IPC_CHANNELS.SCHEDULER_UPDATE, async (_, { schedule }) => {
    try {
      const data = await schedulerService.update(schedule);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron2.ipcMain.handle(IPC_CHANNELS.SCHEDULER_CANCEL, async (_, { id }) => {
    try {
      const data = await schedulerService.cancel(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron2.ipcMain.handle(IPC_CHANNELS.SCHEDULER_REMOVE, async (_, { id }) => {
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
  mainWindow = new import_electron3.BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1024,
    minHeight: 600,
    title: "Remon Download",
    webPreferences: {
      preload: path2.join(__dirname, "preload.cjs"),
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
    void mainWindow.loadFile(path2.join(__dirname, "../dist/index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
import_electron3.app.whenReady().then(() => {
  createWindow();
  import_electron3.app.on("activate", () => {
    if (import_electron3.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
import_electron3.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    import_electron3.app.quit();
  }
});
//# sourceMappingURL=main.cjs.map
