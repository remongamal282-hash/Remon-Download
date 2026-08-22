"use strict";
/**
 * NativeMetadataService — Main Process metadata via yt-dlp.
 *
 * Phase 2.x: Real yt-dlp integration for production metadata fetching.
 *
 * What this does:
 * - Validates YouTube URLs (youtube.com / youtu.be).
 * - Classifies link type: video | shorts | playlist | playlist-video | channel.
 * - Invokes yt-dlp as child_process to fetch real metadata from YouTube.
 * - Parses yt-dlp JSON output into AnalysisResult types.
 * - Handles errors, timeouts, and process failures safely.
 *
 * yt-dlp Path Resolution:
 * 1. Settings ytdlpPath (if provided and valid)
 * 2. System PATH lookup (via 'which' command or direct spawn attempt)
 * 3. Error if not found
 *
 * Security:
 * - URL passed as separate argument (no shell concatenation)
 * - No shell=true (uses spawn with argument array)
 * - No arbitrary command execution
 *
 * Testability:
 * - Uses dependency injection for spawn/access functions
 * - Allows mocking without complex vi.mock() setup
 *
 * Relationship to MockMetadataService:
 * - MockMetadataService runs in Web/Vitest mode (Renderer, uses window.setTimeout)
 * - NativeMetadataService runs in Electron Main Process (Node.js, spawns yt-dlp)
 * - URL classification logic duplicated intentionally (process isolation)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativeMetadataService = void 0;
exports.isYouTubeUrl = isYouTubeUrl;
exports.classifyYouTubeUrl = classifyYouTubeUrl;
const child_process_1 = require("child_process");
const promises_1 = require("fs/promises");
const path = __importStar(require("path"));
// ─── Configuration ──────────────────────────────────────────────────────────
const YTDLP_TIMEOUT_MS = 15000; // 15 seconds - optimized for faster response
const PLAYLIST_TIMEOUT_MS = 25000; // 25 seconds - playlists take longer
const YOUTUBE_HOSTNAMES = new Set([
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtu.be"
]);
class MetadataCache {
    constructor(maxSize = 50, ttlMs = 1000 * 60 * 60) {
        this.cache = new Map();
        // Default: 50 items, 1 hour TTL
        this.maxSize = maxSize;
        this.ttlMs = ttlMs;
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        // Check TTL
        if (Date.now() - entry.timestamp > this.ttlMs) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    set(key, data) {
        // Remove oldest entry if cache is full
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey)
                this.cache.delete(firstKey);
        }
        this.cache.set(key, { data, timestamp: Date.now() });
    }
    clear() {
        this.cache.clear();
    }
}
class DefaultProcessExecutor {
    spawn(command, args, options) {
        return (0, child_process_1.spawn)(command, args, options);
    }
    async checkAccess(path, mode) {
        return (0, promises_1.access)(path, mode);
    }
}
// ─── YouTube URL Validation ─────────────────────────────────────────────────
/**
 * Returns true if the URL belongs to a known YouTube hostname.
 */
function isYouTubeUrl(url) {
    try {
        const parsed = new URL(url);
        return YOUTUBE_HOSTNAMES.has(parsed.hostname.toLowerCase());
    }
    catch {
        return false;
    }
}
// ─── Link Type Classification ───────────────────────────────────────────────
/**
 * Classifies a YouTube URL into one of the 5 recognized link types.
 */
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
    }
    catch {
        // fall through
    }
    return "video";
}
function getFormatHeight(format) {
    if (typeof format.height === "number" && format.height > 0) {
        return format.height;
    }
    if (typeof format.height === "string" && Number(format.height) > 0) {
        return Number(format.height);
    }
    const candidates = [format.format_note, format.resolution];
    for (const value of candidates) {
        const match = String(value ?? "").match(/(?:x|\b)(\d{3,4})p?\b/i);
        if (match) {
            return Number(match[1]);
        }
    }
    const formatIdMatch = String(format.format_id ?? "").match(/(?:x|\b)(\d{3,4})p\b/i);
    if (formatIdMatch) {
        return Number(formatIdMatch[1]);
    }
    return undefined;
}
let electronApp;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    electronApp = require("electron").app;
}
catch {
    // Test environment without electron
}
function bundledYtdlpCandidates() {
    const candidates = [];
    if (process.resourcesPath) {
        candidates.push(path.join(process.resourcesPath, "runtime", "yt-dlp.exe"));
    }
    if (process.defaultApp === true || (electronApp && electronApp.isPackaged === false)) {
        candidates.push(path.resolve(__dirname, "../../runtime/yt-dlp.exe"));
    }
    return Array.from(new Set(candidates.filter(Boolean)));
}
// ─── Metadata Parsers ───────────────────────────────────────────────────────
function formatDuration(seconds) {
    if (!seconds || seconds <= 0)
        return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}
function formatFileSize(size) {
    return size && size > 0 ? size : 0;
}
function extractThumbnail(raw) {
    if (raw.thumbnail)
        return raw.thumbnail;
    if (raw.thumbnails && raw.thumbnails.length > 0) {
        return raw.thumbnails[0]?.url ?? "";
    }
    return "";
}
function parseVideoMetadata(raw, linkType, index = 1, sourceUrl) {
    const videoId = raw.id ?? `unknown-${index}`;
    const formats = raw.formats ?? [];
    const thumbnail = extractThumbnail(raw) || (videoId !== `unknown-${index}`
        ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
        : "");
    // Extract available quality options
    const heights = new Set();
    formats.forEach((f) => {
        const height = getFormatHeight(f);
        if (height && height > 0) {
            heights.add(height);
        }
    });
    const sortedHeights = Array.from(heights).sort((a, b) => b - a);
    const qualityOptions = sortedHeights.length > 0
        ? sortedHeights.map((h) => `${h}p`)
        : ["1080p", "720p", "480p", "360p", "240p", "144p"];
    const videoFormats = new Set(formats
        .map((f) => f.ext)
        .filter((ext) => !!ext)
        .filter((ext) => ["mp4", "webm", "mkv"].includes(ext)));
    const audioFormats = new Set(["mp3", "opus"]);
    // Best format info
    const bestFormat = formats.find((f) => getFormatHeight(f)) ?? formats[0];
    const bestFormatHeight = bestFormat ? getFormatHeight(bestFormat) : undefined;
    const resolution = bestFormatHeight
        ? `${bestFormatHeight}p`
        : "1080p";
    const fps = bestFormat?.fps ?? 30;
    const videoCodec = bestFormat?.vcodec ?? "H.264";
    const audioCodec = bestFormat?.acodec ?? "AAC";
    const videoBitrate = bestFormat?.tbr
        ? `${(bestFormat.tbr / 1000).toFixed(1)} Mbps`
        : "0 Mbps";
    const audioBitrate = bestFormat?.abr
        ? `${Math.round(bestFormat.abr)} Kbps`
        : "0 Kbps";
    const fileSize = formatFileSize(bestFormat?.filesize ?? bestFormat?.filesize_approx);
    return {
        id: `yt-${linkType}-${videoId}`,
        sourceUrl: raw.webpage_url ?? sourceUrl ?? (videoId !== `unknown-${index}`
            ? `https://www.youtube.com/watch?v=${videoId}`
            : ""),
        linkType,
        thumbnail,
        title: raw.title ?? "Unknown Title",
        channelName: raw.uploader ?? raw.channel ?? "Unknown Channel",
        duration: formatDuration(raw.duration),
        views: raw.view_count ?? 0,
        qualityOptions: qualityOptions.length > 0
            ? qualityOptions
            : ["1080p", "720p", "480p"],
        videoFormats: Array.from(videoFormats).slice(0, 3), // Limit to 3
        audioFormats: Array.from(audioFormats),
        resolution,
        fps,
        videoCodec,
        audioCodec,
        videoBitrate,
        audioBitrate,
        container: bestFormat?.ext ?? "mp4",
        fileSize,
        uploadDate: raw.upload_date ??
            new Date().toISOString().split("T")[0] ??
            ""
    };
}
function parsePlaylistMetadata(raw, url) {
    const playlistId = raw.id ?? "unknown-playlist";
    const entries = raw.entries ?? [];
    const videos = entries
        .map((entry, index) => {
        const entryUrl = entry.url?.startsWith("http") ? entry.url : undefined;
        return parseVideoMetadata(entry, "playlist-video", index + 1, entryUrl);
    });
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
    // Parse first 4 videos as latest videos preview
    const latestVideos = entries
        .slice(0, 4)
        .map((entry, index) => parseVideoMetadata(entry, "video", index + 1));
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
// ─── NativeMetadataService ──────────────────────────────────────────────────
class NativeMetadataService {
    constructor(settingsYtdlpPath, executor) {
        this.settingsYtdlpPath = settingsYtdlpPath;
        this.ytdlpPath = null;
        this.metadataCache = new MetadataCache(100, 1000 * 60 * 60);
        this.executor = executor ?? new DefaultProcessExecutor();
    }
    /**
     * Resolves yt-dlp executable path.
     * Priority: settingsPath → system PATH.
     */
    async resolveYtdlpPath() {
        // Priority 1: Settings-provided path
        if (this.settingsYtdlpPath && this.settingsYtdlpPath.trim()) {
            try {
                await this.executor.checkAccess(this.settingsYtdlpPath, promises_1.constants.F_OK);
                console.log(`[MetadataService] Resolved yt-dlp from settings: ${this.settingsYtdlpPath}`);
                return this.settingsYtdlpPath;
            }
            catch {
                // Invalid settings path - fall through to PATH
            }
        }
        for (const candidate of bundledYtdlpCandidates()) {
            try {
                await this.executor.checkAccess(candidate, promises_1.constants.F_OK);
                console.log(`[MetadataService] Resolved bundled yt-dlp path: ${candidate}`);
                return candidate;
            }
            catch {
                // Try the next bundled or PATH candidate.
            }
        }
        // Priority 2: System PATH (try common names)
        const candidates = [
            "yt-dlp",
            "yt-dlp.exe",
            "youtube-dl",
            "youtube-dl.exe"
        ];
        for (const candidate of candidates) {
            try {
                // Try spawning with --version to verify it exists and works
                await new Promise((resolve, reject) => {
                    const proc = this.executor.spawn(candidate, ["--version"], { timeout: 5000 });
                    proc.on("error", reject);
                    proc.on("exit", (code) => {
                        if (code === 0) {
                            resolve();
                        }
                        else {
                            reject(new Error(`Exit code ${code}`));
                        }
                    });
                });
                console.log(`[MetadataService] Resolved yt-dlp from system PATH: ${candidate}`);
                return candidate;
            }
            catch {
                // Try next candidate
            }
        }
        console.error("[MetadataService] Could not resolve yt-dlp executable from any candidate path");
        throw new Error("ytdlp_not_found");
    }
    /**
     * Spawns yt-dlp process and returns parsed JSON output.
     * Optimized for speed with faster options.
     */
    async executeYtdlp(ytdlpPath, url, isPlaylist = false, extractorArg) {
        return new Promise((resolve, reject) => {
            const args = [
                "--dump-single-json",
                isPlaylist ? "--yes-playlist" : "--no-playlist",
                ...(isPlaylist ? ["--flat-playlist"] : []),
                ...(extractorArg ? ["--extractor-args", extractorArg] : []),
                "--skip-download",
                "--no-warnings",
                url
            ];
            const timeout = isPlaylist
                ? PLAYLIST_TIMEOUT_MS
                : YTDLP_TIMEOUT_MS;
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
                console.error(`[MetadataService] yt-dlp process spawn error (${ytdlpPath}):`, err);
                if (err.code === "ETIMEDOUT") {
                    reject(new Error("ytdlp_timeout"));
                }
                else if (err.code === "ENOENT") {
                    reject(new Error("ytdlp_not_found"));
                }
                else {
                    reject(new Error("ytdlp_spawn_failed"));
                }
            });
            proc.on("exit", (code) => {
                if (code === 0) {
                    try {
                        const parsed = JSON.parse(stdout);
                        resolve(parsed);
                    }
                    catch (jsonErr) {
                        console.error(`[MetadataService] Failed to parse yt-dlp output JSON (${ytdlpPath}):`, jsonErr, `stdout:`, stdout.slice(0, 300));
                        reject(new Error("ytdlp_invalid_json"));
                    }
                }
                else {
                    console.error(`[MetadataService] yt-dlp exited with non-zero code ${code}. Path: ${ytdlpPath}, Stderr:`, stderr);
                    // Map common yt-dlp error messages
                    const stderrLower = stderr.toLowerCase();
                    if (stderrLower.includes("private video") ||
                        stderrLower.includes("members-only")) {
                        reject(new Error("video_private"));
                    }
                    else if (stderrLower.includes("video unavailable") ||
                        stderrLower.includes("not available")) {
                        reject(new Error("video_unavailable"));
                    }
                    else if (stderrLower.includes("unsupported url")) {
                        reject(new Error("unsupported_url"));
                    }
                    else if (stderrLower.includes("network") ||
                        stderrLower.includes("connection")) {
                        reject(new Error("network_error"));
                    }
                    else {
                        reject(new Error("ytdlp_failed"));
                    }
                }
            });
        });
    }
    isRetryableYtdlpFailure(error) {
        const message = String(error).toLowerCase();
        return [
            "video unavailable",
            "not available",
            "private video",
            "members-only",
            "network",
            "connection",
            "ytdlp_failed",
            "ytdlp_timeout",
            "unsupported_url"
        ].some((token) => message.includes(token));
    }
    async executeYtdlpWithFallback(ytdlpPath, url, isPlaylist = false) {
        const extractorArgCandidates = [
            undefined,
            "youtube:player_client=web",
            "youtube:player_client=android",
            "youtube:player_client=ios",
            "youtube:player_client=web_safari",
            "youtube:player_client=tv_embedded",
        ];
        let lastError = null;
        for (const extractorArg of extractorArgCandidates) {
            try {
                return await this.executeYtdlp(ytdlpPath, url, isPlaylist, extractorArg);
            }
            catch (error) {
                lastError = error;
                if (!this.isRetryableYtdlpFailure(error)) {
                    throw error;
                }
            }
        }
        throw lastError ?? new Error("ytdlp_failed");
    }
    /**
     * Analyzes a YouTube URL using yt-dlp and returns typed AnalysisResult.
     */
    async analyze(url) {
        // Validate input
        if (!url || typeof url !== "string") {
            throw new Error("invalid_url");
        }
        const trimmedUrl = url.trim();
        if (!trimmedUrl) {
            throw new Error("invalid_url");
        }
        // Validate parseable URL
        try {
            new URL(trimmedUrl);
        }
        catch {
            throw new Error("invalid_url");
        }
        // Validate YouTube URL
        if (!isYouTubeUrl(trimmedUrl)) {
            throw new Error("unsupported_url");
        }
        // 🚀 Check cache first for instant results
        const cachedResult = this.metadataCache.get(trimmedUrl);
        if (cachedResult) {
            console.log(`[MetadataService] Cache hit for ${trimmedUrl}`);
            return cachedResult;
        }
        // Resolve yt-dlp path (cached after first successful resolution)
        if (!this.ytdlpPath) {
            this.ytdlpPath = await this.resolveYtdlpPath();
        }
        // Classify link type
        const linkType = classifyYouTubeUrl(trimmedUrl);
        let result;
        // Handle different link types
        if (linkType === "playlist" || linkType === "channel") {
            const raw = await this.executeYtdlpWithFallback(this.ytdlpPath, trimmedUrl, true);
            if (linkType === "playlist") {
                result = parsePlaylistMetadata(raw, trimmedUrl);
            }
            else {
                result = parseChannelMetadata(raw, trimmedUrl);
            }
        }
        else {
            // video | shorts | playlist-video
            const raw = await this.executeYtdlpWithFallback(this.ytdlpPath, trimmedUrl, false);
            result = parseVideoMetadata(raw, linkType, 1);
        }
        // 💾 Cache the result for future requests (shared cache)
        this.metadataCache.set(trimmedUrl, result);
        console.log(`[MetadataService] Cached metadata for ${trimmedUrl}`);
        return result;
    }
}
exports.NativeMetadataService = NativeMetadataService;
//# sourceMappingURL=nativeMetadataService.js.map