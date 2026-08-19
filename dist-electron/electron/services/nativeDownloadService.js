"use strict";
/**
 * NativeDownloadService — Real yt-dlp download engine for Electron Main Process.
 *
 * Architecture:
 * - Uses yt-dlp child_process for actual downloads
 * - Manages active download processes with Map<id, ActiveDownload>
 * - Emits progress events via EventEmitter
 * - Supports pause (kill process + keep .part), resume (restart with --continue)
 * - Respects concurrent download slots from settings
 * - Uses ProcessExecutor abstraction for testability (same pattern as NativeMetadataService)
 *
 * Pause/Resume Strategy (Architectural Decision):
 * - Pause = terminate yt-dlp process cleanly, preserve partial .part file
 * - Resume = restart yt-dlp with --continue flag to resume from .part file
 * - This approach works on Windows (no SIGSTOP/SIGCONT needed)
 * - Resume may fail if source doesn't support range requests (handled as error)
 *
 * Security:
 * - shell: false always
 * - URL passed as separate argument (no command injection)
 * - No secrets in logs
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
exports.NativeDownloadService = exports.DefaultProcessExecutor = void 0;
const events_1 = require("events");
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const fs_1 = require("fs");
/**
 * Default ProcessExecutor using Node.js built-ins
 */
class DefaultProcessExecutor {
    spawn(command, args, options) {
        const { spawn } = require("child_process");
        return spawn(command, args, options);
    }
    checkAccess(path, mode) {
        return fs.access(path, mode);
    }
}
exports.DefaultProcessExecutor = DefaultProcessExecutor;
/**
 * Native Download Service for Electron Main Process
 */
class NativeDownloadService extends events_1.EventEmitter {
    constructor(settings, executor) {
        super();
        this.activeDownloads = new Map();
        this.processGenerations = new Map();
        this.items = new Map();
        this.ytdlpPath = null;
        this.settings = settings;
        this.executor = executor ?? new DefaultProcessExecutor();
    }
    /**
     * Update settings
     */
    updateSettings(settings) {
        // Keep the previous path before replacing settings.
        const previousYtdlpPath = this.settings.ytdlpPath;
        this.settings = settings;
        // Invalidate cached yt-dlp path only if the configured path changed.
        if (settings.ytdlpPath !== previousYtdlpPath) {
            this.ytdlpPath = null;
        }
    }
    /**
     * Resolves yt-dlp executable path
     *
     * Priority:
     * 1. Settings ytdlpPath
     * 2. System PATH candidates
     */
    async resolveYtdlpPath() {
        // Priority 1: Settings-provided path
        if (this.settings.ytdlpPath &&
            this.settings.ytdlpPath.trim()) {
            try {
                await this.executor.checkAccess(this.settings.ytdlpPath, fs_1.constants.X_OK);
                return this.settings.ytdlpPath;
            }
            catch {
                // Invalid settings path - fall through to PATH.
            }
        }
        // Priority 2: System PATH
        const candidates = [
            "yt-dlp",
            "yt-dlp.exe",
            "youtube-dl",
            "youtube-dl.exe"
        ];
        for (const candidate of candidates) {
            try {
                await new Promise((resolve, reject) => {
                    const proc = this.executor.spawn(candidate, ["--version"], {
                        timeout: 5000
                    });
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
                return candidate;
            }
            catch {
                // Try next candidate.
            }
        }
        throw new Error("ytdlp_not_found");
    }
    /**
     * Builds yt-dlp arguments array for download
     */
    buildYtdlpArgs(item, outputPath, isResume) {
        const args = [];
        const isAudioFormat = [
            "mp3",
            "opus"
        ].includes(item.format ?? "");
        // Continue from partial download if resume.
        if (isResume) {
            args.push("--continue");
        }
        else {
            args.push("--no-continue");
            args.push("--force-overwrites");
        }
        // Output path
        args.push("-o", outputPath);
        // Quality / format selection
        if (isAudioFormat) {
            args.push("-f", "bestaudio/best");
            args.push("--extract-audio");
            args.push("--audio-format", item.format);
            args.push("--audio-quality", "0");
        }
        else if (item.quality &&
            item.quality !== "auto") {
            const height = item.quality.replace("p", "");
            args.push("-f", `bestvideo[height<=${height}]+bestaudio/best`);
        }
        else {
            args.push("-f", "best");
        }
        // Merge output format
        if (item.format &&
            item.format !== "auto" &&
            !isAudioFormat) {
            args.push("--merge-output-format", item.format);
            args.push("--remux-video", item.format);
        }
        // YouTube client workaround
        args.push("--extractor-args", "youtube:player_client=android");
        // Speed limit
        if (this.settings.speedLimit !== "unlimited") {
            const limitKB = Math.floor(this.settings.speedLimit / 1024);
            args.push("-r", `${limitKB}K`);
        }
        // FFmpeg location
        if (this.settings.ffmpegPath &&
            this.settings.ffmpegPath.trim()) {
            args.push("--ffmpeg-location", this.settings.ffmpegPath);
        }
        // Fragment retries
        args.push("--fragment-retries", "10");
        // Retry on network errors
        args.push("--retries", "10");
        args.push("--retry-sleep", "5");
        // Geo bypass
        args.push("--geo-bypass");
        // Wait for availability
        args.push("-w");
        // Progress output
        args.push("--newline");
        args.push("--progress-template", "download:%(progress._percent_str)s|%(progress._downloaded_bytes_str)s|%(progress._total_bytes_str)s|%(progress._speed_str)s|%(progress._eta_str)s");
        // No warnings
        args.push("--no-warnings");
        // URL - always last and passed as separate argument.
        args.push(item.sourceUrl);
        return args;
    }
    /**
     * Parse yt-dlp progress line.
     *
     * Supports:
     *
     * download:15.2%|1.5MiB|10MiB|500KiB/s|00:15
     *
     * and:
     *
     * [download] 15.3% of 10.0MiB at 1.0MiB/s ETA 00:05
     */
    parseProgressLine(line) {
        const normalized = line.trim();
        if (!normalized) {
            return null;
        }
        const data = normalized.startsWith("download:")
            ? normalized.substring("download:".length)
            : normalized.replace(/^\[download\]\s*/i, "");
        if (!data) {
            return null;
        }
        const pipeParts = data.split("|");
        if (pipeParts.length >= 5) {
            const [percentPart, downloadedPart, totalPart, speedPart, etaPart] = pipeParts;
            const progress = parseFloat(percentPart.trim().replace("%", "")) || 0;
            const totalSize = this.parseSize(totalPart.trim());
            let downloadedSize = this.parseSize(downloadedPart.trim());
            if (downloadedSize === 0 &&
                totalSize > 0 &&
                progress > 0) {
                downloadedSize = Math.min(totalSize, Math.round((progress / 100) * totalSize));
            }
            const speed = this.parseSize(speedPart
                .trim()
                .replace(/\/s$/i, ""));
            const eta = etaPart.trim() === "Unknown ETA"
                ? "--"
                : etaPart.trim() || "--";
            return {
                progress: Math.min(100, progress),
                downloadedSize,
                totalSize,
                speed,
                eta
            };
        }
        const percentMatch = data.match(/(\d+(?:\.\d+)?)%/i);
        if (!percentMatch) {
            return null;
        }
        const progress = parseFloat(percentMatch[1]) || 0;
        const totalMatch = data.match(/of\s+(\d+(?:\.\d+)?)\s*([KMGT]?i?B)/i);
        const totalSize = this.parseSize(totalMatch
            ? `${totalMatch[1]}${totalMatch[2]}`
            : "0B");
        const speedMatch = data.match(/at\s+(\d+(?:\.\d+)?)\s*([KMGT]?i?B)\/s/i) ||
            data.match(/(\d+(?:\.\d+)?)\s*([KMGT]?i?B)\/s/i);
        const speed = speedMatch
            ? this.parseSize(`${speedMatch[1]}${speedMatch[2]}`)
            : 0;
        const etaMatch = data.match(/ETA\s+([0-9:]+|N\/A|Unknown ETA|Unknown)/i);
        const eta = etaMatch &&
            etaMatch[1] &&
            etaMatch[1].toLowerCase() !== "unknown" &&
            etaMatch[1].toLowerCase() !== "n/a"
            ? etaMatch[1]
            : "--";
        const downloadedSize = totalSize > 0
            ? Math.min(totalSize, Math.round((progress / 100) * totalSize))
            : 0;
        return {
            progress: Math.min(100, progress),
            downloadedSize,
            totalSize,
            speed,
            eta
        };
    }
    /**
     * Parse size string to bytes
     */
    parseSize(sizeStr) {
        if (!sizeStr ||
            sizeStr === "N/A" ||
            sizeStr === "Unknown") {
            return 0;
        }
        const normalized = sizeStr
            .trim()
            .replace(/\s*\/s$/i, "");
        const match = normalized.match(/^([\d.]+)\s*([KMGT]i?B)?$/i);
        if (!match) {
            return 0;
        }
        const value = parseFloat(match[1]);
        const unit = (match[2] || "B").toUpperCase();
        const multipliers = {
            B: 1,
            KB: 1000,
            KIB: 1024,
            MB: 1000 * 1000,
            MIB: 1024 * 1024,
            GB: 1000 * 1000 * 1000,
            GIB: 1024 * 1024 * 1024,
            TB: 1000 * 1000 * 1000 * 1000,
            TIB: 1024 * 1024 * 1024 * 1024
        };
        return Math.floor(value *
            (multipliers[unit] || 1));
    }
    /**
     * Emits progress event to Main Process
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
     * Ingest yt-dlp stdout/stderr chunks
     * and emit progress updates.
     */
    ingestProgressOutput(itemId, generation, activeDownload, chunk, lineBuffer) {
        if (activeDownload.isStopped) {
            return;
        }
        lineBuffer.value += chunk;
        const lines = lineBuffer.value.split("\n");
        lineBuffer.value =
            lines.pop() || "";
        for (const line of lines) {
            const progress = this.parseProgressLine(line.trim());
            if (!progress) {
                continue;
            }
            if (!this.isCurrentProcess(itemId, generation)) {
                continue;
            }
            activeDownload.lastProgressTime =
                Date.now();
            this.emitProgress(itemId, progress);
            const currentItem = this.items.get(itemId);
            if (currentItem) {
                this.items.set(itemId, {
                    ...currentItem,
                    progress: progress.progress,
                    downloadedSize: progress.downloadedSize,
                    fileSize: progress.totalSize ||
                        currentItem.fileSize,
                    speed: progress.speed,
                    eta: progress.eta,
                    lastUpdatedAt: Date.now()
                });
            }
        }
    }
    async isOutputFileComplete(outputPath, item) {
        try {
            const stat = await fs.stat(outputPath);
            if (stat.size <= 0) {
                return false;
            }
            const isNearComplete = stat.size >=
                item.fileSize * 0.9;
            const isEqual = stat.size >=
                item.fileSize * 0.99;
            return (item.progress >= 95 ||
                isNearComplete ||
                isEqual);
        }
        catch {
            return false;
        }
    }
    async markDownloadCompleted(id, outputPath) {
        const currentItem = this.items.get(id);
        if (!currentItem) {
            return;
        }
        this.updateItemStatus(id, "merging");
        this.emitStateChange(id, "merging");
        this.updateItemStatus(id, "converting");
        this.emitStateChange(id, "converting");
        const finalFileSize = await this.resolveCompletedFileSize(outputPath, currentItem.fileSize);
        this.updateItemStatus(id, "completed", {
            progress: 100,
            fileSize: finalFileSize,
            downloadedSize: finalFileSize,
            speed: 0,
            eta: "--"
        });
        this.emitStateChange(id, "completed");
        console.log(`[Download] ✓ Marked as completed: ${id} (actual size: ${finalFileSize} bytes)`);
    }
    /**
     * Emits state change event
     */
    emitStateChange(id, status, errorCode, errorMessage) {
        const item = this.items.get(id);
        if (!item) {
            console.warn(`[Download] Cannot emit state change for unknown item: ${id}`);
            return;
        }
        console.log(`[Download] State change: ${id} → ${status} (progress: ${item.progress}%, downloaded: ${item.downloadedSize} bytes)`);
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
        const next = (this.processGenerations.get(id) ?? 0) +
            1;
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
        return [
            "downloading",
            "retrying"
        ].includes(currentItem.status);
    }
    /**
     * Resolve download folder
     */
    resolveDownloadFolder(downloadFolder) {
        if (!downloadFolder ||
            downloadFolder.trim() === "") {
            return (process.env.HOME ||
                process.env.USERPROFILE ||
                process.cwd());
        }
        if (downloadFolder === "~") {
            return (process.env.HOME ||
                process.env.USERPROFILE ||
                process.cwd());
        }
        if (downloadFolder.startsWith("~/") ||
            downloadFolder.startsWith("~\\")) {
            const homeDir = process.env.HOME ||
                process.env.USERPROFILE ||
                process.cwd();
            return path.join(homeDir, downloadFolder.slice(2));
        }
        return downloadFolder;
    }
    async resolveCompletedFileSize(outputPath, estimatedSize) {
        try {
            const stat = await fs.stat(outputPath);
            if (stat.size > 0) {
                return stat.size;
            }
        }
        catch {
            // Ignore stat errors.
        }
        return Math.max(estimatedSize, 0);
    }
    /**
     * Kill process tree
     */
    killProcessTree(proc) {
        if (!proc ||
            !proc.pid) {
            console.warn(`[Download] killProcessTree called but process is null or has no PID`);
            return;
        }
        const pid = proc.pid;
        console.log(`[Download] Attempting to kill process tree for PID: ${pid}`);
        try {
            console.log(`[Download] Sending SIGKILL to PID ${pid}...`);
            proc.kill("SIGKILL");
            console.log(`[Download] ✓ Sent SIGKILL to PID ${pid}`);
        }
        catch (err) {
            console.warn(`[Download] SIGKILL failed for PID ${pid}:`, err);
        }
        const isWindows = process.platform === "win32";
        if (isWindows) {
            try {
                console.log(`[Download] Attempting taskkill for PID ${pid} (Windows) with /F /T flags`);
                const killer = (0, child_process_1.spawn)("taskkill", [
                    "/PID",
                    String(pid),
                    "/T",
                    "/F"
                ], {
                    stdio: "pipe",
                    windowsHide: true
                });
                let killOutput = "";
                let killError = "";
                killer.stdout?.on("data", (data) => {
                    killOutput +=
                        data.toString();
                });
                killer.stderr?.on("data", (data) => {
                    killError +=
                        data.toString();
                });
                killer.on("exit", (code) => {
                    if (code === 0) {
                        console.log(`[Download] ✓ taskkill succeeded for PID ${pid}: ${killOutput.trim()}`);
                    }
                    else if (code === 128) {
                        console.log(`[Download] ✓ Process ${pid} not found (already dead), exit code 128`);
                    }
                    else {
                        console.warn(`[Download] taskkill failed with code ${code} for PID ${pid}: ${killError.trim()}`);
                    }
                });
                killer.on("error", (err) => {
                    console.warn(`[Download] taskkill error for PID ${pid}:`, err);
                });
            }
            catch (err) {
                console.warn(`[Download] Failed to spawn taskkill for PID ${pid}:`, err);
            }
        }
    }
    async cleanupStaleDownloadArtifacts(outputPath) {
        const candidates = [
            outputPath,
            `${outputPath}.part`
        ];
        for (const candidate of candidates) {
            try {
                await fs.rm(candidate, {
                    force: true
                });
            }
            catch {
                // Ignore cleanup errors.
            }
        }
    }
    /**
     * Spawn yt-dlp process for download
     */
    async spawnDownload(item, isResume) {
        // Resolve yt-dlp path.
        if (!this.ytdlpPath) {
            this.ytdlpPath =
                await this.resolveYtdlpPath();
        }
        // Build output path.
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
            // Check .part file.
            try {
                const stat = await fs.stat(partialPath);
                partialFileSize =
                    stat.size;
                hasPartialFile =
                    true;
                console.log(`[Download] ✓ Partial file found: ${partialFileSize} bytes, will resume from .part`);
            }
            catch {
                console.log(`[Download] ℹ Partial .part file not found, checking main output file...`);
            }
            // Check main output file.
            if (!hasPartialFile) {
                try {
                    const stat = await fs.stat(outputPath);
                    mainFileSize =
                        stat.size;
                    hasMainFile =
                        mainFileSize > 0;
                    if (hasMainFile) {
                        console.log(`[Download] ✓ Main file found: ${mainFileSize} bytes, will continue from it`);
                    }
                }
                catch {
                    console.log(`[Download] ℹ Main output file doesn't exist either`);
                }
            }
            canResume =
                hasPartialFile ||
                    (hasMainFile &&
                        mainFileSize <
                            item.fileSize);
            if (!canResume) {
                console.warn(`[Download] ✗ Cannot resume: no partial file and main file is either missing or complete, will start fresh`);
            }
        }
        // Cleanup only when starting fresh.
        if (!canResume &&
            !isResume) {
            console.log(`[Download] Cleaning up stale artifacts...`);
            await this.cleanupStaleDownloadArtifacts(outputPath);
        }
        const args = this.buildYtdlpArgs(item, outputPath, canResume);
        console.log(`[Download] Starting yt-dlp with ${canResume ? "RESUME" : "FRESH"} (${args.length} args)`);
        const proc = this.executor.spawn(this.ytdlpPath, args, {
            windowsHide: true,
            shell: false
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
        console.log(`[Download] ✓ Added to activeDownloads: ${item.id} (generation: ${generation}, PID: ${proc.pid})`);
        this.updateItemStatus(item.id, "downloading");
        this.emitStateChange(item.id, "downloading");
        let stdoutBuffer = {
            value: ""
        };
        let stderrProgressBuffer = {
            value: ""
        };
        let stderrBuffer = "";
        proc.stdout?.on("data", (data) => {
            this.ingestProgressOutput(item.id, generation, activeDownload, data.toString(), stdoutBuffer);
        });
        proc.stderr?.on("data", (data) => {
            const chunk = data.toString();
            stderrBuffer +=
                chunk;
            this.ingestProgressOutput(item.id, generation, activeDownload, chunk, stderrProgressBuffer);
        });
        /**
         * Handle process exit
         */
        proc.on("exit", async (code) => {
            if (activeDownload.isStopped) {
                this.activeDownloads.delete(item.id);
                return;
            }
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
            if (code === 0 ||
                fileComplete) {
                console.log(`[Download] ✓ Download completed successfully: ${item.id}`);
                await this.markDownloadCompleted(item.id, outputPath);
                return;
            }
            if (code === 8 ||
                stderrBuffer
                    .toLowerCase()
                    .includes("error") === false) {
                console.log(`[Download] Exit code ${code} - checking if file exists...`);
                if (fileComplete) {
                    console.log(`[Download] ✓ Output file complete despite exit code ${code}, marking as completed`);
                    await this.markDownloadCompleted(item.id, outputPath);
                    return;
                }
                console.warn(`[Download] ✗ Download failed with exit code ${code}`);
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
            console.warn(`[Download] ✗ Download failed with exit code ${code}`);
            if (currentItem.status !==
                "paused" &&
                currentItem.status !==
                    "canceled") {
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
        /**
         * Handle spawn errors
         */
        proc.on("error", (err) => {
            if (!this.isCurrentProcess(item.id, generation)) {
                return;
            }
            this.activeDownloads.delete(item.id);
            let errorCode = "ytdlp_error";
            let errorMessage = "Failed to spawn yt-dlp process";
            if (err.code === "ENOENT") {
                errorCode =
                    "ytdlp_not_found";
                errorMessage =
                    "yt-dlp executable not found";
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
        if (!stderr ||
            stderr.trim().length === 0) {
            return {
                code: "ytdlp_error",
                message: `Download failed with exit code ${exitCode}`
            };
        }
        const stderrLower = stderr.toLowerCase();
        if (stderrLower.includes("private video") ||
            stderrLower.includes("members-only")) {
            return {
                code: "video_private",
                message: "Video is private or members-only"
            };
        }
        if (stderrLower.includes("video unavailable") ||
            stderrLower.includes("not available")) {
            return {
                code: "video_unavailable",
                message: "Video is unavailable or was removed"
            };
        }
        if (stderrLower.includes("unsupported url")) {
            return {
                code: "unsupported_url",
                message: "URL is not supported"
            };
        }
        if (stderrLower.includes("http error 4") ||
            stderrLower.includes("403") ||
            stderrLower.includes("404")) {
            return {
                code: "video_unavailable",
                message: "Video not found or access denied (HTTP 4xx)"
            };
        }
        if (stderrLower.includes("http error 5") ||
            stderrLower.includes("502") ||
            stderrLower.includes("503")) {
            return {
                code: "network_error",
                message: "Server error - try again later (HTTP 5xx)"
            };
        }
        if (stderrLower.includes("network error") ||
            stderrLower.includes("connection error") ||
            stderrLower.includes("timeout error")) {
            return {
                code: "network_error",
                message: "Network error - check your connection"
            };
        }
        if (stderrLower.includes("ffmpeg error") ||
            stderrLower.includes("ffmpeg failed") ||
            stderrLower.includes("postprocessor error")) {
            return {
                code: "ffmpeg_error",
                message: "FFmpeg processing failed - check FFmpeg installation"
            };
        }
        return {
            code: "ytdlp_error",
            message: `Download failed with exit code ${exitCode}`
        };
    }
    /**
     * Updates item in memory
     */
    updateItemStatus(id, status, updates) {
        const item = this.items.get(id);
        if (!item) {
            return;
        }
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
     * Start download
     */
    async start(id) {
        const item = this.items.get(id);
        if (!item) {
            throw new Error(`Download item not found: ${id}`);
        }
        const activeCount = Array.from(this.items.values()).filter((i) => i.id !== id &&
            [
                "downloading",
                "retrying",
                "merging",
                "converting"
            ].includes(i.status)).length;
        if (activeCount >=
            this.settings.concurrentDownloads) {
            throw new Error("Concurrent download limit reached");
        }
        try {
            await this.spawnDownload(item, false);
        }
        catch (err) {
            const errorMessage = err instanceof Error
                ? err.message
                : "Unknown error";
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
     * Pause download
     *
     * Kill process + keep partial file.
     */
    async pause(id) {
        const item = this.items.get(id);
        if (!item) {
            throw new Error(`Download item not found: ${id}`);
        }
        console.log(`[Download] PAUSE requested for: ${id} (current status: ${item.status})`);
        const activeDownload = this.activeDownloads.get(id);
        if (activeDownload &&
            activeDownload.process) {
            console.log(`[Download] ✓ Found active process for ${id}, marking as stopped...`);
            activeDownload.isStopped =
                true;
            const proc = activeDownload.process;
            if (proc.stdout &&
                typeof proc.stdout.destroy ===
                    "function") {
                proc.stdout.destroy();
                console.log(`[Download] ✓ Closed stdout stream for ${id}`);
            }
            if (proc.stderr &&
                typeof proc.stderr.destroy ===
                    "function") {
                proc.stderr.destroy();
                console.log(`[Download] ✓ Closed stderr stream for ${id}`);
            }
            if (proc.stdin &&
                typeof proc.stdin.destroy ===
                    "function") {
                proc.stdin.destroy();
                console.log(`[Download] ✓ Closed stdin stream for ${id}`);
            }
            this.killProcessTree(proc);
            this.activeDownloads.delete(id);
            this.nextProcessGeneration(id);
            console.log(`[Download] ✓ Process killed for ${id}, incremented generation to prevent auto-restart`);
        }
        else {
            console.log(`[Download] ⚠ No active process found for ${id} (activeDownload exists: ${!!activeDownload}, has process: ${!!activeDownload?.process})`);
        }
        const fileName = `${item.title.replace(/[<>:"/\\|?*]/g, "_")}.${item.format}`;
        const outputDir = this.resolveDownloadFolder(this.settings.downloadFolder);
        const outputPath = path.join(outputDir, fileName);
        try {
            const stat = await fs.stat(outputPath);
            const actualSize = stat.size;
            const isNearComplete = actualSize >=
                item.fileSize * 0.9;
            const isEqual = actualSize >=
                item.fileSize * 0.99;
            const shouldComplete = actualSize > 0 &&
                (item.progress >= 95 ||
                    isNearComplete ||
                    isEqual);
            if (shouldComplete) {
                console.log(`[Download] File is ${Math.round((actualSize / (item.fileSize || 1)) * 100)}% complete, marking as completed instead of paused`);
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
        }
        catch {
            console.log(`[Download] Output file doesn't exist yet or can't be accessed`);
        }
        const currentItem = this.items.get(id);
        console.log(`[Download] ✓ Setting status to PAUSED for ${id} (progress: ${currentItem?.progress ?? 0}%)`);
        this.updateItemStatus(id, "paused", {
            speed: 0,
            eta: "--",
            progress: currentItem?.progress ??
                0,
            downloadedSize: currentItem?.downloadedSize ??
                0
        });
        this.emitStateChange(id, "paused");
        return this.items.get(id);
    }
    /**
     * Resume download
     */
    async resume(id) {
        const item = this.items.get(id);
        if (!item) {
            throw new Error(`Download item not found: ${id}`);
        }
        if (item.status !==
            "paused") {
            throw new Error(`Cannot resume download in status: ${item.status}`);
        }
        const activeCount = Array.from(this.items.values()).filter((i) => i.id !== id &&
            [
                "downloading",
                "retrying",
                "merging",
                "converting"
            ].includes(i.status)).length;
        if (activeCount >=
            this.settings.concurrentDownloads) {
            throw new Error("Concurrent download limit reached");
        }
        console.log(`[Download] RESUME requested for: ${id}`);
        console.log(`[Download] Current progress: ${item.progress}%, downloaded: ${item.downloadedSize} bytes`);
        try {
            console.log(`[Download] Attempting to resume with --continue flag...`);
            await this.spawnDownload(item, true);
            console.log(`[Download] ✓ Resume started successfully: ${id}`);
            return this.items.get(id);
        }
        catch (resumeErr) {
            const resumeErrorMsg = resumeErr instanceof Error
                ? resumeErr.message
                : "Resume failed";
            console.warn(`[Download] ⚠ Resume failed: ${resumeErrorMsg}, attempting fresh download...`);
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
                    errorCode: undefined,
                    errorMessage: undefined
                };
                this.items.set(id, freshItem);
                console.log(`[Download] Starting fresh download after resume failed: ${id}`);
                await this.spawnDownload(freshItem, false);
                console.log(`[Download] ✓ Fresh download started after resume fallback: ${id}`);
                return this.items.get(id);
            }
            catch (freshErr) {
                const errorMessage = freshErr instanceof Error
                    ? freshErr.message
                    : "Download failed after fallback";
                const errorCode = errorMessage.includes("unavailable")
                    ? "video_unavailable"
                    : errorMessage.includes("network")
                        ? "network_error"
                        : "ytdlp_error";
                console.error(`[Download] ✗ Both resume and fresh download failed: ${errorMessage}`);
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
     * Cancel download
     *
     * Kill process + preserve current files.
     */
    async cancel(id) {
        const item = this.items.get(id);
        if (!item) {
            throw new Error(`Download item not found: ${id}`);
        }
        console.log(`[Download] CANCEL requested for: ${id} (current status: ${item.status})`);
        const activeDownload = this.activeDownloads.get(id);
        if (activeDownload &&
            activeDownload.process) {
            console.log(`[Download] ✓ Found active process for ${id}, marking as stopped...`);
            activeDownload.isStopped =
                true;
            const proc = activeDownload.process;
            if (proc.stdout &&
                typeof proc.stdout.destroy ===
                    "function") {
                proc.stdout.destroy();
                console.log(`[Download] ✓ Closed stdout stream for ${id}`);
            }
            if (proc.stderr &&
                typeof proc.stderr.destroy ===
                    "function") {
                proc.stderr.destroy();
                console.log(`[Download] ✓ Closed stderr stream for ${id}`);
            }
            if (proc.stdin &&
                typeof proc.stdin.destroy ===
                    "function") {
                proc.stdin.destroy();
                console.log(`[Download] ✓ Closed stdin stream for ${id}`);
            }
            this.killProcessTree(proc);
            this.activeDownloads.delete(id);
            this.nextProcessGeneration(id);
            console.log(`[Download] ✓ Process killed for ${id}`);
        }
        else {
            console.log(`[Download] ⚠ No active process found for ${id}`);
        }
        const fileName = `${item.title.replace(/[<>:"/\\|?*]/g, "_")}.${item.format}`;
        const outputDir = this.resolveDownloadFolder(this.settings.downloadFolder);
        const outputPath = path.join(outputDir, fileName);
        try {
            const stat = await fs.stat(outputPath);
            const actualSize = stat.size;
            const isNearComplete = actualSize >=
                item.fileSize * 0.9;
            const isEqual = actualSize >=
                item.fileSize * 0.99;
            const shouldComplete = actualSize > 0 &&
                (item.progress >= 95 ||
                    isNearComplete ||
                    isEqual);
            if (shouldComplete) {
                console.log(`[Download] File is ${Math.round((actualSize / (item.fileSize || 1)) * 100)}% complete, marking as completed instead of canceled`);
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
        }
        catch {
            console.log(`[Download] Output file doesn't exist yet or can't be accessed`);
        }
        const currentItem = this.items.get(id);
        console.log(`[Download] ✓ Setting status to CANCELED for ${id} (progress: ${currentItem?.progress ?? 0}%)`);
        this.updateItemStatus(id, "canceled", {
            speed: 0,
            eta: "--",
            progress: currentItem?.progress ??
                0,
            downloadedSize: currentItem?.downloadedSize ??
                0
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
        if (item.status !==
            "failed" &&
            item.status !==
                "canceled") {
            throw new Error(`Cannot retry download in status: ${item.status}`);
        }
        const activeCount = Array.from(this.items.values()).filter((i) => i.id !== id &&
            [
                "downloading",
                "retrying",
                "merging",
                "converting"
            ].includes(i.status)).length;
        if (activeCount >=
            this.settings.concurrentDownloads) {
            throw new Error("Concurrent download limit reached");
        }
        const shouldResume = true;
        const resetItem = {
            ...item,
            status: "retrying",
            speed: 0,
            eta: "--",
            retryCount: item.retryCount + 1,
            errorCode: undefined,
            errorMessage: undefined,
            lastUpdatedAt: Date.now()
        };
        this.items.set(id, resetItem);
        this.emitStateChange(id, "retrying");
        setTimeout(() => {
            void this.spawnDownload(resetItem, shouldResume);
        }, 0);
        return (this.items.get(id) ??
            resetItem);
    }
    /**
     * Remove download item
     */
    async remove(id) {
        const activeDownload = this.activeDownloads.get(id);
        if (activeDownload &&
            activeDownload.process) {
            activeDownload.process.kill();
            this.activeDownloads.delete(id);
            this.nextProcessGeneration(id);
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
            if (item) {
                result.push(item);
            }
        }
        return result;
    }
    /**
     * Get count of active downloads
     */
    getActiveCount() {
        return Array.from(this.items.values()).filter((i) => [
            "downloading",
            "retrying",
            "merging",
            "converting"
        ].includes(i.status)).length;
    }
    /**
     * Clean up all active downloads
     * Called on app shutdown.
     */
    cleanup() {
        for (const [id, activeDownload] of this.activeDownloads.entries()) {
            activeDownload.isStopped =
                true;
            this.nextProcessGeneration(id);
            if (activeDownload.process) {
                activeDownload.process.kill();
            }
            const item = this.items.get(id);
            if (item &&
                [
                    "downloading",
                    "retrying",
                    "merging",
                    "converting"
                ].includes(item.status)) {
                this.updateItemStatus(id, "canceled", {
                    speed: 0,
                    eta: "--"
                });
            }
        }
        this.activeDownloads.clear();
        this.processGenerations.clear();
    }
}
exports.NativeDownloadService = NativeDownloadService;
//# sourceMappingURL=nativeDownloadService.js.map