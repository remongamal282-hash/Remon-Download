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
var import_electron4 = require("electron");
var path3 = __toESM(require("path"), 1);

// electron/ipc/handlers.ts
var import_electron3 = require("electron");

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
var IPC_EVENTS = {
  DOWNLOAD_PROGRESS: "download:progress",
  DOWNLOAD_STATE_CHANGE: "download:state-change"
};

// electron/services/nativeMetadataService.ts
var import_child_process = require("child_process");
var import_promises = require("fs/promises");
var YTDLP_TIMEOUT_MS = 15e3;
var PLAYLIST_TIMEOUT_MS = 25e3;
var YOUTUBE_HOSTNAMES = /* @__PURE__ */ new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be"
]);
var MetadataCache = class {
  cache = /* @__PURE__ */ new Map();
  maxSize;
  ttlMs;
  constructor(maxSize = 50, ttlMs = 1e3 * 60 * 60) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }
  set(key, data) {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }
  clear() {
    this.cache.clear();
  }
};
var DefaultProcessExecutor = class {
  spawn(command, args, options) {
    return (0, import_child_process.spawn)(command, args, options);
  }
  async checkAccess(path4, mode) {
    return (0, import_promises.access)(path4, mode);
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
  const videoFormats = new Set(
    formats.map((f) => f.ext).filter((ext) => !!ext).filter((ext) => ["mp4", "webm", "mkv"].includes(ext))
  );
  const audioFormats = /* @__PURE__ */ new Set(["mp3", "opus"]);
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
var SHARED_METADATA_CACHE = new MetadataCache(100, 1e3 * 60 * 60);
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
        await new Promise((resolve3, reject) => {
          const proc = this.executor.spawn(candidate, ["--version"], { timeout: 5e3 });
          proc.on("error", reject);
          proc.on("exit", (code) => {
            if (code === 0) resolve3();
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
   * Optimized for speed with faster options.
   */
  async executeYtdlp(ytdlpPath, url, isPlaylist = false) {
    return new Promise((resolve3, reject) => {
      const args = [
        "--dump-single-json",
        isPlaylist ? "--yes-playlist" : "--no-playlist",
        ...isPlaylist ? ["--flat-playlist", "--playlist-items", "1-5"] : [],
        // Only first 5 videos for fast preview
        "--skip-download",
        "--no-warnings",
        url
      ];
      const timeout = isPlaylist ? PLAYLIST_TIMEOUT_MS : YTDLP_TIMEOUT_MS;
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
            resolve3(parsed);
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
    const cachedResult = SHARED_METADATA_CACHE.get(trimmedUrl);
    if (cachedResult) {
      console.log(`[MetadataService] Cache hit for ${trimmedUrl}`);
      return cachedResult;
    }
    if (!this.ytdlpPath) {
      this.ytdlpPath = await this.resolveYtdlpPath();
    }
    const linkType = classifyYouTubeUrl(trimmedUrl);
    let result;
    if (linkType === "playlist" || linkType === "channel") {
      const raw = await this.executeYtdlp(this.ytdlpPath, trimmedUrl, true);
      if (linkType === "playlist") {
        result = parsePlaylistMetadata(raw, trimmedUrl);
      } else {
        result = parseChannelMetadata(raw, trimmedUrl);
      }
    } else {
      const raw = await this.executeYtdlp(this.ytdlpPath, trimmedUrl, false);
      result = parseVideoMetadata(raw, linkType, 1);
    }
    SHARED_METADATA_CACHE.set(trimmedUrl, result);
    console.log(`[MetadataService] Cached metadata for ${trimmedUrl}`);
    return result;
  }
};

// electron/services/nativeDownloadService.ts
var import_events = require("events");
var import_child_process2 = require("child_process");
var path = __toESM(require("path"), 1);
var fs = __toESM(require("fs/promises"), 1);
var import_fs = require("fs");
var DefaultProcessExecutor2 = class {
  spawn(command, args, options) {
    const { spawn: spawn2 } = require("child_process");
    return spawn2(command, args, options);
  }
  checkAccess(path4, mode) {
    return fs.access(path4, mode);
  }
};
var NativeDownloadService = class extends import_events.EventEmitter {
  activeDownloads = /* @__PURE__ */ new Map();
  processGenerations = /* @__PURE__ */ new Map();
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
        await new Promise((resolve3, reject) => {
          const proc = this.executor.spawn(candidate, ["--version"], { timeout: 5e3 });
          proc.on("error", reject);
          proc.on("exit", (code) => {
            if (code === 0) resolve3();
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
    const isAudioFormat = ["mp3", "opus"].includes(item.format ?? "");
    if (isResume) {
      args.push("--continue");
    } else {
      args.push("--no-continue");
      args.push("--force-overwrites");
    }
    args.push("-o", outputPath);
    if (isAudioFormat) {
      args.push("-f", "bestaudio/best");
      args.push("--extract-audio");
      args.push("--audio-format", item.format);
      args.push("--audio-quality", "0");
    } else if (item.quality && item.quality !== "auto") {
      const height = item.quality.replace("p", "");
      args.push("-f", `bestvideo[height<=${height}]+bestaudio/best`);
    } else {
      args.push("-f", "best");
    }
    if (item.format && item.format !== "auto" && !isAudioFormat) {
      args.push("--merge-output-format", item.format);
      args.push("--remux-video", item.format);
    }
    args.push("--extractor-args", "youtube:player_client=android");
    if (this.settings.speedLimit !== "unlimited") {
      const limitKB = Math.floor(this.settings.speedLimit / 1024);
      args.push("-r", `${limitKB}K`);
    }
    if (this.settings.ffmpegPath && this.settings.ffmpegPath.trim()) {
      args.push("--ffmpeg-location", this.settings.ffmpegPath);
    }
    args.push("--fragment-retries", "10");
    args.push("--retries", "10");
    args.push("--retry-sleep", "5");
    args.push("--geo-bypass");
    args.push("-w");
    args.push("--newline");
    args.push("--progress-template", "download:%(progress._percent_str)s|%(progress._downloaded_bytes_str)s|%(progress._total_bytes_str)s|%(progress._speed_str)s|%(progress._eta_str)s");
    args.push("--no-warnings");
    args.push(item.sourceUrl);
    return args;
  }
  /**
   * Parse yt-dlp progress line.
   * Supports both legacy machine-readable output:
   *   download:15.2%|1.5MiB|10MiB|500KiB/s|00:15
   * and the real CLI output produced by yt-dlp:
   *   [download]  15.3% of 10.0MiB at 1.0MiB/s ETA 00:05
   */
  parseProgressLine(line) {
    const normalized = line.trim();
    if (!normalized) return null;
    const data = normalized.startsWith("download:") ? normalized.substring("download:".length) : normalized.replace(/^\[download\]\s*/i, "");
    if (!data) return null;
    const pipeParts = data.split("|");
    if (pipeParts.length >= 5) {
      const [percentPart, downloadedPart, totalPart, speedPart, etaPart] = pipeParts;
      const progress2 = parseFloat(percentPart.trim().replace("%", "")) || 0;
      const totalSize2 = this.parseSize(totalPart.trim());
      let downloadedSize2 = this.parseSize(downloadedPart.trim());
      if (downloadedSize2 === 0 && totalSize2 > 0 && progress2 > 0) {
        downloadedSize2 = Math.min(totalSize2, Math.round(progress2 / 100 * totalSize2));
      }
      const speed2 = this.parseSize(speedPart.trim().replace(/\/s$/i, ""));
      const eta2 = etaPart.trim() === "Unknown ETA" ? "--" : etaPart.trim() || "--";
      return {
        progress: Math.min(100, progress2),
        downloadedSize: downloadedSize2,
        totalSize: totalSize2,
        speed: speed2,
        eta: eta2
      };
    }
    const percentMatch = data.match(/(\d+(?:\.\d+)?)%/i);
    if (!percentMatch) {
      return null;
    }
    const progress = parseFloat(percentMatch[1]) || 0;
    const totalMatch = data.match(/of\s+(\d+(?:\.\d+)?)\s*([KMGT]?i?B)/i);
    const totalSize = this.parseSize(totalMatch ? `${totalMatch[1]}${totalMatch[2]}` : "0B");
    const speedMatch = data.match(/at\s+(\d+(?:\.\d+)?)\s*([KMGT]?i?B)\/s/i) || data.match(/(\d+(?:\.\d+)?)\s*([KMGT]?i?B)\/s/i);
    const speed = speedMatch ? this.parseSize(`${speedMatch[1]}${speedMatch[2]}`) : 0;
    const etaMatch = data.match(/ETA\s+([0-9:]+|N\/A|Unknown ETA|Unknown)/i);
    const eta = etaMatch && etaMatch[1] && etaMatch[1].toLowerCase() !== "unknown" && etaMatch[1].toLowerCase() !== "n/a" ? etaMatch[1] : "--";
    const downloadedSize = totalSize > 0 ? Math.min(totalSize, Math.round(progress / 100 * totalSize)) : 0;
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
    const normalized = sizeStr.trim().replace(/\s*\/s$/i, "");
    const match = normalized.match(/^([\d.]+)\s*([KMGT]i?B)?$/i);
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
   * Ingest yt-dlp stdout/stderr chunks and emit progress updates.
   * yt-dlp writes progress to stderr by default; custom templates may use stdout.
   */
  ingestProgressOutput(itemId, generation, activeDownload, chunk, lineBuffer) {
    if (activeDownload.isStopped) {
      return;
    }
    lineBuffer.value += chunk;
    const lines = lineBuffer.value.split("\n");
    lineBuffer.value = lines.pop() || "";
    for (const line of lines) {
      const progress = this.parseProgressLine(line.trim());
      if (!progress) {
        continue;
      }
      if (!this.isCurrentProcess(itemId, generation)) {
        continue;
      }
      activeDownload.lastProgressTime = Date.now();
      this.emitProgress(itemId, progress);
      const currentItem = this.items.get(itemId);
      if (currentItem) {
        this.items.set(itemId, {
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
  async isOutputFileComplete(outputPath, item) {
    try {
      const stat2 = await fs.stat(outputPath);
      if (stat2.size <= 0) {
        return false;
      }
      const isNearComplete = stat2.size >= item.fileSize * 0.9;
      const isEqual = stat2.size >= item.fileSize * 0.99;
      return item.progress >= 95 || isNearComplete || isEqual;
    } catch {
      return false;
    }
  }
  async markDownloadCompleted(id, outputPath) {
    const currentItem = this.items.get(id);
    if (!currentItem) {
      return;
    }
    const finalFileSize = await this.resolveCompletedFileSize(outputPath, currentItem.fileSize);
    this.updateItemStatus(id, "completed", {
      progress: 100,
      fileSize: finalFileSize,
      downloadedSize: finalFileSize,
      speed: 0,
      eta: "--"
    });
    this.emitStateChange(id, "completed");
    console.log(`[Download] \u2713 Marked as completed: ${id} (actual size: ${finalFileSize} bytes)`);
  }
  /**
   * Emits state change event to Main Process
   */
  emitStateChange(id, status, errorCode, errorMessage) {
    const item = this.items.get(id);
    if (!item) {
      console.warn(`[Download] Cannot emit state change for unknown item: ${id}`);
      return;
    }
    console.log(`[Download] State change: ${id} \u2192 ${status} (progress: ${item.progress}%, downloaded: ${item.downloadedSize} bytes)`);
    this.emit("download:state-change", {
      id,
      status,
      progress: item.progress,
      downloadedSize: item.downloadedSize,
      fileSize: item.fileSize,
      speed: item.speed,
      eta: item.eta,
      errorCode,
      errorMessage
    });
  }
  nextProcessGeneration(id) {
    const next = (this.processGenerations.get(id) ?? 0) + 1;
    this.processGenerations.set(id, next);
    return next;
  }
  isCurrentProcess(id, generation) {
    const activeGeneration = this.processGenerations.get(id) ?? 0;
    if (activeGeneration !== generation) {
      return false;
    }
    const currentItem = this.items.get(id);
    if (!currentItem) {
      return false;
    }
    return ["downloading", "retrying"].includes(currentItem.status);
  }
  /**
   * Spawns yt-dlp process for download
   */
  resolveDownloadFolder(downloadFolder) {
    if (!downloadFolder || downloadFolder.trim() === "") {
      return process.env.HOME || process.env.USERPROFILE || process.cwd();
    }
    if (downloadFolder === "~") {
      return process.env.HOME || process.env.USERPROFILE || process.cwd();
    }
    if (downloadFolder.startsWith("~/") || downloadFolder.startsWith("~\\")) {
      const homeDir = process.env.HOME || process.env.USERPROFILE || process.cwd();
      return path.join(homeDir, downloadFolder.slice(2));
    }
    return downloadFolder;
  }
  async resolveCompletedFileSize(outputPath, estimatedSize) {
    try {
      const stat2 = await fs.stat(outputPath);
      if (stat2.size > 0) {
        return stat2.size;
      }
    } catch {
    }
    return Math.max(estimatedSize, 0);
  }
  killProcessTree(proc) {
    if (!proc || !proc.pid) {
      console.warn(`[Download] killProcessTree called but process is null or has no PID`);
      return;
    }
    const pid = proc.pid;
    console.log(`[Download] Attempting to kill process tree for PID: ${pid}`);
    try {
      console.log(`[Download] Sending SIGKILL to PID ${pid}...`);
      proc.kill("SIGKILL");
      console.log(`[Download] \u2713 Sent SIGKILL to PID ${pid}`);
    } catch (err) {
      console.warn(`[Download] SIGKILL failed for PID ${pid}:`, err);
    }
    const isWindows = process.platform === "win32";
    if (isWindows) {
      try {
        console.log(`[Download] Attempting taskkill for PID ${pid} (Windows) with /F /T flags`);
        const killer = (0, import_child_process2.spawn)("taskkill", ["/PID", String(pid), "/T", "/F"], {
          stdio: "pipe",
          windowsHide: true
        });
        let killOutput = "";
        let killError = "";
        killer.stdout?.on("data", (data) => {
          killOutput += data.toString();
        });
        killer.stderr?.on("data", (data) => {
          killError += data.toString();
        });
        killer.on("exit", (code) => {
          if (code === 0) {
            console.log(`[Download] \u2713 taskkill succeeded for PID ${pid}: ${killOutput.trim()}`);
          } else if (code === 128) {
            console.log(`[Download] \u2713 Process ${pid} not found (already dead), exit code 128`);
          } else {
            console.warn(`[Download] taskkill failed with code ${code} for PID ${pid}: ${killError.trim()}`);
          }
        });
        killer.on("error", (err) => {
          console.warn(`[Download] taskkill error for PID ${pid}:`, err);
        });
      } catch (err) {
        console.warn(`[Download] Failed to spawn taskkill for PID ${pid}:`, err);
      }
    }
  }
  async cleanupStaleDownloadArtifacts(outputPath) {
    const candidates = [outputPath, `${outputPath}.part`];
    for (const candidate of candidates) {
      try {
        await fs.rm(candidate, { force: true });
      } catch {
      }
    }
  }
  async spawnDownload(item, isResume) {
    if (!this.ytdlpPath) {
      this.ytdlpPath = await this.resolveYtdlpPath();
    }
    const fileName = `${item.title.replace(/[<>:"/\\|?*]/g, "_")}.${item.format}`;
    const outputDir = this.resolveDownloadFolder(this.settings.downloadFolder);
    const outputPath = path.join(outputDir, fileName);
    const partialPath = `${outputPath}.part`;
    console.log(`[Download] spawnDownload: ${item.id}`);
    console.log(`[Download]   Output: ${outputPath}`);
    console.log(`[Download]   Partial: ${partialPath}`);
    console.log(`[Download]   isResume: ${isResume}`);
    let canResume = isResume;
    let partialFileSize = 0;
    if (isResume) {
      let hasPartialFile = false;
      let hasMainFile = false;
      let mainFileSize = 0;
      try {
        const stat2 = await fs.stat(partialPath);
        partialFileSize = stat2.size;
        hasPartialFile = true;
        console.log(`[Download] \u2713 Partial file found: ${partialFileSize} bytes, will resume from .part`);
      } catch {
        console.log(`[Download] \u2139 Partial .part file not found, checking main output file...`);
      }
      if (!hasPartialFile) {
        try {
          const stat2 = await fs.stat(outputPath);
          mainFileSize = stat2.size;
          hasMainFile = mainFileSize > 0;
          if (hasMainFile) {
            console.log(`[Download] \u2713 Main file found: ${mainFileSize} bytes, will continue from it`);
          }
        } catch {
          console.log(`[Download] \u2139 Main output file doesn't exist either`);
        }
      }
      canResume = hasPartialFile || hasMainFile && mainFileSize < item.fileSize;
      if (!canResume) {
        console.warn(`[Download] \u2717 Cannot resume: no partial file and main file is either missing or complete, will start fresh`);
      }
    }
    if (!canResume && !isResume) {
      console.log(`[Download] Cleaning up stale artifacts...`);
      await this.cleanupStaleDownloadArtifacts(outputPath);
    }
    const args = this.buildYtdlpArgs(item, outputPath, canResume);
    console.log(`[Download] Starting yt-dlp with ${canResume ? "RESUME" : "FRESH"} (${args.length} args)`);
    const proc = this.executor.spawn(this.ytdlpPath, args, {
      windowsHide: true,
      shell: false
      // Security: never use shell
    });
    const generation = this.nextProcessGeneration(item.id);
    const activeDownload = {
      item,
      process: proc,
      outputPath,
      startTime: Date.now(),
      lastProgressTime: Date.now()
    };
    this.activeDownloads.set(item.id, activeDownload);
    console.log(`[Download] \u2713 Added to activeDownloads: ${item.id} (generation: ${generation}, PID: ${proc.pid})`);
    this.updateItemStatus(item.id, "downloading");
    this.emitStateChange(item.id, "downloading");
    let stdoutBuffer = { value: "" };
    let stderrProgressBuffer = { value: "" };
    let stderrBuffer = "";
    proc.stdout?.on("data", (data) => {
      this.ingestProgressOutput(item.id, generation, activeDownload, data.toString(), stdoutBuffer);
    });
    proc.stderr?.on("data", (data) => {
      const chunk = data.toString();
      stderrBuffer += chunk;
      this.ingestProgressOutput(item.id, generation, activeDownload, chunk, stderrProgressBuffer);
    });
    proc.on("exit", async (code) => {
      if (!this.isCurrentProcess(item.id, generation)) {
        console.log(`[Download] Exit ignored: ${item.id} (stale generation)`);
        return;
      }
      this.activeDownloads.delete(item.id);
      console.log(`[Download] yt-dlp exited with code: ${code} for ${item.id}`);
      const currentItem = this.items.get(item.id);
      if (!currentItem) {
        return;
      }
      const fileComplete = await this.isOutputFileComplete(outputPath, currentItem);
      if (code === 0 || fileComplete) {
        console.log(`[Download] \u2713 Download completed successfully: ${item.id}`);
        await this.markDownloadCompleted(item.id, outputPath);
        return;
      }
      if (code === 8 || stderrBuffer.toLowerCase().includes("error") === false) {
        console.log(`[Download] Exit code ${code} - checking if file exists...`);
        if (fileComplete) {
          console.log(`[Download] \u2713 Output file complete despite exit code ${code}, marking as completed`);
          await this.markDownloadCompleted(item.id, outputPath);
          return;
        }
        console.warn(`[Download] \u2717 Download failed with exit code ${code}`);
        const errorMessage = this.mapYtdlpError(stderrBuffer, code);
        this.updateItemStatus(item.id, "failed", {
          errorCode: errorMessage.code,
          errorMessage: errorMessage.message,
          speed: 0,
          eta: "--"
        });
        this.emitStateChange(item.id, "failed", errorMessage.code, errorMessage.message);
        return;
      }
      console.warn(`[Download] \u2717 Download failed with exit code ${code}`);
      if (currentItem.status !== "paused" && currentItem.status !== "canceled") {
        const errorMessage = this.mapYtdlpError(stderrBuffer, code);
        this.updateItemStatus(item.id, "failed", {
          errorCode: errorMessage.code,
          errorMessage: errorMessage.message,
          speed: 0,
          eta: "--"
        });
        this.emitStateChange(item.id, "failed", errorMessage.code, errorMessage.message);
      }
    });
    proc.on("error", (err) => {
      if (!this.isCurrentProcess(item.id, generation)) {
        return;
      }
      this.activeDownloads.delete(item.id);
      let errorCode = "ytdlp_error";
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
        // NOTE: Do NOT reset progress or downloadedSize - preserve for resume
      });
      this.emitStateChange(item.id, "failed", errorCode, errorMessage);
    });
  }
  /**
   * Maps yt-dlp stderr output to error codes
   * Note: yt-dlp may output warnings even on success, so we check for actual error keywords
   */
  mapYtdlpError(stderr, exitCode) {
    if (!stderr || stderr.trim().length === 0) {
      return { code: "ytdlp_error", message: `Download failed with exit code ${exitCode}` };
    }
    const stderrLower = stderr.toLowerCase();
    if (stderrLower.includes("private video") || stderrLower.includes("members-only")) {
      return { code: "video_private", message: "Video is private or members-only" };
    }
    if (stderrLower.includes("video unavailable") || stderrLower.includes("not available")) {
      return { code: "video_unavailable", message: "Video is unavailable or was removed" };
    }
    if (stderrLower.includes("unsupported url")) {
      return { code: "unsupported_url", message: "URL is not supported" };
    }
    if (stderrLower.includes("http error 4") || stderrLower.includes("403") || stderrLower.includes("404")) {
      return { code: "video_unavailable", message: "Video not found or access denied (HTTP 4xx)" };
    }
    if (stderrLower.includes("http error 5") || stderrLower.includes("502") || stderrLower.includes("503")) {
      return { code: "network_error", message: "Server error - try again later (HTTP 5xx)" };
    }
    if (stderrLower.includes("network error") || stderrLower.includes("connection error") || stderrLower.includes("timeout error")) {
      return { code: "network_error", message: "Network error - check your connection" };
    }
    if (stderrLower.includes("ffmpeg error") || stderrLower.includes("postprocessor error")) {
      return { code: "ffmpeg_error", message: "FFmpeg processing failed - check FFmpeg installation" };
    }
    return { code: "ytdlp_error", message: `Download failed with exit code ${exitCode}` };
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
      (i) => i.id !== id && ["downloading", "retrying", "merging", "converting"].includes(i.status)
    ).length;
    if (activeCount >= this.settings.concurrentDownloads) {
      throw new Error("Concurrent download limit reached");
    }
    try {
      await this.spawnDownload(item, false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      const errorCode = "ytdlp_error";
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
    console.log(`[Download] PAUSE requested for: ${id} (current status: ${item.status})`);
    const activeDownload = this.activeDownloads.get(id);
    if (activeDownload && activeDownload.process) {
      console.log(`[Download] \u2713 Found active process for ${id}, marking as stopped...`);
      activeDownload.isStopped = true;
      const proc = activeDownload.process;
      if (proc.stdout) {
        proc.stdout.destroy();
        console.log(`[Download] \u2713 Closed stdout stream for ${id}`);
      }
      if (proc.stderr) {
        proc.stderr.destroy();
        console.log(`[Download] \u2713 Closed stderr stream for ${id}`);
      }
      if (proc.stdin) {
        proc.stdin.destroy();
        console.log(`[Download] \u2713 Closed stdin stream for ${id}`);
      }
      this.killProcessTree(proc);
      this.activeDownloads.delete(id);
      this.nextProcessGeneration(id);
      console.log(`[Download] \u2713 Process killed for ${id}, incremented generation to prevent auto-restart`);
    } else {
      console.log(`[Download] \u26A0 No active process found for ${id} (activeDownload exists: ${!!activeDownload}, has process: ${!!activeDownload?.process})`);
    }
    const fileName = `${item.title.replace(/[<>:"/\\|?*]/g, "_")}.${item.format}`;
    const outputDir = this.resolveDownloadFolder(this.settings.downloadFolder);
    const outputPath = path.join(outputDir, fileName);
    try {
      const stat2 = await fs.stat(outputPath);
      const actualSize = stat2.size;
      const isNearComplete = actualSize >= item.fileSize * 0.9;
      const isEqual = actualSize >= item.fileSize * 0.99;
      const shouldComplete = actualSize > 0 && (item.progress >= 95 || isNearComplete || isEqual);
      if (shouldComplete) {
        console.log(`[Download] File is ${Math.round(actualSize / (item.fileSize || 1) * 100)}% complete, marking as completed instead of paused`);
        this.updateItemStatus(id, "completed", {
          progress: 100,
          fileSize: actualSize,
          downloadedSize: actualSize,
          speed: 0,
          eta: "--"
        });
        this.emitStateChange(id, "completed");
        return this.items.get(id);
      }
    } catch {
      console.log(`[Download] Output file doesn't exist yet or can't be accessed`);
    }
    const currentItem = this.items.get(id);
    console.log(`[Download] \u2713 Setting status to PAUSED for ${id} (progress: ${currentItem?.progress ?? 0}%)`);
    this.updateItemStatus(id, "paused", {
      speed: 0,
      eta: "--",
      progress: currentItem?.progress ?? 0,
      downloadedSize: currentItem?.downloadedSize ?? 0
    });
    this.emitStateChange(id, "paused");
    return this.items.get(id);
  }
  /**
   * Resume download (restart yt-dlp with --continue)
   * Includes fallback logic: if resume fails, try from scratch
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
      (i) => i.id !== id && ["downloading", "retrying", "merging", "converting"].includes(i.status)
    ).length;
    if (activeCount >= this.settings.concurrentDownloads) {
      throw new Error("Concurrent download limit reached");
    }
    console.log(`[Download] RESUME requested for: ${id}`);
    console.log(`[Download] Current progress: ${item.progress}%, downloaded: ${item.downloadedSize} bytes`);
    try {
      console.log(`[Download] Attempting to resume with --continue flag...`);
      await this.spawnDownload(item, true);
      console.log(`[Download] \u2713 Resume started successfully: ${id}`);
      return this.items.get(id);
    } catch (resumeErr) {
      const resumeErrorMsg = resumeErr instanceof Error ? resumeErr.message : "Resume failed";
      console.warn(`[Download] \u26A0 Resume failed: ${resumeErrorMsg}, attempting fresh download...`);
      try {
        const fileName = `${item.title.replace(/[<>:"/\\|?*]/g, "_")}.${item.format}`;
        const outputDir = this.resolveDownloadFolder(this.settings.downloadFolder);
        const outputPath = path.join(outputDir, fileName);
        console.log(`[Download] Cleaning up artifacts for fresh download: ${outputPath}`);
        await this.cleanupStaleDownloadArtifacts(outputPath);
        const freshItem = {
          ...item,
          progress: 0,
          downloadedSize: 0,
          speed: 0,
          eta: "--",
          errorCode: void 0,
          errorMessage: void 0
        };
        this.items.set(id, freshItem);
        console.log(`[Download] Starting fresh download after resume failed: ${id}`);
        await this.spawnDownload(freshItem, false);
        console.log(`[Download] \u2713 Fresh download started after resume fallback: ${id}`);
        return this.items.get(id);
      } catch (freshErr) {
        const errorMessage = freshErr instanceof Error ? freshErr.message : "Download failed after fallback";
        const errorCode = errorMessage.includes("unavailable") ? "video_unavailable" : errorMessage.includes("network") ? "network_error" : "ytdlp_error";
        console.error(`[Download] \u2717 Both resume and fresh download failed: ${errorMessage}`);
        this.updateItemStatus(id, "failed", {
          errorCode,
          errorMessage,
          speed: 0,
          eta: "--"
        });
        this.emitStateChange(id, "failed", errorCode, errorMessage);
        throw freshErr;
      }
    }
  }
  /**
   * Cancel download (kill process + optionally clean partial files)
   */
  async cancel(id) {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Download item not found: ${id}`);
    }
    console.log(`[Download] CANCEL requested for: ${id} (current status: ${item.status})`);
    const activeDownload = this.activeDownloads.get(id);
    if (activeDownload && activeDownload.process) {
      console.log(`[Download] \u2713 Found active process for ${id}, marking as stopped...`);
      activeDownload.isStopped = true;
      const proc = activeDownload.process;
      if (proc.stdout) {
        proc.stdout.destroy();
        console.log(`[Download] \u2713 Closed stdout stream for ${id}`);
      }
      if (proc.stderr) {
        proc.stderr.destroy();
        console.log(`[Download] \u2713 Closed stderr stream for ${id}`);
      }
      if (proc.stdin) {
        proc.stdin.destroy();
        console.log(`[Download] \u2713 Closed stdin stream for ${id}`);
      }
      this.killProcessTree(proc);
      this.activeDownloads.delete(id);
      this.nextProcessGeneration(id);
      console.log(`[Download] \u2713 Process killed for ${id}`);
    } else {
      console.log(`[Download] \u26A0 No active process found for ${id}`);
    }
    const fileName = `${item.title.replace(/[<>:"/\\|?*]/g, "_")}.${item.format}`;
    const outputDir = this.resolveDownloadFolder(this.settings.downloadFolder);
    const outputPath = path.join(outputDir, fileName);
    try {
      const stat2 = await fs.stat(outputPath);
      const actualSize = stat2.size;
      const isNearComplete = actualSize >= item.fileSize * 0.9;
      const isEqual = actualSize >= item.fileSize * 0.99;
      const shouldComplete = actualSize > 0 && (item.progress >= 95 || isNearComplete || isEqual);
      if (shouldComplete) {
        console.log(`[Download] File is ${Math.round(actualSize / (item.fileSize || 1) * 100)}% complete, marking as completed instead of canceled`);
        this.updateItemStatus(id, "completed", {
          progress: 100,
          fileSize: actualSize,
          downloadedSize: actualSize,
          speed: 0,
          eta: "--"
        });
        this.emitStateChange(id, "completed");
        return this.items.get(id);
      }
    } catch {
      console.log(`[Download] Output file doesn't exist yet or can't be accessed`);
    }
    const currentItem = this.items.get(id);
    console.log(`[Download] \u2713 Setting status to CANCELED for ${id} (progress: ${currentItem?.progress ?? 0}%)`);
    this.updateItemStatus(id, "canceled", {
      speed: 0,
      eta: "--",
      progress: currentItem?.progress ?? 0,
      downloadedSize: currentItem?.downloadedSize ?? 0
    });
    this.emitStateChange(id, "canceled");
    return this.items.get(id);
  }
  /**
   * Retry failed/canceled download
   * Strategy:
   * - Canceled: Try to resume (likely has partial file)
   * - Failed: Try to resume first, if that fails, start fresh
   */
  async retry(id) {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Download item not found: ${id}`);
    }
    if (item.status !== "failed" && item.status !== "canceled") {
      throw new Error(`Cannot retry download in status: ${item.status}`);
    }
    const activeCount = Array.from(this.items.values()).filter(
      (i) => i.id !== id && ["downloading", "retrying", "merging", "converting"].includes(i.status)
    ).length;
    if (activeCount >= this.settings.concurrentDownloads) {
      throw new Error("Concurrent download limit reached");
    }
    const shouldResume = true;
    const resetItem = {
      ...item,
      status: "retrying",
      // Don't reset progress/downloadedSize - let spawnDownload decide based on partial file
      speed: 0,
      eta: "--",
      retryCount: item.retryCount + 1,
      errorCode: void 0,
      errorMessage: void 0,
      lastUpdatedAt: Date.now()
    };
    this.items.set(id, resetItem);
    this.emitStateChange(id, "retrying");
    setTimeout(() => {
      void this.spawnDownload(resetItem, shouldResume);
    }, 0);
    return this.items.get(id) ?? resetItem;
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
      (i) => ["downloading", "retrying", "merging", "converting"].includes(i.status)
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
  defaultQuality: "720p",
  defaultVideoFormat: "mp4",
  defaultAudioFormat: "mp3",
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
  mkdir: (path4, options) => import_fs2.promises.mkdir(path4, options).then(() => void 0),
  readFile: (path4, encoding) => import_fs2.promises.readFile(path4, encoding),
  writeFile: (path4, data, encoding) => import_fs2.promises.writeFile(path4, data, encoding)
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
function isSettingsFileFormat(value) {
  return !!value && typeof value === "object" && "data" in value && !!value.data && typeof value.data === "object";
}
function mergeWithDefaults(loaded) {
  return { ...DEFAULT_SETTINGS, ...loaded };
}
var NativeSettingsService = class {
  settings = { ...DEFAULT_SETTINGS };
  SETTINGS_FILE = "settings.json";
  FILE_VERSION = "1.0.0";
  initializationPromise = null;
  /**
   * Initialize service by loading settings from disk.
   * Idempotent — multiple calls return the same promise.
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
      if (isSettingsFileFormat(fileData)) {
        this.settings = mergeWithDefaults(fileData.data);
        return;
      }
      this.settings = { ...DEFAULT_SETTINGS };
    })();
    return this.initializationPromise;
  }
  /**
   * Ensure service is initialized before any operation.
   */
  async ensureInitialized() {
    if (!this.initializationPromise) {
      await this.initialize();
    } else {
      await this.initializationPromise;
    }
  }
  /**
   * Persist current settings to disk.
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
function isHistoryFileFormat(value) {
  return !!value && typeof value === "object" && "data" in value && Array.isArray(value.data);
}
function normalizeHistoryItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }
  const dateValue = typeof item.date === "string" ? item.date : (/* @__PURE__ */ new Date()).toISOString();
  return {
    id: String(item.id ?? crypto.randomUUID()),
    sourceDownloadId: String(item.sourceDownloadId ?? ""),
    metadataId: String(item.metadataId ?? ""),
    thumbnail: String(item.thumbnail ?? ""),
    title: String(item.title ?? "Untitled Download"),
    sourceUrl: String(item.sourceUrl ?? item["url"] ?? ""),
    // Fallback to legacy 'url' if exists
    date: dateValue,
    quality: String(item.quality ?? "Unknown"),
    format: String(item.format ?? "Unknown"),
    fileSize: typeof item.fileSize === "number" ? item.fileSize : typeof item.size === "number" ? item.size : 0,
    // Fallback to legacy 'size' if exists
    status: item.status === "completed" || item.status === "failed" || item.status === "canceled" ? item.status : "completed",
    errorCode: item.errorCode,
    errorMessage: item.errorMessage ? String(item.errorMessage) : void 0
  };
}
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
      if (isHistoryFileFormat(fileData)) {
        this.items = fileData.data.map((item) => normalizeHistoryItem(item)).filter((item) => item !== null);
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
    await this.ensureInitialized();
    this.items = [item, ...this.items.filter((i) => i.id !== item.id)];
    await this.persist();
    return item;
  }
  async remove(id) {
    await this.ensureInitialized();
    this.items = this.items.filter((i) => i.id !== id);
    await this.persist();
    return id;
  }
  async clear() {
    await this.ensureInitialized();
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
function isSchedulerFileFormat(value) {
  return !!value && typeof value === "object" && "data" in value && Array.isArray(value.data);
}
var VALID_REPEAT = /* @__PURE__ */ new Set(["once", "daily", "weekly"]);
var VALID_STATUS = /* @__PURE__ */ new Set([
  "scheduled",
  "triggered",
  "completed",
  "failed",
  "canceled"
]);
function normalizeScheduledDownload(item) {
  if (!item || typeof item !== "object") return null;
  const id = item["id"] !== void 0 ? String(item["id"]) : null;
  if (!id) return null;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const repeat = VALID_REPEAT.has(String(item["repeat"] ?? "")) ? item["repeat"] : "once";
  const status = VALID_STATUS.has(String(item["status"] ?? "")) ? item["status"] : "scheduled";
  return {
    id,
    sourceUrl: String(item["sourceUrl"] ?? item["url"] ?? ""),
    date: String(item["date"] ?? now.slice(0, 10)),
    time: String(item["time"] ?? "00:00"),
    repeat,
    status,
    nextRunAt: String(item["nextRunAt"] ?? now),
    createdAt: String(item["createdAt"] ?? now),
    updatedAt: String(item["updatedAt"] ?? now),
    triggerCount: typeof item["triggerCount"] === "number" ? item["triggerCount"] : 0,
    lastTriggeredAt: item["lastTriggeredAt"] !== void 0 ? String(item["lastTriggeredAt"]) : void 0,
    errorMessage: item["errorMessage"] !== void 0 ? String(item["errorMessage"]) : void 0
  };
}
var NativeSchedulerService = class {
  items = [];
  SCHEDULER_FILE = "scheduler.json";
  FILE_VERSION = "1.0.0";
  initializationPromise = null;
  nextError = null;
  /**
   * Initialize service by loading scheduler from disk.
   * Idempotent — multiple calls return the same promise.
   */
  async initialize() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    this.initializationPromise = (async () => {
      const fileData = await readJsonFile(this.SCHEDULER_FILE, {
        version: this.FILE_VERSION,
        data: []
      });
      if (isSchedulerFileFormat(fileData)) {
        this.items = fileData.data.map((item) => normalizeScheduledDownload(item)).filter((item) => item !== null);
        return;
      }
      this.items = [];
    })();
    return this.initializationPromise;
  }
  /**
   * Ensure service is initialized before any operation.
   */
  async ensureInitialized() {
    if (!this.initializationPromise) {
      await this.initialize();
    } else {
      await this.initializationPromise;
    }
  }
  /**
   * Persist current scheduler state to disk.
   */
  async persist() {
    await writeJsonFile(this.SCHEDULER_FILE, {
      version: this.FILE_VERSION,
      data: this.items
    });
  }
  async getAll() {
    this.throwIfNeeded();
    await this.ensureInitialized();
    return [...this.items];
  }
  async create(schedule) {
    this.throwIfNeeded();
    await this.ensureInitialized();
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
    this.throwIfNeeded();
    await this.ensureInitialized();
    const updated = {
      ...schedule,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.items = this.items.map((i) => i.id === schedule.id ? updated : i);
    await this.persist();
    return updated;
  }
  async cancel(id) {
    this.throwIfNeeded();
    await this.ensureInitialized();
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
    this.throwIfNeeded();
    await this.ensureInitialized();
    this.items = this.items.filter((i) => i.id !== id);
    await this.persist();
    return id;
  }
  async tick(now) {
    this.throwIfNeeded();
    await this.ensureInitialized();
    const triggered = [];
    const nowIso = new Date(now).toISOString();
    const nextItems = [];
    for (const item of this.items) {
      if (item.status !== "scheduled" || new Date(item.nextRunAt).getTime() > now) {
        nextItems.push(item);
        continue;
      }
      const addRepeatTime = (runAt, repeat) => {
        const date = new Date(runAt);
        if (repeat === "daily") {
          date.setDate(date.getDate() + 1);
        } else if (repeat === "weekly") {
          date.setDate(date.getDate() + 7);
        }
        return date.toISOString();
      };
      const triggeredItem = {
        ...item,
        status: item.repeat === "once" ? "triggered" : "scheduled",
        nextRunAt: item.repeat === "once" ? item.nextRunAt : addRepeatTime(item.nextRunAt, item.repeat),
        triggerCount: item.triggerCount + 1,
        lastTriggeredAt: nowIso,
        updatedAt: nowIso
      };
      triggered.push({
        schedule: triggeredItem,
        metadata: await this.createMetadata(triggeredItem)
      });
      nextItems.push(triggeredItem);
    }
    this.items = nextItems;
    if (triggered.length > 0) {
      await this.persist();
    }
    return {
      items: [...this.items],
      triggered
    };
  }
  async clear() {
    this.throwIfNeeded();
    await this.ensureInitialized();
    this.items = [];
    await this.persist();
  }
  failNext(error) {
    this.nextError = error;
  }
  throwIfNeeded() {
    if (this.nextError) {
      const error = this.nextError;
      this.nextError = null;
      throw error;
    }
  }
  requireItem(id) {
    const item = this.items.find((i) => i.id === id);
    if (!item) throw new Error(`Scheduled item not found: ${id}`);
    return item;
  }
  async createMetadata(schedule) {
    const triggerNumber = schedule.triggerCount + 1;
    const fallbackTitle = `Scheduled Download ${triggerNumber}`;
    try {
      const analyzed = await new NativeMetadataService().analyze(schedule.sourceUrl);
      if (analyzed.linkType === "video" || analyzed.linkType === "shorts" || analyzed.linkType === "playlist-video") {
        return {
          ...analyzed,
          id: `scheduled-${schedule.id}-${triggerNumber}`
        };
      }
    } catch {
    }
    const title = (() => {
      try {
        const parsed = new URL(schedule.sourceUrl);
        const videoId = parsed.searchParams.get("v");
        if (videoId) {
          return videoId;
        }
        const lastSegment = parsed.pathname.split("/").filter(Boolean).at(-1);
        if (lastSegment) {
          return decodeURIComponent(lastSegment.replace(/[-_]/g, " "));
        }
      } catch {
      }
      return fallbackTitle;
    })();
    const thumbnail = (() => {
      try {
        const parsed = new URL(schedule.sourceUrl);
        const videoId = parsed.searchParams.get("v");
        if (videoId) {
          return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        }
      } catch {
      }
      return "https://picsum.photos/seed/remon-scheduled/320/180";
    })();
    return {
      id: `scheduled-${schedule.id}-${triggerNumber}`,
      sourceUrl: schedule.sourceUrl,
      linkType: "video",
      thumbnail,
      title,
      channelName: "Scheduled Queue",
      duration: "10:24",
      views: 128e3,
      qualityOptions: ["2160p", "1440p", "1080p", "720p", "480p"],
      videoFormats: ["mp4", "webm", "mkv"],
      audioFormats: ["mp3", "opus"],
      resolution: "1080p",
      fps: 60,
      videoCodec: "H.264",
      audioCodec: "AAC",
      videoBitrate: "7.8 Mbps",
      audioBitrate: "192 Kbps",
      container: "mp4",
      fileSize: 220 * 1024 * 1024,
      uploadDate: "2026-08-01"
    };
  }
};

// electron/tray.ts
var import_electron2 = require("electron");
var path2 = __toESM(require("path"), 1);
var tray = null;
var getIconPath = () => {
  const iconPath = path2.resolve(__dirname, "../../icon.png");
  return iconPath;
};
function createTray(mainWindow2) {
  if (tray) {
    console.warn("[Tray] Tray already exists, returning existing instance");
    return tray;
  }
  try {
    const iconPath = getIconPath();
    tray = new import_electron2.Tray(iconPath);
    tray.setToolTip("Remon Download");
    const contextMenu = import_electron2.Menu.buildFromTemplate([
      {
        label: "Show Remon Download",
        click: () => {
          showWindow(mainWindow2);
        }
      },
      {
        label: "Hide Remon Download",
        click: () => {
          hideWindow(mainWindow2);
        }
      },
      {
        type: "separator"
      },
      {
        label: "Quit Remon Download",
        click: () => {
          quitApplication();
        }
      }
    ]);
    tray.setContextMenu(contextMenu);
    tray.on("click", () => {
      showWindow(mainWindow2);
    });
    console.log("[Tray] System Tray created successfully");
    return tray;
  } catch (error) {
    console.error("[Tray] Failed to create tray:", error);
    throw error;
  }
}
function showWindow(mainWindow2) {
  if (!mainWindow2) {
    console.warn("[Tray] mainWindow is null, cannot show");
    return;
  }
  if (mainWindow2.isMinimized()) {
    mainWindow2.restore();
  }
  mainWindow2.show();
  mainWindow2.focus();
  console.log("[Tray] Window shown and focused");
}
function hideWindow(mainWindow2) {
  if (!mainWindow2) {
    console.warn("[Tray] mainWindow is null, cannot hide");
    return;
  }
  mainWindow2.hide();
  console.log("[Tray] Window hidden");
}
function minimizeToTray(mainWindow2) {
  hideWindow(mainWindow2);
}
function quitApplication() {
  console.log("[Tray] Quitting application...");
  import_electron2.app.quit();
}
function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
    console.log("[Tray] Tray destroyed");
  }
}

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
function registerIpcHandlers(options = {}) {
  const settingsService = new NativeSettingsService();
  const historyService = new NativeHistoryService();
  const favoritesService = new NativeFavoritesService();
  const schedulerService = options.schedulerService ?? new NativeSchedulerService();
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
      globalThis.__remonDownloadService = downloadService;
      downloadServiceReady = true;
      downloadService.on("download:progress", (payload) => {
        const windows = import_electron3.BrowserWindow.getAllWindows();
        windows.forEach((win) => {
          win.webContents.send(IPC_EVENTS.DOWNLOAD_PROGRESS, payload);
        });
      });
      downloadService.on("download:state-change", (payload) => {
        const windows = import_electron3.BrowserWindow.getAllWindows();
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
  import_electron3.ipcMain.handle(IPC_CHANNELS.METADATA_ANALYZE, async (_, { url }) => {
    try {
      const settings = await settingsService.get();
      const metadataService = new NativeMetadataService(settings.ytdlpPath);
      const data = await metadataService.analyze(url);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron3.ipcMain.handle(IPC_CHANNELS.DOWNLOAD_GET_ALL, async () => {
    try {
      const service = await ensureDownloadService();
      const data = await service.getAll();
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron3.ipcMain.handle(IPC_CHANNELS.DOWNLOAD_ADD, async (_, { item }) => {
    try {
      const service = await ensureDownloadService();
      const data = await service.add(item);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron3.ipcMain.handle(IPC_CHANNELS.DOWNLOAD_START, async (_, { id }) => {
    try {
      const service = await ensureDownloadService();
      const data = await service.start(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron3.ipcMain.handle(IPC_CHANNELS.DOWNLOAD_PAUSE, async (_, { id }) => {
    try {
      const service = await ensureDownloadService();
      const data = await service.pause(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron3.ipcMain.handle(IPC_CHANNELS.DOWNLOAD_RESUME, async (_, { id }) => {
    try {
      const service = await ensureDownloadService();
      const data = await service.resume(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron3.ipcMain.handle(IPC_CHANNELS.DOWNLOAD_CANCEL, async (_, { id }) => {
    try {
      const service = await ensureDownloadService();
      const data = await service.cancel(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron3.ipcMain.handle(IPC_CHANNELS.DOWNLOAD_RETRY, async (_, { id }) => {
    try {
      const service = await ensureDownloadService();
      const data = await service.retry(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron3.ipcMain.handle(IPC_CHANNELS.DOWNLOAD_REMOVE, async (_, { id }) => {
    try {
      const service = await ensureDownloadService();
      const data = await service.remove(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron3.ipcMain.handle(IPC_CHANNELS.DOWNLOAD_REORDER, async (_, { orderedIds }) => {
    try {
      const service = await ensureDownloadService();
      const data = await service.reorder(orderedIds);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron3.ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    try {
      const data = await settingsService.get();
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron3.ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, async (_, { settings }) => {
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
  import_electron3.ipcMain.handle(IPC_CHANNELS.SETTINGS_RESET, async () => {
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
  import_electron3.ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, async () => {
    const focusedWindow = import_electron3.BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.minimize();
    }
    return wrapSuccess(void 0);
  });
  import_electron3.ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, async () => {
    const focusedWindow = import_electron3.BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      hideWindow(focusedWindow);
    }
    return wrapSuccess(void 0);
  });
  import_electron3.ipcMain.handle(IPC_CHANNELS.SETTINGS_SELECT_DOWNLOAD_FOLDER, async () => {
    try {
      const focusedWindow = import_electron3.BrowserWindow.getFocusedWindow();
      const result = await import_electron3.dialog.showOpenDialog(focusedWindow || new import_electron3.BrowserWindow(), {
        properties: ["openDirectory"]
      });
      if (result.canceled || result.filePaths.length === 0) {
        return wrapSuccess(null);
      }
      const folderPath = result.filePaths[0];
      const updatedSettings = await settingsService.update({ downloadFolder: folderPath });
      if (downloadService) {
        downloadService.updateSettings(updatedSettings);
      }
      return wrapSuccess(folderPath);
    } catch (err) {
      return wrapError(err);
    }
  });
  function resolveDownloadFolderPath(folderPath) {
    if (!folderPath || folderPath.trim() === "") {
      return import_electron3.app.getPath("downloads");
    }
    if (folderPath === "~") {
      return import_electron3.app.getPath("home");
    }
    if (folderPath.startsWith("~/")) {
      return `${import_electron3.app.getPath("home")}${folderPath.slice(1)}`;
    }
    if (folderPath.startsWith("~\\")) {
      return `${import_electron3.app.getPath("home")}${folderPath.slice(1)}`;
    }
    return folderPath;
  }
  import_electron3.ipcMain.handle(IPC_CHANNELS.DOWNLOAD_OPEN_FOLDER, async (_, { path: path4 }) => {
    try {
      const folderPath = resolveDownloadFolderPath(path4 ?? "");
      await import_electron3.shell.openPath(folderPath);
      return wrapSuccess(void 0);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron3.ipcMain.handle(IPC_CHANNELS.HISTORY_GET_ALL, async () => {
    try {
      const data = await historyService.getAll();
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron3.ipcMain.handle(IPC_CHANNELS.HISTORY_ADD, async (_, { item }) => {
    try {
      const data = await historyService.add(item);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron3.ipcMain.handle(IPC_CHANNELS.HISTORY_REMOVE, async (_, { id }) => {
    try {
      const data = await historyService.remove(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron3.ipcMain.handle(IPC_CHANNELS.HISTORY_CLEAR, async () => {
    try {
      await historyService.clear();
      return wrapSuccess(void 0);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron3.ipcMain.handle(IPC_CHANNELS.FAVORITES_GET_ALL, async () => {
    try {
      const data = await favoritesService.getAll();
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron3.ipcMain.handle(IPC_CHANNELS.FAVORITES_ADD, async (_, { item }) => {
    try {
      const data = await favoritesService.add(item);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron3.ipcMain.handle(IPC_CHANNELS.FAVORITES_REMOVE, async (_, { id }) => {
    try {
      const data = await favoritesService.remove(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron3.ipcMain.handle(IPC_CHANNELS.SCHEDULER_GET_ALL, async () => {
    try {
      const data = await schedulerService.getAll();
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron3.ipcMain.handle(IPC_CHANNELS.SCHEDULER_CREATE, async (_, { schedule }) => {
    try {
      const data = await schedulerService.create(schedule);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron3.ipcMain.handle(IPC_CHANNELS.SCHEDULER_UPDATE, async (_, { schedule }) => {
    try {
      const data = await schedulerService.update(schedule);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron3.ipcMain.handle(IPC_CHANNELS.SCHEDULER_CANCEL, async (_, { id }) => {
    try {
      const data = await schedulerService.cancel(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron3.ipcMain.handle(IPC_CHANNELS.SCHEDULER_REMOVE, async (_, { id }) => {
    try {
      const data = await schedulerService.remove(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
  import_electron3.ipcMain.handle(IPC_CHANNELS.SCHEDULER_TICK, async (_, { now }) => {
    try {
      const data = await schedulerService.tick(now);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
}

// electron/schedulerBackground.ts
var SchedulerBackgroundLoop = class {
  schedulerService;
  getDownloadService;
  pollMs;
  logger;
  timer = null;
  running = false;
  tickInFlight = false;
  activeExecutionIds = /* @__PURE__ */ new Set();
  lastTriggeredBySchedule = /* @__PURE__ */ new Map();
  constructor(options = {}) {
    this.schedulerService = options.schedulerService ?? new NativeSchedulerService();
    this.getDownloadService = options.getDownloadService ?? (() => null);
    this.pollMs = options.pollMs ?? 1e3;
    this.logger = options.logger ?? console;
  }
  start() {
    if (this.running) {
      return;
    }
    this.running = true;
    this.lastTriggeredBySchedule.clear();
    this.logger.log("[Main] scheduler started");
    this.timer = setInterval(() => {
      void this.tickOnce(Date.now());
    }, this.pollMs);
    void this.tickOnce(Date.now());
  }
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running = false;
    this.activeExecutionIds.clear();
    this.lastTriggeredBySchedule.clear();
    this.logger.log("[Main] scheduler stopped");
  }
  isRunning() {
    return this.running;
  }
  hasActiveTimer() {
    return this.timer !== null;
  }
  async tickOnce(now) {
    if (this.tickInFlight) {
      this.logger.log("[Main] tick skipped: scheduler already running");
      return 0;
    }
    this.tickInFlight = true;
    try {
      this.logger.log(`[Main] scheduler tick ${new Date(now).toISOString()}`);
      const result = await this.schedulerService.tick(now);
      if (result.triggered.length === 0) {
        return 0;
      }
      this.logger.log(`[Main] scheduled task detected: ${result.triggered.length} due task(s)`);
      let startedCount = 0;
      for (const triggered of result.triggered) {
        const scheduleId = triggered.schedule.id;
        const triggerKey = triggered.schedule.triggerCount;
        if (this.activeExecutionIds.has(scheduleId) || this.lastTriggeredBySchedule.get(scheduleId) === triggerKey) {
          this.logger.warn(`[Main] duplicate scheduled task detected and skipped: ${scheduleId}`);
          continue;
        }
        this.activeExecutionIds.add(scheduleId);
        this.lastTriggeredBySchedule.set(scheduleId, triggerKey);
        try {
          await this.executeTriggeredTask(triggered.schedule, triggered.metadata);
          startedCount += 1;
        } catch (error) {
          this.logger.error(`[Main] scheduled download failed: ${scheduleId}`, error);
        } finally {
          this.activeExecutionIds.delete(scheduleId);
        }
      }
      return startedCount;
    } catch (error) {
      this.logger.error("[Main] scheduler tick failed", error);
      return 0;
    } finally {
      this.tickInFlight = false;
    }
  }
  async executeTriggeredTask(schedule, metadata) {
    const downloadService = this.getDownloadService();
    if (!downloadService) {
      this.logger.warn(`[Main] scheduler task skipped because download service is unavailable: ${schedule.id}`);
      return;
    }
    const itemId = `${schedule.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const item = {
      id: itemId,
      metadataId: metadata.id,
      thumbnail: metadata.thumbnail,
      title: metadata.title,
      sourceUrl: metadata.sourceUrl,
      quality: "auto",
      format: "mp4",
      fileSize: metadata.fileSize,
      downloadedSize: 0,
      speed: 0,
      eta: "--",
      progress: 0,
      status: "queued",
      order: 0,
      addedAt: (/* @__PURE__ */ new Date()).toISOString(),
      phaseStartedAt: Date.now(),
      lastUpdatedAt: Date.now(),
      retryCount: 0
    };
    this.logger.log(`[Main] scheduled download started: ${item.id} for ${schedule.id}`);
    await downloadService.add(item);
    await downloadService.start(item.id);
    this.logger.log(`[Main] scheduled task completed: ${schedule.id}`);
  }
};

// electron/main.ts
var mainWindow = null;
var sharedSchedulerService = new NativeSchedulerService();
var schedulerLoop = null;
var appIconPath = path3.resolve(__dirname, "../../icon.png");
function createWindow() {
  mainWindow = new import_electron4.BrowserWindow({
    width: 1200,
    height: 600,
    minWidth: 900,
    minHeight: 500,
    title: "Remon Download",
    icon: appIconPath,
    autoHideMenuBar: true,
    titleBarStyle: "default",
    webPreferences: {
      preload: path3.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });
  if (!schedulerLoop) {
    const settingsService = new NativeSettingsService();
    void settingsService.initialize();
    void sharedSchedulerService.initialize();
    schedulerLoop = new SchedulerBackgroundLoop({
      schedulerService: sharedSchedulerService,
      getDownloadService: () => {
        const service = globalThis.__remonDownloadService;
        return service ?? null;
      },
      logger: console
    });
    schedulerLoop.start();
  }
  mainWindow.setMenuBarVisibility(false);
  mainWindow.setAutoHideMenuBar(true);
  mainWindow.webContents.on("context-menu", (_event, params) => {
    if (!mainWindow) {
      return;
    }
    const template = [
      ...params.isEditable ? [
        { label: "Cut", role: "cut", enabled: params.editFlags.canCut },
        { label: "Copy", role: "copy", enabled: params.editFlags.canCopy },
        { label: "Paste", role: "paste", enabled: params.editFlags.canPaste },
        { label: "Select All", role: "selectAll" }
      ] : [],
      ...!params.isEditable && params.selectionText ? [{ label: "Copy", role: "copy" }] : [],
      ...!params.isEditable && !params.selectionText ? [{ label: "Paste", role: "paste", enabled: params.isEditable }] : []
    ];
    if (template.length === 0) {
      return;
    }
    const menu = import_electron4.Menu.buildFromTemplate(template);
    menu.popup({ window: mainWindow });
  });
  registerIpcHandlers({ schedulerService: sharedSchedulerService });
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl);
  } else {
    void mainWindow.loadFile(path3.join(__dirname, "../dist/index.html"));
  }
  mainWindow.on("minimize", () => {
    if (mainWindow) {
      minimizeToTray(mainWindow);
    }
  });
  mainWindow.on("close", (event) => {
    if (mainWindow) {
      event.preventDefault();
      hideWindow(mainWindow);
      console.log("[Main] Window close intercepted, hiding to tray");
    }
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
import_electron4.app.whenReady().then(() => {
  import_electron4.app.setAppUserModelId("com.remon.download");
  createWindow();
  if (mainWindow) {
    createTray(mainWindow);
  }
  import_electron4.app.on("activate", () => {
    if (mainWindow === null) {
      createWindow();
      if (mainWindow) {
        createTray(mainWindow);
      }
    } else {
      showWindow(mainWindow);
    }
  });
});
import_electron4.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    console.log("[Main] All windows closed, but app continues running (tray still active)");
  }
});
import_electron4.app.on("before-quit", () => {
  console.log("[Main] App is quitting, destroying tray...");
  if (schedulerLoop) {
    schedulerLoop.stop();
    schedulerLoop = null;
  }
  destroyTray();
});
//# sourceMappingURL=main.cjs.map
