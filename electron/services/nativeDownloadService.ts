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
import { ChildProcess } from "child_process";
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

    // Continue from partial download if resume
    if (isResume) {
      args.push("--continue");
    } else {
      args.push("--no-continue"); // Start fresh
    }

    // Output path
    args.push("-o", outputPath);

    // Quality/format selection
    if (item.quality && item.quality !== "auto") {
      // Format: bestvideo[height<=1080]+bestaudio/best[height<=1080]
      const height = item.quality.replace("p", "");
      args.push("-f", `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`);
    } else {
      args.push("-f", "best");
    }

    // Merge output format (prefer user's choice, fallback to best available)
    if (item.format && item.format !== "auto") {
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
   * Parse yt-dlp progress line
   * Format: "download:15.2%|1.5MiB|10MiB|500KiB/s|00:15"
   */
  private parseProgressLine(line: string): YtdlpProgress | null {
    if (!line.startsWith("download:")) {
      return null;
    }

    const data = line.substring(9); // Remove "download:" prefix
    const parts = data.split("|");

    if (parts.length < 5) {
      return null;
    }

    // Parse percent (e.g., "15.2%" → 15.2)
    const percentStr = parts[0].trim().replace("%", "");
    const progress = parseFloat(percentStr) || 0;

    // Parse downloaded bytes (e.g., "1.5MiB" → bytes)
    const downloadedSize = this.parseSize(parts[1].trim());

    // Parse total bytes (e.g., "10MiB" → bytes)
    const totalSize = this.parseSize(parts[2].trim());

    // Parse speed (e.g., "500KiB/s" → bytes/sec)
    const speed = this.parseSize(parts[3].trim().replace("/s", ""));

    // Parse ETA (e.g., "00:15" or "Unknown ETA")
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
  private parseSize(sizeStr: string): number {
    if (!sizeStr || sizeStr === "N/A" || sizeStr === "Unknown") {
      return 0;
    }

    const match = sizeStr.match(/^([\d.]+)\s*([KMGT]i?B)?$/i);
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
  private async spawnDownload(item: DownloadItem, isResume: boolean): Promise<void> {
    // Resolve yt-dlp path (cached after first successful resolution)
    if (!this.ytdlpPath) {
      this.ytdlpPath = await this.resolveYtdlpPath();
    }

    // Build output path
    const fileName = `${item.title.replace(/[<>:"/\\|?*]/g, "_")}.${item.format}`;
    const outputPath = path.join(this.settings.downloadFolder, fileName);

    // Build arguments
    const args = this.buildYtdlpArgs(item, outputPath, isResume);

    // Spawn process
    const proc = this.executor.spawn(this.ytdlpPath, args, {
      windowsHide: true,
      shell: false // Security: never use shell
    });

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
        if (progress) {
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
      }
    });

    // Handle stderr (errors)
    proc.stderr?.on("data", (data) => {
      stderrBuffer += data.toString();
    });

    // Handle process exit
    proc.on("exit", (code) => {
      this.activeDownloads.delete(item.id);

      if (code === 0) {
        // Success - check if we need merging/converting
        const currentItem = this.items.get(item.id);
        if (currentItem) {
          // Transition to merging (yt-dlp may need to merge video+audio)
          this.updateItemStatus(item.id, "merging");
          this.emitStateChange(item.id, "merging");

          // Simulate merging/converting phases (in real scenario, we'd parse yt-dlp output for this)
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
        // Failure - map error
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

    // Handle spawn errors
    proc.on("error", (err: any) => {
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
  private mapYtdlpError(stderr: string, exitCode: number | null): { code: string; message: string } {
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

    // Check concurrent downloads limit (count only actively downloading items, not analyzing)
    const activeCount = Array.from(this.items.values()).filter((i) =>
      ["downloading", "merging", "converting"].includes(i.status)
    ).length;

    if (activeCount >= this.settings.concurrentDownloads) {
      throw new Error("Concurrent download limit reached");
    }

    // Spawn download process
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
      // Kill process cleanly (SIGTERM on Unix, close on Windows)
      activeDownload.process.kill();
      this.activeDownloads.delete(id);
    }

    // Update status to paused
    this.updateItemStatus(id, "paused", {
      speed: 0,
      eta: "--"
    });
    this.emitStateChange(id, "paused");

    return this.items.get(id)!;
  }

  /**
   * Resume download (restart yt-dlp with --continue)
   */
  async resume(id: string): Promise<DownloadItem> {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Download item not found: ${id}`);
    }

    if (item.status !== "paused") {
      throw new Error(`Cannot resume download in status: ${item.status}`);
    }

    // Check concurrent downloads limit
    const activeCount = Array.from(this.items.values()).filter((i) =>
      ["analyzing", "downloading", "merging", "converting"].includes(i.status)
    ).length;

    if (activeCount >= this.settings.concurrentDownloads) {
      throw new Error("Concurrent download limit reached");
    }

    // Spawn download process with --continue
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

    return this.items.get(id)!;
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
      // Kill process
      activeDownload.process.kill();
      this.activeDownloads.delete(id);

      // Optionally delete partial files
      // Note: We keep .part files for now (user may want to retry)
      // In future, we can add a setting "deletePartialFilesOnCancel"
    }

    // Update status to canceled
    this.updateItemStatus(id, "canceled", {
      speed: 0,
      eta: "--"
    });
    this.emitStateChange(id, "canceled");

    return this.items.get(id)!;
  }

  /**
   * Retry failed/canceled download
   */
  async retry(id: string): Promise<DownloadItem> {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Download item not found: ${id}`);
    }

    if (item.status !== "failed" && item.status !== "canceled") {
      throw new Error(`Cannot retry download in status: ${item.status}`);
    }

    // Update to retrying status
    this.updateItemStatus(id, "retrying", {
      progress: 0,
      downloadedSize: 0,
      speed: 0,
      eta: "--",
      retryCount: item.retryCount + 1,
      errorCode: undefined,
      errorMessage: undefined
    });
    this.emitStateChange(id, "retrying");

    // Transition to analyzing (queue will handle starting automatically)
    setTimeout(() => {
      const currentItem = this.items.get(id);
      if (currentItem && currentItem.status === "retrying") {
        this.updateItemStatus(id, "analyzing");
        this.emitStateChange(id, "analyzing");
      }
    }, 300);

    return this.items.get(id)!;
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
      ["analyzing", "downloading", "merging", "converting"].includes(i.status)
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
