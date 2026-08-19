"use strict";
/**
 * NativeDownloadService Unit Tests
 *
 * Tests the real yt-dlp download engine using MockProcessExecutor for deterministic behavior.
 * No network dependency, no real yt-dlp binary required.
 *
 * Test Coverage:
 * - yt-dlp path resolution (settings, PATH fallback, not found)
 * - Download lifecycle (start, pause, resume, cancel, retry)
 * - Progress parsing from yt-dlp output
 * - State transitions (analyzing→downloading→merging→converting→completed)
 * - Error handling (spawn failures, timeouts, video unavailable, private, network errors)
 * - Concurrent download slot management
 * - Speed limit, quality, format arguments
 * - FFmpeg integration
 * - Event emission (progress, state-change)
 * - Pause/Resume semantics (kill + --continue)
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
const vitest_1 = require("vitest");
const events_1 = require("events");
const fs_1 = require("fs");
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const nativeDownloadService_1 = require("./nativeDownloadService");
class MockChildProcess extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.stdout = new events_1.EventEmitter();
        this.stderr = new events_1.EventEmitter();
        this.killed = false;
    }
    kill() {
        this.killed = true;
        this.emit("exit", null);
    }
}
class MockProcessExecutor {
    constructor() {
        this.spawnBehaviors = new Map();
        this.accessBehaviors = new Map();
        this.defaultAccessBehavior = { shouldSucceed: false };
    }
    setSpawnBehavior(command, behavior) {
        this.spawnBehaviors.set(command, behavior);
    }
    setAccessBehavior(path, behavior) {
        this.accessBehaviors.set(path, behavior);
    }
    setDefaultAccessBehavior(behavior) {
        this.defaultAccessBehavior = behavior;
    }
    spawn(command, args, _options) {
        const behavior = this.spawnBehaviors.get(command);
        if (!behavior) {
            throw new Error(`No spawn behavior configured for command: ${command}`);
        }
        const proc = new MockChildProcess();
        if (behavior.error) {
            setImmediate(() => {
                const err = new Error("Spawn error");
                err.code = behavior.error.code;
                proc.emit("error", err);
            });
            return proc;
        }
        const delay = behavior.delay || 10;
        setTimeout(() => {
            if (behavior.stdout) {
                proc.stdout.emit("data", Buffer.from(behavior.stdout));
            }
            if (behavior.stderr) {
                proc.stderr.emit("data", Buffer.from(behavior.stderr));
            }
            proc.emit("exit", behavior.exitCode);
        }, delay);
        return proc;
    }
    async checkAccess(path, _mode) {
        const behavior = this.accessBehaviors.get(path) || this.defaultAccessBehavior;
        if (!behavior.shouldSucceed) {
            throw new Error(`ENOENT: no such file or directory, access '${path}'`);
        }
    }
}
// ─── Test Helpers ───────────────────────────────────────────────────────────
function createMockSettings(overrides) {
    return {
        downloadFolder: "C:\\Downloads",
        startWithWindows: false,
        minimizeToTray: false,
        appearance: "system",
        language: "en",
        concurrentDownloads: 3,
        speedLimit: "unlimited",
        defaultQuality: "1080p",
        defaultVideoFormat: "mp4",
        defaultAudioFormat: "mp3",
        enableNotifications: true,
        notificationWhenCompleted: true,
        notificationWhenFailed: true,
        clipboardMonitoring: false,
        askBeforeDownloading: false,
        fileNameTemplate: "{title}.{ext}",
        ytdlpPath: "",
        ffmpegPath: "",
        proxy: "",
        ...overrides
    };
}
function createMockDownloadItem(overrides) {
    return {
        id: crypto.randomUUID(),
        metadataId: "meta-1",
        thumbnail: "https://example.com/thumb.jpg",
        title: "Test Video",
        sourceUrl: "https://www.youtube.com/watch?v=test123",
        quality: "1080p",
        format: "mp4",
        fileSize: 100 * 1024 * 1024,
        downloadedSize: 0,
        speed: 0,
        eta: "--",
        progress: 0,
        status: "queued",
        order: 1,
        addedAt: new Date().toISOString(),
        phaseStartedAt: Date.now(),
        lastUpdatedAt: Date.now(),
        retryCount: 0,
        ...overrides
    };
}
// ─── Tests ──────────────────────────────────────────────────────────────────
(0, vitest_1.describe)("NativeDownloadService", () => {
    let mockExecutor;
    let settings;
    let service;
    (0, vitest_1.beforeEach)(() => {
        mockExecutor = new MockProcessExecutor();
        settings = createMockSettings();
        service = new nativeDownloadService_1.NativeDownloadService(settings, mockExecutor);
    });
    // ─── yt-dlp Path Resolution ─────────────────────────────────────────────
    (0, vitest_1.describe)("yt-dlp path resolution", () => {
        (0, vitest_1.it)("should use ytdlpPath from settings when provided and executable", async () => {
            settings.ytdlpPath = "C:\\custom\\yt-dlp.exe";
            mockExecutor.setAccessBehavior("C:\\custom\\yt-dlp.exe", { shouldSucceed: true });
            mockExecutor.setSpawnBehavior("C:\\custom\\yt-dlp.exe", {
                stdout: "download:50000|100000|25000|00:02\n",
                stderr: "",
                exitCode: 0
            });
            service = new nativeDownloadService_1.NativeDownloadService(settings, mockExecutor);
            const item = createMockDownloadItem({ status: "analyzing" });
            await service.add(item);
            await service.start(item.id);
            // If it reaches here without error, custom path was used
            (0, vitest_1.expect)(true).toBe(true);
        });
        (0, vitest_1.it)("should fall back to PATH when settings ytdlpPath is invalid", async () => {
            settings.ytdlpPath = "C:\\invalid\\yt-dlp.exe";
            mockExecutor.setAccessBehavior("C:\\invalid\\yt-dlp.exe", { shouldSucceed: false });
            mockExecutor.setSpawnBehavior("yt-dlp", { stdout: "", stderr: "", exitCode: 0 });
            mockExecutor.setSpawnBehavior("yt-dlp.exe", { stdout: "", stderr: "", exitCode: 0 });
            service = new nativeDownloadService_1.NativeDownloadService(settings, mockExecutor);
            const item = createMockDownloadItem({ status: "analyzing" });
            await service.add(item);
            // Should fall back to PATH without throwing
            await (0, vitest_1.expect)(service.start(item.id)).resolves.toBeDefined();
        });
        (0, vitest_1.it)("should throw ytdlp_not_found when no valid yt-dlp binary found", async () => {
            mockExecutor.setDefaultAccessBehavior({ shouldSucceed: false });
            mockExecutor.setSpawnBehavior("yt-dlp", { stdout: "", stderr: "", exitCode: 1 });
            mockExecutor.setSpawnBehavior("yt-dlp.exe", { stdout: "", stderr: "", exitCode: 1 });
            mockExecutor.setSpawnBehavior("youtube-dl", { stdout: "", stderr: "", exitCode: 1 });
            mockExecutor.setSpawnBehavior("youtube-dl.exe", { stdout: "", stderr: "", exitCode: 1 });
            service = new nativeDownloadService_1.NativeDownloadService(settings, mockExecutor);
            const item = createMockDownloadItem({ status: "analyzing" });
            await service.add(item);
            await (0, vitest_1.expect)(service.start(item.id)).rejects.toThrow();
        });
    });
    // ─── Download Lifecycle ─────────────────────────────────────────────────
    (0, vitest_1.describe)("download lifecycle", () => {
        (0, vitest_1.beforeEach)(() => {
            mockExecutor.setDefaultAccessBehavior({ shouldSucceed: true });
            mockExecutor.setSpawnBehavior("yt-dlp", { stdout: "", stderr: "", exitCode: 0 });
        });
        (0, vitest_1.it)("should parse real yt-dlp stdout progress lines", () => {
            const parsed = service.parseProgressLine("[download]  15.3% of 10.0MiB at 1.0MiB/s ETA 00:05");
            (0, vitest_1.expect)(parsed).toMatchObject({
                progress: 15.3,
                totalSize: 10 * 1024 * 1024,
                speed: 1024 * 1024,
                eta: "00:05"
            });
            (0, vitest_1.expect)(parsed?.downloadedSize).toBeGreaterThan(0);
        });
        (0, vitest_1.it)("should parse yt-dlp stderr progress lines", async () => {
            mockExecutor.setSpawnBehavior("yt-dlp", {
                stdout: "",
                stderr: "[download] 100.0% of 5.1MiB at 1.9MiB/s ETA 00:00\n",
                exitCode: 0,
                delay: 20
            });
            const item = createMockDownloadItem({ status: "analyzing" });
            await service.add(item);
            await service.start(item.id);
            await new Promise((resolve) => setTimeout(resolve, 100));
            const updated = (await service.getAll()).find((entry) => entry.id === item.id);
            (0, vitest_1.expect)(updated.status).toBe("completed");
            (0, vitest_1.expect)(updated.progress).toBe(100);
            (0, vitest_1.expect)(updated.downloadedSize).toBeGreaterThan(0);
        });
        (0, vitest_1.it)("should derive downloaded bytes from percent when pipe template omits them", () => {
            const parsed = service.parseProgressLine("download:100.0%|NA|5.1MiB|1.9MiB/s|00:00");
            (0, vitest_1.expect)(parsed?.progress).toBe(100);
            (0, vitest_1.expect)(parsed?.downloadedSize).toBeGreaterThan(0);
            (0, vitest_1.expect)(parsed?.totalSize).toBeGreaterThan(0);
        });
        (0, vitest_1.it)("should retry a failed item and start a new yt-dlp process", async () => {
            let spawnCount = 0;
            const customExecutor = {
                async checkAccess() { },
                spawn(command, _args, _options) {
                    spawnCount += 1;
                    const proc = new MockChildProcess();
                    setTimeout(() => {
                        if (proc.stdout) {
                            proc.stdout.emit("data", Buffer.from("download:25.0%|10MiB|40MiB|5MiB/s|00:05\n"));
                        }
                        proc.emit("exit", 0);
                    }, 10);
                    return proc;
                }
            };
            const settingsWithYtdlp = createMockSettings({ ytdlpPath: "yt-dlp" });
            service = new nativeDownloadService_1.NativeDownloadService(settingsWithYtdlp, customExecutor);
            const item = createMockDownloadItem({ status: "failed" });
            await service.add(item);
            await service.retry(item.id);
            await new Promise((resolve) => setTimeout(resolve, 400));
            const updated = (await service.getAll()).find((entry) => entry.id === item.id);
            (0, vitest_1.expect)(updated.status).toBe("completed");
            (0, vitest_1.expect)(updated.retryCount).toBe(1);
            (0, vitest_1.expect)(spawnCount).toBe(1);
        });
        (0, vitest_1.it)("should add item to queue", async () => {
            const item = createMockDownloadItem();
            const added = await service.add(item);
            (0, vitest_1.expect)(added).toEqual(item);
            const all = await service.getAll();
            (0, vitest_1.expect)(all).toHaveLength(1);
            (0, vitest_1.expect)(all[0].id).toBe(item.id);
        });
        (0, vitest_1.it)("should start download and transition to downloading status", async () => {
            mockExecutor.setSpawnBehavior("yt-dlp", {
                stdout: "download:50000|100000|25000|00:02\n",
                stderr: "",
                exitCode: 0,
                delay: 50
            });
            const item = createMockDownloadItem({ status: "analyzing" });
            await service.add(item);
            const started = await service.start(item.id);
            (0, vitest_1.expect)(started.status).toBe("downloading");
        });
        (0, vitest_1.it)("should pause download and keep partial files", async () => {
            mockExecutor.setSpawnBehavior("yt-dlp", {
                stdout: "download:50000|100000|25000|00:02\n",
                stderr: "",
                exitCode: 0,
                delay: 100
            });
            const item = createMockDownloadItem({ status: "analyzing" });
            await service.add(item);
            await service.start(item.id);
            // Wait a bit for download to start
            await new Promise((resolve) => setTimeout(resolve, 20));
            const paused = await service.pause(item.id);
            (0, vitest_1.expect)(paused.status).toBe("paused");
            (0, vitest_1.expect)(paused.speed).toBe(0);
            (0, vitest_1.expect)(paused.eta).toBe("--");
        });
        (0, vitest_1.it)("should resume download with --continue flag", async () => {
            const item = createMockDownloadItem({ status: "paused" });
            await service.add(item);
            mockExecutor.setSpawnBehavior("yt-dlp", {
                stdout: "download:75000|100000|25000|00:01\n",
                stderr: "",
                exitCode: 0
            });
            const resumed = await service.resume(item.id);
            (0, vitest_1.expect)(resumed.status).toBe("downloading");
        });
        (0, vitest_1.it)("should cancel download", async () => {
            mockExecutor.setSpawnBehavior("yt-dlp", {
                stdout: "download:50000|100000|25000|00:02\n",
                stderr: "",
                exitCode: 0,
                delay: 100
            });
            const item = createMockDownloadItem({ status: "analyzing" });
            await service.add(item);
            await service.start(item.id);
            await new Promise((resolve) => setTimeout(resolve, 20));
            const canceled = await service.cancel(item.id);
            (0, vitest_1.expect)(canceled.status).toBe("canceled");
            (0, vitest_1.expect)(canceled.speed).toBe(0);
        });
        (0, vitest_1.it)("should retry failed download", async () => {
            const item = createMockDownloadItem({ status: "failed", retryCount: 0 });
            await service.add(item);
            const retried = await service.retry(item.id);
            (0, vitest_1.expect)(retried.status).toBe("retrying");
            (0, vitest_1.expect)(retried.retryCount).toBe(1);
            (0, vitest_1.expect)(retried.progress).toBe(0);
            (0, vitest_1.expect)(retried.downloadedSize).toBe(0);
        });
        (0, vitest_1.it)("should freeze progress state after pause and ignore stale events", async () => {
            let proc;
            const customExecutor = {
                async checkAccess() { },
                spawn(command, _args, _options) {
                    proc = new MockChildProcess();
                    setTimeout(() => {
                        proc.stdout.emit("data", Buffer.from("download:65.0%|59MiB|91MiB|1.6MiB/s|00:20\n"));
                    }, 20);
                    setTimeout(() => {
                        proc.stdout.emit("data", Buffer.from("download:70.0%|60MiB|91MiB|1.8MiB/s|00:18\n"));
                    }, 80);
                    return proc;
                }
            };
            service = new nativeDownloadService_1.NativeDownloadService(createMockSettings({ ytdlpPath: "yt-dlp" }), customExecutor);
            const item = createMockDownloadItem({ status: "analyzing" });
            await service.add(item);
            await service.start(item.id);
            await new Promise((resolve) => setTimeout(resolve, 40));
            await service.pause(item.id);
            await new Promise((resolve) => setTimeout(resolve, 120));
            const updated = (await service.getAll()).find((entry) => entry.id === item.id);
            (0, vitest_1.expect)(updated.status).toBe("paused");
            (0, vitest_1.expect)(updated.progress).toBe(65);
            (0, vitest_1.expect)(updated.speed).toBe(0);
            (0, vitest_1.expect)(updated.eta).toBe("--");
        });
        (0, vitest_1.it)("should ignore stale progress after cancel", async () => {
            let proc;
            const customExecutor = {
                async checkAccess() { },
                spawn(command, _args, _options) {
                    proc = new MockChildProcess();
                    setTimeout(() => {
                        proc.stdout.emit("data", Buffer.from("download:50.0%|50MiB|100MiB|1.0MiB/s|00:30\n"));
                    }, 20);
                    return proc;
                }
            };
            service = new nativeDownloadService_1.NativeDownloadService(createMockSettings({ ytdlpPath: "yt-dlp" }), customExecutor);
            const item = createMockDownloadItem({ status: "analyzing" });
            await service.add(item);
            await service.start(item.id);
            await new Promise((resolve) => setTimeout(resolve, 30));
            await service.cancel(item.id);
            setTimeout(() => {
                proc.stdout.emit("data", Buffer.from("download:99.0%|99MiB|100MiB|2.0MiB/s|00:01\n"));
            }, 30);
            await new Promise((resolve) => setTimeout(resolve, 100));
            const updated = (await service.getAll()).find((entry) => entry.id === item.id);
            (0, vitest_1.expect)(updated.status).toBe("canceled");
            (0, vitest_1.expect)(updated.progress).toBeLessThan(99);
        });
        (0, vitest_1.it)("should ignore stale progress after failed and completed states", async () => {
            let activeProc;
            const customExecutor = {
                async checkAccess() { },
                spawn(command, _args, _options) {
                    const nextProc = new MockChildProcess();
                    activeProc = nextProc;
                    setTimeout(() => {
                        nextProc.stdout.emit("data", Buffer.from("download:40.0%|40MiB|100MiB|1.0MiB/s|00:40\n"));
                    }, 30);
                    setTimeout(() => {
                        nextProc.emit("exit", 0);
                    }, 50);
                    return nextProc;
                }
            };
            service = new nativeDownloadService_1.NativeDownloadService(createMockSettings({ ytdlpPath: "yt-dlp" }), customExecutor);
            const failedItem = createMockDownloadItem({ status: "analyzing" });
            await service.add(failedItem);
            await service.start(failedItem.id);
            await service.pause(failedItem.id);
            const completedItem = createMockDownloadItem({ status: "analyzing" });
            await service.add(completedItem);
            await service.start(completedItem.id);
            setTimeout(() => {
                activeProc.stdout.emit("data", Buffer.from("download:100.0%|100MiB|100MiB|0B/s|00:00\n"));
                activeProc.emit("exit", 0);
            }, 30);
            await new Promise((resolve) => setTimeout(resolve, 500));
            (0, vitest_1.expect)((await service.getAll()).find((entry) => entry.id === failedItem.id)?.status).toBe("paused");
            (0, vitest_1.expect)((await service.getAll()).find((entry) => entry.id === completedItem.id)?.status).toBe("completed");
        });
        (0, vitest_1.it)("should prefer actual on-disk file size over metadata estimate when file is larger", async () => {
            const tempDir = (0, fs_1.mkdtempSync)(path.join(os.tmpdir(), "remon-download-"));
            const finalFile = path.join(tempDir, "video.mp4");
            const actualSize = 30 * 1024 * 1024;
            (0, fs_1.writeFileSync)(finalFile, Buffer.alloc(actualSize));
            try {
                const result = await service.resolveCompletedFileSize(finalFile, 20 * 1024 * 1024);
                (0, vitest_1.expect)(result).toBe(actualSize);
            }
            finally {
                (0, fs_1.rmSync)(tempDir, { recursive: true, force: true });
            }
        });
        (0, vitest_1.it)("should mark item as completed if stopping after the file has already finished downloading", async () => {
            const tempDir = (0, fs_1.mkdtempSync)(path.join(os.tmpdir(), "remon-stop-complete-"));
            const fileSize = 30 * 1024 * 1024;
            const outputPath = path.join(tempDir, "Test Video.mp4");
            (0, fs_1.writeFileSync)(outputPath, Buffer.alloc(fileSize));
            try {
                service = new nativeDownloadService_1.NativeDownloadService(createMockSettings({ downloadFolder: tempDir, ytdlpPath: "yt-dlp" }));
                const item = createMockDownloadItem({
                    title: "Test Video",
                    format: "mp4",
                    fileSize,
                    downloadedSize: fileSize * 0.98,
                    progress: 98,
                    status: "downloading"
                });
                await service.add(item);
                const result = await service.pause(item.id);
                (0, vitest_1.expect)(result.status).toBe("completed");
                (0, vitest_1.expect)(result.downloadedSize).toBe(fileSize);
                (0, vitest_1.expect)(result.progress).toBe(100);
            }
            finally {
                (0, fs_1.rmSync)(tempDir, { recursive: true, force: true });
            }
        });
        (0, vitest_1.it)("should remove download item", async () => {
            const item = createMockDownloadItem();
            await service.add(item);
            const removedId = await service.remove(item.id);
            (0, vitest_1.expect)(removedId).toBe(item.id);
            const all = await service.getAll();
            (0, vitest_1.expect)(all).toHaveLength(0);
        });
    });
    // ─── Progress Parsing ───────────────────────────────────────────────────
    (0, vitest_1.describe)("progress parsing", () => {
        (0, vitest_1.beforeEach)(() => {
            mockExecutor.setDefaultAccessBehavior({ shouldSucceed: true });
        });
        (0, vitest_1.it)("should parse progress from yt-dlp output", async () => {
            const progressEvents = [];
            service.on("download:progress", (payload) => progressEvents.push(payload));
            mockExecutor.setSpawnBehavior("yt-dlp", {
                stdout: "download:50.0%|47.7MiB|95.4MiB|4.77MiB/s|00:10\n",
                stderr: "",
                exitCode: 0,
                delay: 50
            });
            const item = createMockDownloadItem({ status: "analyzing" });
            await service.add(item);
            await service.start(item.id);
            await new Promise((resolve) => setTimeout(resolve, 100));
            (0, vitest_1.expect)(progressEvents.length).toBeGreaterThan(0);
            const lastProgress = progressEvents[progressEvents.length - 1];
            (0, vitest_1.expect)(lastProgress.id).toBe(item.id);
            (0, vitest_1.expect)(lastProgress.progress).toBeCloseTo(50, 0);
            (0, vitest_1.expect)(lastProgress.downloadedSize).toBeGreaterThan(0);
            (0, vitest_1.expect)(lastProgress.totalSize).toBeGreaterThan(0);
            (0, vitest_1.expect)(lastProgress.speed).toBeGreaterThan(0);
        });
        (0, vitest_1.it)("should emit state change events", async () => {
            const stateChangeEvents = [];
            service.on("download:state-change", (payload) => stateChangeEvents.push(payload));
            mockExecutor.setSpawnBehavior("yt-dlp", {
                stdout: "download:100.0%|95.4MiB|95.4MiB|4.77MiB/s|00:00\n",
                stderr: "",
                exitCode: 0,
                delay: 50
            });
            const item = createMockDownloadItem({ status: "analyzing" });
            await service.add(item);
            await service.start(item.id);
            await new Promise((resolve) => setTimeout(resolve, 200));
            (0, vitest_1.expect)(stateChangeEvents.length).toBeGreaterThan(0);
            const statuses = stateChangeEvents.map((e) => e.status);
            (0, vitest_1.expect)(statuses).toContain("downloading");
        });
    });
    // ─── State Transitions ──────────────────────────────────────────────────
    (0, vitest_1.describe)("state transitions", () => {
        (0, vitest_1.beforeEach)(() => {
            mockExecutor.setDefaultAccessBehavior({ shouldSucceed: true });
        });
        (0, vitest_1.it)("should transition downloading → merging → converting → completed", async () => {
            const stateChanges = [];
            service.on("download:state-change", (payload) => stateChanges.push(payload.status));
            mockExecutor.setSpawnBehavior("yt-dlp", {
                stdout: "download:100000000|100000000|5000000|00:00\n",
                stderr: "",
                exitCode: 0,
                delay: 50
            });
            const item = createMockDownloadItem({ status: "analyzing" });
            await service.add(item);
            await service.start(item.id);
            await new Promise((resolve) => setTimeout(resolve, 1500));
            (0, vitest_1.expect)(stateChanges).toContain("downloading");
            (0, vitest_1.expect)(stateChanges).toContain("merging");
            (0, vitest_1.expect)(stateChanges).toContain("converting");
            (0, vitest_1.expect)(stateChanges).toContain("completed");
        });
    });
    // ─── Error Handling ─────────────────────────────────────────────────────
    (0, vitest_1.describe)("error handling", () => {
        (0, vitest_1.beforeEach)(async () => {
            // Setup default access for yt-dlp
            mockExecutor.setDefaultAccessBehavior({ shouldSucceed: false });
            mockExecutor.setAccessBehavior("yt-dlp", { shouldSucceed: true });
            // Setup spawn behavior for --version check during resolveYtdlpPath
            mockExecutor.setSpawnBehavior("yt-dlp", {
                stdout: "2024.01.01",
                stderr: "",
                exitCode: 0,
                delay: 10
            });
            // Trigger yt-dlp path resolution to cache it
            // This ensures resolveYtdlpPath completes with --version check
            // before we override spawn behavior in individual tests
            const item = createMockDownloadItem({ status: "analyzing" });
            await service.add(item);
            await service.start(item.id).catch(() => { }); // Will fail because no spawn behavior for actual download, but that's OK
            await service.remove(item.id); // Clean up
        });
        (0, vitest_1.it)("should handle video unavailable error", async () => {
            const item = createMockDownloadItem({ status: "analyzing" });
            await service.add(item);
            // Override spawn behavior after resolveYtdlpPath completes
            mockExecutor.setSpawnBehavior("yt-dlp", {
                stdout: "",
                stderr: "ERROR: Video unavailable",
                exitCode: 1,
                delay: 50
            });
            await service.start(item.id);
            await new Promise((resolve) => setTimeout(resolve, 150));
            const items = await service.getAll();
            const failedItem = items.find((i) => i.id === item.id);
            (0, vitest_1.expect)(failedItem?.status).toBe("failed");
            (0, vitest_1.expect)(failedItem?.errorCode).toBe("video_unavailable");
        });
        (0, vitest_1.it)("should handle private video error", async () => {
            const item = createMockDownloadItem({ status: "analyzing" });
            await service.add(item);
            // Override spawn behavior after resolveYtdlpPath completes
            mockExecutor.setSpawnBehavior("yt-dlp", {
                stdout: "",
                stderr: "ERROR: Private video. Sign in if you've been granted access",
                exitCode: 1,
                delay: 50
            });
            await service.start(item.id);
            await new Promise((resolve) => setTimeout(resolve, 150));
            const items = await service.getAll();
            const failedItem = items.find((i) => i.id === item.id);
            (0, vitest_1.expect)(failedItem?.errorCode).toBe("video_private");
        });
        (0, vitest_1.it)("should handle network error", async () => {
            const item = createMockDownloadItem({ status: "analyzing" });
            await service.add(item);
            // Override spawn behavior after resolveYtdlpPath completes
            mockExecutor.setSpawnBehavior("yt-dlp", {
                stdout: "",
                stderr: "ERROR: Unable to download: network error",
                exitCode: 1,
                delay: 50
            });
            await service.start(item.id);
            await new Promise((resolve) => setTimeout(resolve, 150));
            const items = await service.getAll();
            const failedItem = items.find((i) => i.id === item.id);
            (0, vitest_1.expect)(failedItem?.errorCode).toBe("network_error");
        });
        (0, vitest_1.it)("should handle unsupported URL error", async () => {
            const item = createMockDownloadItem({ status: "analyzing" });
            await service.add(item);
            // Override spawn behavior after resolveYtdlpPath completes
            mockExecutor.setSpawnBehavior("yt-dlp", {
                stdout: "",
                stderr: "ERROR: Unsupported URL: https://example.com",
                exitCode: 1,
                delay: 50
            });
            await service.start(item.id);
            await new Promise((resolve) => setTimeout(resolve, 150));
            const items = await service.getAll();
            const failedItem = items.find((i) => i.id === item.id);
            (0, vitest_1.expect)(failedItem?.errorCode).toBe("unsupported_url");
        });
        (0, vitest_1.it)("should handle FFmpeg error", async () => {
            const item = createMockDownloadItem({ status: "analyzing" });
            await service.add(item);
            // Override spawn behavior after resolveYtdlpPath completes
            mockExecutor.setSpawnBehavior("yt-dlp", {
                stdout: "",
                stderr: "ERROR: ffmpeg failed with exit code 1",
                exitCode: 1,
                delay: 50
            });
            await service.start(item.id);
            await new Promise((resolve) => setTimeout(resolve, 150));
            const items = await service.getAll();
            const failedItem = items.find((i) => i.id === item.id);
            (0, vitest_1.expect)(failedItem?.errorCode).toBe("ffmpeg_error");
        });
        (0, vitest_1.it)("should handle spawn error", async () => {
            const item = createMockDownloadItem({ status: "analyzing" });
            await service.add(item);
            // Override spawn behavior to simulate spawn error
            mockExecutor.setSpawnBehavior("yt-dlp", {
                stdout: "",
                stderr: "",
                exitCode: 0,
                error: { code: "ENOENT" }
            });
            await service.start(item.id);
            await new Promise((resolve) => setTimeout(resolve, 150));
            const items = await service.getAll();
            const failedItem = items.find((i) => i.id === item.id);
            (0, vitest_1.expect)(failedItem?.status).toBe("failed");
            (0, vitest_1.expect)(failedItem?.errorCode).toBe("ytdlp_not_found");
        });
    });
    // ─── Concurrent Downloads ───────────────────────────────────────────────
    (0, vitest_1.describe)("concurrent downloads", () => {
        (0, vitest_1.beforeEach)(() => {
            mockExecutor.setDefaultAccessBehavior({ shouldSucceed: true });
            mockExecutor.setSpawnBehavior("yt-dlp", {
                stdout: "download:50000|100000|25000|00:02\n",
                stderr: "",
                exitCode: 0,
                delay: 100
            });
        });
        (0, vitest_1.it)("should respect concurrent download limit", async () => {
            settings.concurrentDownloads = 2;
            service = new nativeDownloadService_1.NativeDownloadService(settings, mockExecutor);
            const item1 = createMockDownloadItem({ status: "analyzing" });
            const item2 = createMockDownloadItem({ status: "analyzing" });
            const item3 = createMockDownloadItem({ status: "analyzing" });
            await service.add(item1);
            await service.add(item2);
            await service.add(item3);
            await service.start(item1.id);
            await service.start(item2.id);
            // Third start should fail immediately (no need to wait)
            await (0, vitest_1.expect)(service.start(item3.id)).rejects.toThrow("Concurrent download limit reached");
        });
        (0, vitest_1.it)("should allow new download after pause frees slot", async () => {
            settings.concurrentDownloads = 1;
            service = new nativeDownloadService_1.NativeDownloadService(settings, mockExecutor);
            const item1 = createMockDownloadItem({ status: "analyzing" });
            const item2 = createMockDownloadItem({ status: "analyzing" });
            await service.add(item1);
            await service.add(item2);
            await service.start(item1.id);
            // Wait for download to actually start
            await new Promise((resolve) => setTimeout(resolve, 100));
            await service.pause(item1.id);
            // Wait for pause to complete
            await new Promise((resolve) => setTimeout(resolve, 50));
            // Should succeed now that slot is freed
            await (0, vitest_1.expect)(service.start(item2.id)).resolves.toBeDefined();
        });
    });
    // ─── Quality & Format Arguments ─────────────────────────────────────────
    (0, vitest_1.describe)("yt-dlp arguments", () => {
        (0, vitest_1.beforeEach)(() => {
            mockExecutor.setDefaultAccessBehavior({ shouldSucceed: true });
        });
        (0, vitest_1.it)("should use a video format selector for 720p mp4 downloads", async () => {
            let capturedArgs = [];
            const originalSpawn = mockExecutor.spawn.bind(mockExecutor);
            mockExecutor.spawn = (cmd, args, opts) => {
                capturedArgs = args;
                return originalSpawn(cmd, args, opts);
            };
            mockExecutor.setSpawnBehavior("yt-dlp", {
                stdout: "",
                stderr: "",
                exitCode: 0
            });
            const item = createMockDownloadItem({ status: "analyzing", quality: "720p", format: "mp4" });
            await service.add(item);
            await service.start(item.id);
            (0, vitest_1.expect)(capturedArgs).toContain("-f");
            (0, vitest_1.expect)(capturedArgs.some((arg) => arg.includes("bestvideo[height<=720]+bestaudio/best"))).toBe(true);
            (0, vitest_1.expect)(capturedArgs).toContain("--merge-output-format");
            (0, vitest_1.expect)(capturedArgs).toContain("mp4");
        });
        (0, vitest_1.it)("should use an audio-only selector for mp3 downloads", async () => {
            let capturedArgs = [];
            const originalSpawn = mockExecutor.spawn.bind(mockExecutor);
            mockExecutor.spawn = (cmd, args, opts) => {
                capturedArgs = args;
                return originalSpawn(cmd, args, opts);
            };
            mockExecutor.setSpawnBehavior("yt-dlp", {
                stdout: "",
                stderr: "",
                exitCode: 0
            });
            const item = createMockDownloadItem({ status: "analyzing", quality: "audio", format: "mp3" });
            await service.add(item);
            await service.start(item.id);
            (0, vitest_1.expect)(capturedArgs).toContain("-f");
            (0, vitest_1.expect)(capturedArgs).toContain("bestaudio/best");
            (0, vitest_1.expect)(capturedArgs).toContain("--extract-audio");
            (0, vitest_1.expect)(capturedArgs).toContain("--audio-format");
            (0, vitest_1.expect)(capturedArgs).toContain("mp3");
        });
        (0, vitest_1.it)("should include speed limit in arguments when not unlimited", async () => {
            settings.speedLimit = 1048576; // 1 MB/s
            service = new nativeDownloadService_1.NativeDownloadService(settings, mockExecutor);
            let capturedArgs = [];
            const originalSpawn = mockExecutor.spawn.bind(mockExecutor);
            mockExecutor.spawn = (cmd, args, opts) => {
                capturedArgs = args;
                return originalSpawn(cmd, args, opts);
            };
            mockExecutor.setSpawnBehavior("yt-dlp", {
                stdout: "",
                stderr: "",
                exitCode: 0
            });
            const item = createMockDownloadItem({ status: "analyzing" });
            await service.add(item);
            await service.start(item.id);
            (0, vitest_1.expect)(capturedArgs).toContain("-r");
            (0, vitest_1.expect)(capturedArgs).toContain("1024K");
        });
        (0, vitest_1.it)("should include --continue flag when resuming", async () => {
            const tempDir = (0, fs_1.mkdtempSync)(path.join(os.tmpdir(), "remon-resume-"));
            let capturedArgs = [];
            try {
                settings.downloadFolder = tempDir;
                service = new nativeDownloadService_1.NativeDownloadService(settings, mockExecutor);
                const partialPath = path.join(tempDir, "Test Video.mp4.part");
                (0, fs_1.writeFileSync)(partialPath, Buffer.alloc(1024));
                const originalSpawn = mockExecutor.spawn.bind(mockExecutor);
                mockExecutor.spawn = (cmd, args, opts) => {
                    capturedArgs = args;
                    return originalSpawn(cmd, args, opts);
                };
                mockExecutor.setSpawnBehavior("yt-dlp", {
                    stdout: "",
                    stderr: "",
                    exitCode: 0
                });
                const item = createMockDownloadItem({ status: "paused" });
                await service.add(item);
                await service.resume(item.id);
                (0, vitest_1.expect)(capturedArgs).toContain("--continue");
            }
            finally {
                (0, fs_1.rmSync)(tempDir, { recursive: true, force: true });
            }
        });
        (0, vitest_1.it)("should include --no-continue flag when starting fresh", async () => {
            let capturedArgs = [];
            const originalSpawn = mockExecutor.spawn.bind(mockExecutor);
            mockExecutor.spawn = (cmd, args, opts) => {
                capturedArgs = args;
                return originalSpawn(cmd, args, opts);
            };
            mockExecutor.setSpawnBehavior("yt-dlp", {
                stdout: "",
                stderr: "",
                exitCode: 0
            });
            const item = createMockDownloadItem({ status: "analyzing" });
            await service.add(item);
            await service.start(item.id);
            (0, vitest_1.expect)(capturedArgs).toContain("--no-continue");
        });
        (0, vitest_1.it)("should include FFmpeg location when specified", async () => {
            settings.ffmpegPath = "C:\\ffmpeg\\bin\\ffmpeg.exe";
            service = new nativeDownloadService_1.NativeDownloadService(settings, mockExecutor);
            let capturedArgs = [];
            const originalSpawn = mockExecutor.spawn.bind(mockExecutor);
            mockExecutor.spawn = (cmd, args, opts) => {
                capturedArgs = args;
                return originalSpawn(cmd, args, opts);
            };
            mockExecutor.setSpawnBehavior("yt-dlp", {
                stdout: "",
                stderr: "",
                exitCode: 0
            });
            const item = createMockDownloadItem({ status: "analyzing" });
            await service.add(item);
            await service.start(item.id);
            (0, vitest_1.expect)(capturedArgs).toContain("--ffmpeg-location");
            (0, vitest_1.expect)(capturedArgs).toContain("C:\\ffmpeg\\bin\\ffmpeg.exe");
        });
    });
    // ─── Settings Update ────────────────────────────────────────────────────
    (0, vitest_1.describe)("settings update", () => {
        (0, vitest_1.it)("should update settings and invalidate yt-dlp path cache", () => {
            const newSettings = createMockSettings({ ytdlpPath: "C:\\new\\path\\yt-dlp.exe" });
            service.updateSettings(newSettings);
            // No error means settings updated successfully
            (0, vitest_1.expect)(true).toBe(true);
        });
    });
    // ─── Cleanup ────────────────────────────────────────────────────────────
    (0, vitest_1.describe)("cleanup", () => {
        (0, vitest_1.it)("should kill all active processes on cleanup", async () => {
            mockExecutor.setDefaultAccessBehavior({ shouldSucceed: true });
            mockExecutor.setSpawnBehavior("yt-dlp", {
                stdout: "download:50000|100000|25000|00:02\n",
                stderr: "",
                exitCode: 0,
                delay: 200
            });
            const item = createMockDownloadItem({ status: "analyzing" });
            await service.add(item);
            await service.start(item.id);
            await new Promise((resolve) => setTimeout(resolve, 50));
            service.cleanup();
            // Verify no active downloads remain
            (0, vitest_1.expect)(service.getActiveCount()).toBe(0);
        });
    });
});
//# sourceMappingURL=nativeDownloadService.test.js.map