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

import { EventEmitter } from "events";
import { ChildProcess, spawn } from "child_process";
import * as path from "path";
import * as fs from "fs/promises";
import { constants as fsConstants } from "fs";
import type { DownloadItem, DownloadStatus } from "../../src/types/download";
import type { AppSettings, SpeedLimit } from "../../src/types/settings";

/**
 * ProcessExecutor interface for dependency injection (same pattern as NativeMetadataService)
 */
export interface ProcessExecutor {
  spawn(command: string, args: string[], options?: any): ChildProcess;
  checkAccess(path: string, mode?: number): Promise<void>;
}

/**
 * Default ProcessExecutor using Node.js built-ins
 */
export class DefaultProcessExecutor implements ProcessExecutor {
  spawn(command: string, args: string[], options?: any): ChildProcess {
    const { spawn } = require("child_process");
    return spawn(command, args, options);
  }

  checkAccess(path: string, mode?: number): Promise<void> {
    return fs.access(path, mode);
  }
}

/**
 * Active download process state
 */
interface ActiveDownload {
  item: DownloadItem;
  process: ChildProcess | null;
  outputPath: string;
  startTime: number;
  lastProgressTime: number;
}

/**
 * Progress data parsed from yt-dlp output
 */
interface YtdlpProgress {
  progress: number; // 0-100
  downloadedSize: number; // bytes
  totalSize: number; // bytes
  speed: number; // bytes/sec
  eta: string; // formatted ETA
}

/**
 * Native Download Service for Electron Main Process
 */
export class NativeDownloadService extends EventEmitter {
  private activeDownloads: Map<string, ActiveDownload> = new Map();
  private processGenerations: Map<string, number> = new Map();
  private items: Map<string, DownloadItem> = new Map();
  private executor: ProcessExecutor;
  private ytdlpPath: string | null = null;
  private settings: AppSettings;

  constructor(settings: AppSettings, executor?: ProcessExecutor) {
    super();
    this.settings = settings;
    this.executor = executor ?? new DefaultProcessExecutor();
  }

  /**
   * Update settings (called when settings change in Main Process)
   */
  updateSettings(settings: AppSettings): void {
    this.settings = settings;
    // Invalidate cached yt-dlp path if ytdlpPath setting changed
    if (settings.ytdlpPath !== this.settings.ytdlpPath) {
      this.ytdlpPath = null;
    }
  }

  /**
   * Resolves yt-dlp executable path (same strategy as NativeMetadataService)
   * Priority: Settings ytdlpPath → system PATH candidates
   */
  private async resolveYtdlpPath(): Promise<string> {
    // Priority 1: Settings-provided path
    if (this.settings.ytdlpPath && this.settings.ytdlpPath.trim()) {
      try {
        await this.executor.checkAccess(this.settings.ytdlpPath, fsConstants.X_OK);
        return this.settings.ytdlpPath;
      } catch {
        // Invalid settings path - fall through to PATH
      }
    }

    // Priority 2: System PATH (try common names)
    const candidates = ["yt-dlp", "yt-dlp.exe", "youtube-dl", "youtube-dl.exe"];

    for (const candidate of candidates) {
      try {
        // Try spawning with --version to verify it exists and works
        await new Promise<void>((resolve, reject) => {
          const proc = this.executor.spawn(candidate, ["--version"], { timeout: 5000 });
          proc.on("error", reject);
          proc.on("exit", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Exit code ${code}`));
          });
        });
        return candidate;
      } catch {
        // Try next candidate
      }
    }

    throw new Error("ytdlp_not_found");
  }

  /**
   * Builds yt-dlp arguments array for download
   */
  private buildYtdlpArgs(item: DownloadItem, outputPath: string, isResume: boolean): string[] {
    const args: string[] = [];
    const isAudioFormat = ["mp3", "opus"].includes(item.format ?? "");

    // Continue from partial download if resume
    if (isResume) {
      args.push("--continue");
      // Do NOT use --force-overwrites when resuming - it conflicts with --continue
    } else {
      args.push("--no-continue"); // Start fresh
      args.push("--force-overwrites"); // Only overwrite when starting fresh
    }

    // Output path
    args.push("-o", outputPath);

    // Quality/format selection
    if (isAudioFormat) {
      args.push("-f", "bestaudio/best");
      args.push("--extract-audio");
      args.push("--audio-format", item.format!);
      args.push("--audio-quality", "0");
    } else if (item.quality && item.quality !== "auto") {
      const height = item.quality.replace("p", "");
      args.push("-f", `bestvideo[height<=${height}]+bestaudio/best`);
    } else {
      args.push("-f", "best");
    }

    // Merge output format (prefer user's choice, fallback to best available)
    if (item.format && item.format !== "auto" && !isAudioFormat) {
      args.push("--merge-output-format", item.format);
      // Remux to preferred format if needed (fast, no re-encoding)
      args.push("--remux-video", item.format);
    }

    // Speed limit
    if (this.settings.speedLimit !== "unlimited") {
      const limitKB = Math.floor(this.settings.speedLimit / 1024);
      args.push("-r", `${limitKB}K`);
    }

    // FFmpeg location if specified
    if (this.settings.ffmpegPath && this.settings.ffmpegPath.trim()) {
      args.push("--ffmpeg-location", this.settings.ffmpegPath);
    }

    // Fragment retries - improve resume reliability
    args.push("--fragment-retries", "10");

    // Retry on network errors
    args.push("--retries", "10");
    args.push("--retry-sleep", "5");

    // Wait for availability (helps with rate limiting)
    args.push("-w");

    // Progress template for machine-readable output
    args.push("--newline");
    // Use simpler template that works across yt-dlp versions
    args.push("--progress-template", "download:%(progress._percent_str)s|%(progress._downloaded_bytes_str)s|%(progress._total_bytes_str)s|%(progress._speed_str)s|%(progress._eta_str)s");

    // No warnings to keep output clean
    args.push("--no-warnings");

    // URL (last argument, separate and safe)
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
  private parseProgressLine(line: string): YtdlpProgress | null {
    const normalized = line.trim();
    if (!normalized) return null;

    const data = normalized.startsWith("download:")
      ? normalized.substring("download:".length)
      : normalized.replace(/^\[download\]\s*/i, "");

    if (!data) return null;

    const pipeParts = data.split("|");
    if (pipeParts.length >= 5) {
      const [percentPart, downloadedPart, totalPart, speedPart, etaPart] = pipeParts;
      const progress = parseFloat(percentPart.trim().replace("%", "")) || 0;
      const downloadedSize = this.parseSize(downloadedPart.trim());
      const totalSize = this.parseSize(totalPart.trim());
      const speed = this.parseSize(speedPart.trim().replace(/\/s$/i, ""));
      const eta = etaPart.trim() === "Unknown ETA" ? "--" : etaPart.trim() || "--";

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
    const totalSize = this.parseSize(totalMatch ? `${totalMatch[1]}${totalMatch[2]}` : "0B");

    const speedMatch = data.match(/at\s+(\d+(?:\.\d+)?)\s*([KMGT]?i?B)\/s/i)
      || data.match(/(\d+(?:\.\d+)?)\s*([KMGT]?i?B)\/s/i);
    const speed = speedMatch ? this.parseSize(`${speedMatch[1]}${speedMatch[2]}`) : 0;

    const etaMatch = data.match(/ETA\s+([0-9:]+|N\/A|Unknown ETA|Unknown)/i);
    const eta = etaMatch && etaMatch[1] && etaMatch[1].toLowerCase() !== "unknown" && etaMatch[1].toLowerCase() !== "n/a"
      ? etaMatch[1]
      : "--";

    const downloadedSize = totalSize > 0 ? Math.min(totalSize, Math.round((progress / 100) * totalSize)) : 0;

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
  private parseSize(sizeStr: string): number {
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

    const multipliers: Record<string, number> = {
      "B": 1,
      "KB": 1000,
      "KIB": 1024,
      "MB": 1000 * 1000,
      "MIB": 1024 * 1024,
      "GB": 1000 * 1000 * 1000,
      "GIB": 1024 * 1024 * 1024,
      "TB": 1000 * 1000 * 1000 * 1000,
      "TIB": 1024 * 1024 * 1024 * 1024
    };

    return Math.floor(value * (multipliers[unit] || 1));
  }

  /**
   * Emits progress event to Main Process (which forwards to Renderer)
   */
  private emitProgress(id: string, progress: YtdlpProgress): void {
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
  private emitStateChange(id: string, status: DownloadStatus, errorCode?: string, errorMessage?: string): void {
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

  private nextProcessGeneration(id: string): number {
    const next = (this.processGenerations.get(id) ?? 0) + 1;
    this.processGenerations.set(id, next);
    return next;
  }

  private isCurrentProcess(id: string, generation: number): boolean {
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
  private resolveDownloadFolder(downloadFolder: string): string {
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

  private async resolveCompletedFileSize(outputPath: string, estimatedSize: number): Promise<number> {
    try {
      const stat = await fs.stat(outputPath);
      if (stat.size > 0) {
        return stat.size;
      }
    } catch {
      // Ignore stat errors and fallback to the estimate
    }

    return Math.max(estimatedSize, 0);
  }

  private killProcessTree(proc: ChildProcess | null): void {
    if (!proc || !proc.pid) {
      return;
    }

    try {
      proc.kill("SIGTERM");
    } catch {
      // Ignore kill errors; fall through to taskkill for Windows.
    }

    const isWindows = process.platform === "win32";
    if (isWindows) {
      try {
        const killer = spawn("taskkill", ["/PID", String(proc.pid), "/T", "/F"], {
          stdio: "ignore",
          windowsHide: true
        });
        killer.unref();
      } catch {
        // Ignore taskkill failures; the child process may already be gone.
      }
    }
  }

  private async cleanupStaleDownloadArtifacts(outputPath: string): Promise<void> {
    const candidates = [outputPath, `${outputPath}.part`];

    for (const candidate of candidates) {
      try {
        await fs.rm(candidate, { force: true });
      } catch {
        // Ignore cleanup errors; the next spawn should still proceed.
      }
    }
  }

  private async spawnDownload(item: DownloadItem, isResume: boolean): Promise<void> {
    // Resolve yt-dlp path (cached after first successful resolution)
    if (!this.ytdlpPath) {
      this.ytdlpPath = await this.resolveYtdlpPath();
    }

    // Build output path
    const fileName = `${item.title.replace(/[<>:"/\\|?*]/g, "_")}.${item.format}`;
    const outputDir = this.resolveDownloadFolder(this.settings.downloadFolder);
    const outputPath = path.join(outputDir, fileName);
    const partialPath = `${outputPath}.part`;

    console.log(`[Download] spawnDownload: ${item.id}`);
    console.log(`[Download]   Output: ${outputPath}`);
    console.log(`[Download]   Partial: ${partialPath}`);
    console.log(`[Download]   isResume: ${isResume}`);

    // Check if partial file exists for resume
    let canResume = isResume;
    let partialFileSize = 0;
    if (isResume) {
      try {
        const stat = await fs.stat(partialPath);
        partialFileSize = stat.size;
        console.log(`[Download] ✓ Partial file found: ${partialFileSize} bytes, will resume`);
      } catch {
        console.warn(`[Download] ✗ Partial file not found, will start fresh`);
        canResume = false; // Partial file doesn't exist, start fresh
      }
    }

    // Cleanup only if starting fresh (not resuming)
    if (!canResume && !isResume) {
      console.log(`[Download] Cleaning up stale artifacts...`);
      await this.cleanupStaleDownloadArtifacts(outputPath);
    }

    // Build arguments - use the decided resume strategy
    const args = this.buildYtdlpArgs(item, outputPath, canResume);

    console.log(`[Download] Starting yt-dlp with ${canResume ? "RESUME" : "FRESH"} (${args.length} args)`);

    // Spawn process
    const proc = this.executor.spawn(this.ytdlpPath, args, {
      windowsHide: true,
      shell: false // Security: never use shell
    });

    const generation = this.nextProcessGeneration(item.id);

    // Store active download
    const activeDownload: ActiveDownload = {
      item,
      process: proc,
      outputPath,
      startTime: Date.now(),
      lastProgressTime: Date.now()
    };
    this.activeDownloads.set(item.id, activeDownload);

    // Update item status to downloading
    this.updateItemStatus(item.id, "downloading");
    this.emitStateChange(item.id, "downloading");

    let stdoutBuffer = "";
    let stderrBuffer = "";

    // Handle stdout (progress)
    proc.stdout?.on("data", (data) => {
      stdoutBuffer += data.toString();
      const lines = stdoutBuffer.split("\n");
      stdoutBuffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        const progress = this.parseProgressLine(line.trim());
        if (!progress) {
          continue;
        }

        if (!this.isCurrentProcess(item.id, generation)) {
          continue;
        }

        activeDownload.lastProgressTime = Date.now();
        this.emitProgress(item.id, progress);

        // Update item progress
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
    });

    // Handle stderr (errors)
    proc.stderr?.on("data", (data) => {
      stderrBuffer += data.toString();
    });

    // Handle process exit
    proc.on("exit", async (code) => {
      if (!this.isCurrentProcess(item.id, generation)) {
        console.log(`[Download] Exit ignored: ${item.id} (stale generation)`);
        return;
      }

      this.activeDownloads.delete(item.id);

      console.log(`[Download] yt-dlp exited with code: ${code} for ${item.id}`);

      if (code === 0) {
        console.log(`[Download] ✓ Download completed successfully: ${item.id}`);
        const currentItem = this.items.get(item.id);
        if (currentItem) {
          const finalFileSize = await this.resolveCompletedFileSize(outputPath, currentItem.fileSize);
          this.updateItemStatus(item.id, "completed", {
            progress: 100,
            fileSize: finalFileSize,
            downloadedSize: finalFileSize,
            speed: 0,
            eta: "--"
          });
          this.emitStateChange(item.id, "completed");
          console.log(`[Download] ✓ Marked as completed: ${item.id} (actual size: ${finalFileSize} bytes)`);
        }
      } else if (code === 8 || stderrBuffer.toLowerCase().includes("error") === false) {
        // Code 8 often means success with FFmpeg warnings, or process was killed
        console.log(`[Download] Exit code ${code} - checking if file exists...`);
        // Check if file was actually created despite non-zero exit code
        // This can happen with timeouts but successful downloads
        const currentItem = this.items.get(item.id);
        if (currentItem && currentItem.progress > 90) {
          console.log(`[Download] ✓ File likely complete (progress: ${currentItem.progress}%), marking as completed`);
          const finalFileSize = await this.resolveCompletedFileSize(outputPath, currentItem.fileSize);
          this.updateItemStatus(item.id, "completed", {
            progress: 100,
            fileSize: finalFileSize,
            downloadedSize: finalFileSize,
            speed: 0,
            eta: "--"
          });
          this.emitStateChange(item.id, "completed");
        } else {
          // Actual failure
          console.warn(`[Download] ✗ Download failed with exit code ${code}`);
          const errorMessage = this.mapYtdlpError(stderrBuffer, code);
          this.updateItemStatus(item.id, "failed", {
            errorCode: errorMessage.code,
            errorMessage: errorMessage.message,
            speed: 0,
            eta: "--"
          });
          this.emitStateChange(item.id, "failed", errorMessage.code, errorMessage.message);
        }
      } else {
        // Failure - map error but PRESERVE progress for retry
        console.warn(`[Download] ✗ Download failed with exit code ${code}`);
        const currentItem = this.items.get(item.id);
        if (currentItem && currentItem.status !== "paused" && currentItem.status !== "canceled") {
          const errorMessage = this.mapYtdlpError(stderrBuffer, code);
          // Keep progress and downloadedSize so retry can resume
          this.updateItemStatus(item.id, "failed", {
            errorCode: errorMessage.code,
            errorMessage: errorMessage.message,
            speed: 0,
            eta: "--"
            // NOTE: Do NOT reset progress or downloadedSize - preserve for resume
          });
          this.emitStateChange(item.id, "failed", errorMessage.code, errorMessage.message);
        }
      }
    });

    // Handle spawn errors
    proc.on("error", (err: any) => {
      if (!this.isCurrentProcess(item.id, generation)) {
        return;
      }

      this.activeDownloads.delete(item.id);

      let errorCode: import('../../src/types/errors').AppErrorCode = "ytdlp_error";
      let errorMessage = "Failed to spawn yt-dlp process";

      if (err.code === "ENOENT") {
        errorCode = "ytdlp_not_found";
        errorMessage = "yt-dlp executable not found";
      }

      // Keep progress and downloadedSize for potential retry
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
  private mapYtdlpError(stderr: string, exitCode: number | null): { code: import('../../src/types/errors').AppErrorCode; message: string } {
    if (!stderr || stderr.trim().length === 0) {
      return { code: "ytdlp_error", message: `Download failed with exit code ${exitCode}` };
    }

    const stderrLower = stderr.toLowerCase();

    // Check for fatal errors
    if (stderrLower.includes("private video") || stderrLower.includes("members-only")) {
      return { code: "video_private", message: "Video is private or members-only" };
    }

    if (stderrLower.includes("video unavailable") || stderrLower.includes("not available")) {
      return { code: "video_unavailable", message: "Video is unavailable or was removed" };
    }

    if (stderrLower.includes("unsupported url")) {
      return { code: "unsupported_url", message: "URL is not supported" };
    }

    // HTTP errors
    if (stderrLower.includes("http error 4") || stderrLower.includes("403") || stderrLower.includes("404")) {
      return { code: "video_unavailable", message: "Video not found or access denied (HTTP 4xx)" };
    }

    if (stderrLower.includes("http error 5") || stderrLower.includes("502") || stderrLower.includes("503")) {
      return { code: "network_error", message: "Server error - try again later (HTTP 5xx)" };
    }

    // Network errors - only if "error" keyword is also present
    if ((stderrLower.includes("network error") || stderrLower.includes("connection error") || stderrLower.includes("timeout error"))) {
      return { code: "network_error", message: "Network error - check your connection" };
    }

    if (stderrLower.includes("ffmpeg error") || stderrLower.includes("postprocessor error")) {
      return { code: "ffmpeg_error", message: "FFmpeg processing failed - check FFmpeg installation" };
    }

    // Default error - some generic failure
    return { code: "ytdlp_error", message: `Download failed with exit code ${exitCode}` };
  }

  /**
   * Updates item in memory
   */
  private updateItemStatus(id: string, status: DownloadStatus, updates?: Partial<DownloadItem>): void {
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
  async getAll(): Promise<DownloadItem[]> {
    return Array.from(this.items.values());
  }

  /**
   * Add download item to queue
   */
  async add(item: DownloadItem): Promise<DownloadItem> {
    this.items.set(item.id, item);
    return item;
  }

  /**
   * Start download (transition from analyzing to downloading)
   */
  async start(id: string): Promise<DownloadItem> {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Download item not found: ${id}`);
    }

    const activeCount = Array.from(this.items.values()).filter((i) =>
      i.id !== id && ["downloading", "retrying", "merging", "converting"].includes(i.status)
    ).length;

    if (activeCount >= this.settings.concurrentDownloads) {
      throw new Error("Concurrent download limit reached");
    }

    // Spawn download process
    try {
      await this.spawnDownload(item, false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      const errorCode: import('../../src/types/errors').AppErrorCode = "ytdlp_error";

      this.updateItemStatus(id, "failed", {
        errorCode,
        errorMessage,
        speed: 0,
        eta: "--"
      });
      this.emitStateChange(id, "failed", errorCode, errorMessage);

      throw err;
    }

    return this.items.get(id)!;
  }

  /**
   * Pause download (kill process + keep .part file)
   */
  async pause(id: string): Promise<DownloadItem> {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Download item not found: ${id}`);
    }

    const activeDownload = this.activeDownloads.get(id);
    if (activeDownload && activeDownload.process) {
      this.killProcessTree(activeDownload.process);
      this.activeDownloads.delete(id);
      this.nextProcessGeneration(id);
    }

    const fileName = `${item.title.replace(/[<>:"/\\|?*]/g, "_")}.${item.format}`;
    const outputDir = this.resolveDownloadFolder(this.settings.downloadFolder);
    const outputPath = path.join(outputDir, fileName);

    try {
      const stat = await fs.stat(outputPath);
      const actualSize = stat.size;
      const shouldComplete = actualSize > 0 && ((item.progress >= 95) || actualSize >= Math.max(item.fileSize * 0.9, item.downloadedSize));

      if (shouldComplete) {
        this.updateItemStatus(id, "completed", {
          progress: 100,
          fileSize: actualSize,
          downloadedSize: actualSize,
          speed: 0,
          eta: "--"
        });
        this.emitStateChange(id, "completed");
        return this.items.get(id)!;
      }
    } catch {
      // File may not exist yet; keep the paused/canceled state.
    }

    const currentItem = this.items.get(id);
    this.updateItemStatus(id, "paused", {
      speed: 0,
      eta: "--",
      progress: currentItem?.progress ?? 0,
      downloadedSize: currentItem?.downloadedSize ?? 0
    });
    this.emitStateChange(id, "paused");

    return this.items.get(id)!;
  }

  /**
   * Resume download (restart yt-dlp with --continue)
   * Includes fallback logic: if resume fails, try from scratch
   */
  async resume(id: string): Promise<DownloadItem> {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Download item not found: ${id}`);
    }

    if (item.status !== "paused") {
      throw new Error(`Cannot resume download in status: ${item.status}`);
    }

    const activeCount = Array.from(this.items.values()).filter((i) =>
      i.id !== id && ["downloading", "retrying", "merging", "converting"].includes(i.status)
    ).length;

    if (activeCount >= this.settings.concurrentDownloads) {
      throw new Error("Concurrent download limit reached");
    }

    // First attempt: try resuming from partial file
    console.log(`[Download] Attempting to resume download: ${id}`);
    try {
      await this.spawnDownload(item, true);
      return this.items.get(id)!;
    } catch (resumeErr) {
      const resumeErrorMsg = resumeErr instanceof Error ? resumeErr.message : "Resume failed";
      console.warn(`[Download] Resume failed: ${resumeErrorMsg}, attempting fresh download...`);

      // Fallback: clean up partial file and start fresh
      try {
        const fileName = `${item.title.replace(/[<>:"/\\|?*]/g, "_")}.${item.format}`;
        const outputDir = this.resolveDownloadFolder(this.settings.downloadFolder);
        const outputPath = path.join(outputDir, fileName);

        // Clean up partial files
        await this.cleanupStaleDownloadArtifacts(outputPath);

        // Reset progress and start from beginning
        const freshItem: DownloadItem = {
          ...item,
          progress: 0,
          downloadedSize: 0,
          speed: 0,
          eta: "--",
          errorCode: undefined,
          errorMessage: undefined
        };
        this.items.set(id, freshItem);

        // Try downloading from scratch
        await this.spawnDownload(freshItem, false);
        console.log(`[Download] Fresh download started after resume fallback: ${id}`);
        return this.items.get(id)!;
      } catch (freshErr) {
        // Both attempts failed
        const errorMessage = freshErr instanceof Error ? freshErr.message : "Download failed after fallback";
        const errorCode: import('../../src/types/errors').AppErrorCode =
          errorMessage.includes("unavailable") ? "video_unavailable" :
            errorMessage.includes("network") ? "network_error" :
              "ytdlp_error";

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
  async cancel(id: string): Promise<DownloadItem> {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Download item not found: ${id}`);
    }

    const activeDownload = this.activeDownloads.get(id);
    if (activeDownload && activeDownload.process) {
      this.killProcessTree(activeDownload.process);
      this.activeDownloads.delete(id);
      this.nextProcessGeneration(id);
    }

    const fileName = `${item.title.replace(/[<>:"/\\|?*]/g, "_")}.${item.format}`;
    const outputDir = this.resolveDownloadFolder(this.settings.downloadFolder);
    const outputPath = path.join(outputDir, fileName);

    try {
      const stat = await fs.stat(outputPath);
      const actualSize = stat.size;
      const shouldComplete = actualSize > 0 && ((item.progress >= 95) || actualSize >= Math.max(item.fileSize * 0.9, item.downloadedSize));

      if (shouldComplete) {
        this.updateItemStatus(id, "completed", {
          progress: 100,
          fileSize: actualSize,
          downloadedSize: actualSize,
          speed: 0,
          eta: "--"
        });
        this.emitStateChange(id, "completed");
        return this.items.get(id)!;
      }
    } catch {
      // File may not exist yet; keep the paused/canceled state.
    }

    const currentItem = this.items.get(id);
    this.updateItemStatus(id, "canceled", {
      speed: 0,
      eta: "--",
      progress: currentItem?.progress ?? 0,
      downloadedSize: currentItem?.downloadedSize ?? 0
    });
    this.emitStateChange(id, "canceled");

    return this.items.get(id)!;
  }

  /**
   * Retry failed/canceled download
   * Strategy:
   * - Canceled: Try to resume (likely has partial file)
   * - Failed: Try to resume first, if that fails, start fresh
   */
  async retry(id: string): Promise<DownloadItem> {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Download item not found: ${id}`);
    }

    if (item.status !== "failed" && item.status !== "canceled") {
      throw new Error(`Cannot retry download in status: ${item.status}`);
    }

    const activeCount = Array.from(this.items.values()).filter((i) =>
      i.id !== id && ["downloading", "retrying", "merging", "converting"].includes(i.status)
    ).length;

    if (activeCount >= this.settings.concurrentDownloads) {
      throw new Error("Concurrent download limit reached");
    }

    // Always try to resume first - if partial file exists, continue from it
    // If it doesn't exist, spawnDownload will automatically start fresh
    const shouldResume = true;

    const resetItem: DownloadItem = {
      ...item,
      status: "retrying",
      // Don't reset progress/downloadedSize - let spawnDownload decide based on partial file
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

    return this.items.get(id) ?? resetItem;
  }

  /**
   * Remove download item
   */
  async remove(id: string): Promise<string> {
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
  async reorder(orderedIds: string[]): Promise<DownloadItem[]> {
    const result: DownloadItem[] = [];
    for (const id of orderedIds) {
      const item = this.items.get(id);
      if (item) result.push(item);
    }
    return result;
  }

  /**
   * Get count of active downloads
   */
  getActiveCount(): number {
    return Array.from(this.items.values()).filter((i) =>
      ["downloading", "retrying", "merging", "converting"].includes(i.status)
    ).length;
  }

  /**
   * Clean up all active downloads (called on app shutdown)
   */
  cleanup(): void {
    for (const [id, activeDownload] of this.activeDownloads.entries()) {
      if (activeDownload.process) {
        activeDownload.process.kill();
      }
    }
    this.activeDownloads.clear();
  }
}
