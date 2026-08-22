"use strict";
/**
 * Download IPC Integration Tests
 *
 * Tests the full IPC chain for download operations:
 * Renderer Adapter → IPC Channel → Handler → NativeDownloadService → ProcessExecutor
 *
 * Uses MockProcessExecutor to simulate yt-dlp without network dependency.
 *
 * Test Coverage:
 * - IPC channel contracts (request/response envelopes)
 * - Download operations (add, start, pause, resume, cancel, retry, remove, reorder)
 * - Error propagation through IPC chain
 * - Progress and state-change events
 * - Concurrent download limits
 * - ElectronDownloadService adapter behavior
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const channels_1 = require("./channels");
const nativeDownloadService_1 = require("../services/nativeDownloadService");
const events_1 = require("events");
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
    }
    setSpawnBehavior(command, behavior) {
        this.spawnBehaviors.set(command, behavior);
    }
    setAccessBehavior(path, shouldSucceed) {
        this.accessBehaviors.set(path, shouldSucceed);
    }
    spawn(command, _args, _options) {
        const behavior = this.spawnBehaviors.get(command) || { exitCode: 0 };
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
        const shouldSucceed = this.accessBehaviors.get(path) || false;
        if (!shouldSucceed) {
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
/**
 * Simulates IPC handler invocation (mimics what ipcMain.handle does)
 */
async function simulateHandler(channel, payload, service) {
    try {
        let result;
        switch (channel) {
            case channels_1.IPC_CHANNELS.DOWNLOAD_GET_ALL:
                result = await service.getAll();
                break;
            case channels_1.IPC_CHANNELS.DOWNLOAD_ADD:
                result = await service.add(payload.item);
                break;
            case channels_1.IPC_CHANNELS.DOWNLOAD_START:
                result = await service.start(payload.id);
                break;
            case channels_1.IPC_CHANNELS.DOWNLOAD_PAUSE:
                result = await service.pause(payload.id);
                break;
            case channels_1.IPC_CHANNELS.DOWNLOAD_RESUME:
                result = await service.resume(payload.id);
                break;
            case channels_1.IPC_CHANNELS.DOWNLOAD_CANCEL:
                result = await service.cancel(payload.id);
                break;
            case channels_1.IPC_CHANNELS.DOWNLOAD_RETRY:
                result = await service.retry(payload.id);
                break;
            case channels_1.IPC_CHANNELS.DOWNLOAD_REMOVE:
                result = await service.remove(payload.id);
                break;
            case channels_1.IPC_CHANNELS.DOWNLOAD_REORDER:
                result = await service.reorder(payload.orderedIds);
                break;
            default:
                throw new Error(`Unknown channel: ${channel}`);
        }
        return { success: true, data: result };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            success: false,
            error: { code: "unknown", message, recoverable: true }
        };
    }
}
// ─── Tests ──────────────────────────────────────────────────────────────────
(0, vitest_1.describe)("Download IPC Integration", () => {
    let mockExecutor;
    let settings;
    let service;
    (0, vitest_1.beforeEach)(() => {
        mockExecutor = new MockProcessExecutor();
        settings = createMockSettings();
        service = new nativeDownloadService_1.NativeDownloadService(settings, mockExecutor);
        // Setup default yt-dlp mock
        mockExecutor.setAccessBehavior("yt-dlp", true);
        mockExecutor.setSpawnBehavior("yt-dlp", {
            stdout: "download:50000|100000|25000|00:02\n",
            stderr: "",
            exitCode: 0
        });
    });
    // ─── IPC Channel Contract ───────────────────────────────────────────────
    (0, vitest_1.describe)("IPC channel contract", () => {
        (0, vitest_1.it)("should use correct channel for DOWNLOAD_GET_ALL", async () => {
            (0, vitest_1.expect)(channels_1.IPC_CHANNELS.DOWNLOAD_GET_ALL).toBe("download:get-all");
        });
        (0, vitest_1.it)("should use correct channel for DOWNLOAD_ADD", async () => {
            (0, vitest_1.expect)(channels_1.IPC_CHANNELS.DOWNLOAD_ADD).toBe("download:add");
        });
        (0, vitest_1.it)("should use correct channel for DOWNLOAD_START", async () => {
            (0, vitest_1.expect)(channels_1.IPC_CHANNELS.DOWNLOAD_START).toBe("download:start");
        });
        (0, vitest_1.it)("should use correct channel for DOWNLOAD_PAUSE", async () => {
            (0, vitest_1.expect)(channels_1.IPC_CHANNELS.DOWNLOAD_PAUSE).toBe("download:pause");
        });
        (0, vitest_1.it)("should use correct channel for DOWNLOAD_RESUME", async () => {
            (0, vitest_1.expect)(channels_1.IPC_CHANNELS.DOWNLOAD_RESUME).toBe("download:resume");
        });
        (0, vitest_1.it)("should use correct channel for DOWNLOAD_CANCEL", async () => {
            (0, vitest_1.expect)(channels_1.IPC_CHANNELS.DOWNLOAD_CANCEL).toBe("download:cancel");
        });
        (0, vitest_1.it)("should use correct channel for DOWNLOAD_RETRY", async () => {
            (0, vitest_1.expect)(channels_1.IPC_CHANNELS.DOWNLOAD_RETRY).toBe("download:retry");
        });
        (0, vitest_1.it)("should use correct channel for DOWNLOAD_REMOVE", async () => {
            (0, vitest_1.expect)(channels_1.IPC_CHANNELS.DOWNLOAD_REMOVE).toBe("download:remove");
        });
        (0, vitest_1.it)("should use correct event channel for DOWNLOAD_PROGRESS", () => {
            (0, vitest_1.expect)(channels_1.IPC_EVENTS.DOWNLOAD_PROGRESS).toBe("download:progress");
        });
        (0, vitest_1.it)("should use correct event channel for DOWNLOAD_STATE_CHANGE", () => {
            (0, vitest_1.expect)(channels_1.IPC_EVENTS.DOWNLOAD_STATE_CHANGE).toBe("download:state-change");
        });
    });
    // ─── IPC Handler Simulation ─────────────────────────────────────────────
    (0, vitest_1.describe)("IPC handler responses", () => {
        (0, vitest_1.it)("should return IpcResult envelope on success", async () => {
            const item = createMockDownloadItem();
            const result = await simulateHandler(channels_1.IPC_CHANNELS.DOWNLOAD_ADD, { item }, service);
            (0, vitest_1.expect)(result.success).toBe(true);
            if (result.success) {
                (0, vitest_1.expect)(result.data).toBeDefined();
                (0, vitest_1.expect)(result.data.id).toBe(item.id);
            }
        });
        (0, vitest_1.it)("should return error envelope on failure", async () => {
            const result = await simulateHandler(channels_1.IPC_CHANNELS.DOWNLOAD_START, { id: "non-existent" }, service);
            (0, vitest_1.expect)(result.success).toBe(false);
            if (!result.success) {
                (0, vitest_1.expect)(result.error).toBeDefined();
                (0, vitest_1.expect)(result.error.code).toBe("unknown");
                (0, vitest_1.expect)(result.error.message).toContain("not found");
            }
        });
    });
    // ─── Download Operations ────────────────────────────────────────────────
    (0, vitest_1.describe)("download operations via IPC", () => {
        (0, vitest_1.it)("should add download item via IPC", async () => {
            const item = createMockDownloadItem();
            const result = await simulateHandler(channels_1.IPC_CHANNELS.DOWNLOAD_ADD, { item }, service);
            (0, vitest_1.expect)(result.success).toBe(true);
            if (result.success) {
                (0, vitest_1.expect)(result.data.id).toBe(item.id);
                (0, vitest_1.expect)(result.data.status).toBe("queued");
            }
        });
        (0, vitest_1.it)("should get all downloads via IPC", async () => {
            const item1 = createMockDownloadItem();
            const item2 = createMockDownloadItem();
            await service.add(item1);
            await service.add(item2);
            const result = await simulateHandler(channels_1.IPC_CHANNELS.DOWNLOAD_GET_ALL, {}, service);
            (0, vitest_1.expect)(result.success).toBe(true);
            if (result.success) {
                (0, vitest_1.expect)(result.data).toHaveLength(2);
            }
        });
        (0, vitest_1.it)("should start download via IPC", async () => {
            const item = createMockDownloadItem({ status: "analyzing" });
            await service.add(item);
            const result = await simulateHandler(channels_1.IPC_CHANNELS.DOWNLOAD_START, { id: item.id }, service);
            (0, vitest_1.expect)(result.success).toBe(true);
            if (result.success) {
                (0, vitest_1.expect)(result.data.status).toBe("downloading");
            }
        });
        (0, vitest_1.it)("should pause download via IPC", async () => {
            const item = createMockDownloadItem({ status: "analyzing" });
            await service.add(item);
            await service.start(item.id);
            await new Promise((resolve) => setTimeout(resolve, 20));
            const result = await simulateHandler(channels_1.IPC_CHANNELS.DOWNLOAD_PAUSE, { id: item.id }, service);
            (0, vitest_1.expect)(result.success).toBe(true);
            if (result.success) {
                (0, vitest_1.expect)(result.data.status).toBe("paused");
            }
        });
        (0, vitest_1.it)("should resume download via IPC", async () => {
            const item = createMockDownloadItem({ status: "paused" });
            await service.add(item);
            const result = await simulateHandler(channels_1.IPC_CHANNELS.DOWNLOAD_RESUME, { id: item.id }, service);
            (0, vitest_1.expect)(result.success).toBe(true);
            if (result.success) {
                (0, vitest_1.expect)(result.data.status).toBe("downloading");
            }
        });
        (0, vitest_1.it)("should cancel download via IPC", async () => {
            const item = createMockDownloadItem({ status: "analyzing" });
            await service.add(item);
            await service.start(item.id);
            await new Promise((resolve) => setTimeout(resolve, 20));
            const result = await simulateHandler(channels_1.IPC_CHANNELS.DOWNLOAD_CANCEL, { id: item.id }, service);
            (0, vitest_1.expect)(result.success).toBe(true);
            if (result.success) {
                (0, vitest_1.expect)(result.data.status).toBe("canceled");
            }
        });
        (0, vitest_1.it)("should retry download via IPC", async () => {
            const item = createMockDownloadItem({ status: "failed" });
            await service.add(item);
            const result = await simulateHandler(channels_1.IPC_CHANNELS.DOWNLOAD_RETRY, { id: item.id }, service);
            (0, vitest_1.expect)(result.success).toBe(true);
            if (result.success) {
                (0, vitest_1.expect)(result.data.status).toBe("retrying");
                (0, vitest_1.expect)(result.data.retryCount).toBe(1);
            }
        });
        (0, vitest_1.it)("should remove download via IPC", async () => {
            const item = createMockDownloadItem();
            await service.add(item);
            const result = await simulateHandler(channels_1.IPC_CHANNELS.DOWNLOAD_REMOVE, { id: item.id }, service);
            (0, vitest_1.expect)(result.success).toBe(true);
            if (result.success) {
                (0, vitest_1.expect)(result.data).toBe(item.id);
            }
            const all = await service.getAll();
            (0, vitest_1.expect)(all).toHaveLength(0);
        });
        (0, vitest_1.it)("should reorder downloads via IPC", async () => {
            const item1 = createMockDownloadItem();
            const item2 = createMockDownloadItem();
            const item3 = createMockDownloadItem();
            await service.add(item1);
            await service.add(item2);
            await service.add(item3);
            const result = await simulateHandler(channels_1.IPC_CHANNELS.DOWNLOAD_REORDER, { orderedIds: [item3.id, item1.id, item2.id] }, service);
            (0, vitest_1.expect)(result.success).toBe(true);
            if (result.success) {
                (0, vitest_1.expect)(result.data).toHaveLength(3);
                (0, vitest_1.expect)(result.data[0].id).toBe(item3.id);
                (0, vitest_1.expect)(result.data[1].id).toBe(item1.id);
                (0, vitest_1.expect)(result.data[2].id).toBe(item2.id);
            }
        });
    });
    // ─── Error Propagation ──────────────────────────────────────────────────
    (0, vitest_1.describe)("error propagation through IPC", () => {
        (0, vitest_1.it)("should propagate item not found error", async () => {
            const result = await simulateHandler(channels_1.IPC_CHANNELS.DOWNLOAD_START, { id: "invalid-id" }, service);
            (0, vitest_1.expect)(result.success).toBe(false);
            if (!result.success) {
                (0, vitest_1.expect)(result.error.message).toContain("not found");
            }
        });
        (0, vitest_1.it)("should propagate concurrent limit error", async () => {
            settings.concurrentDownloads = 1;
            service = new nativeDownloadService_1.NativeDownloadService(settings, mockExecutor);
            // Setup spawn behavior for successful download
            mockExecutor.setAccessBehavior("yt-dlp", true);
            mockExecutor.setSpawnBehavior("yt-dlp", {
                stdout: "download:50000|100000|25000|00:02\n",
                stderr: "",
                exitCode: 0,
                delay: 100
            });
            const item1 = createMockDownloadItem({ status: "analyzing" });
            const item2 = createMockDownloadItem({ status: "analyzing" });
            await service.add(item1);
            await service.add(item2);
            // First start should succeed
            const result1 = await simulateHandler(channels_1.IPC_CHANNELS.DOWNLOAD_START, { id: item1.id }, service);
            (0, vitest_1.expect)(result1.success).toBe(true);
            // Wait for download to actually start
            await new Promise((resolve) => setTimeout(resolve, 50));
            // Second start should fail due to concurrent limit
            const result2 = await simulateHandler(channels_1.IPC_CHANNELS.DOWNLOAD_START, { id: item2.id }, service);
            (0, vitest_1.expect)(result2.success).toBe(false);
            if (!result2.success) {
                (0, vitest_1.expect)(result2.error.message).toContain("Concurrent download limit");
            }
        });
        (0, vitest_1.it)("should propagate yt-dlp not found error", async () => {
            mockExecutor.setAccessBehavior("yt-dlp", false);
            mockExecutor.setSpawnBehavior("yt-dlp", { exitCode: 1 });
            mockExecutor.setSpawnBehavior("yt-dlp.exe", { exitCode: 1 });
            mockExecutor.setSpawnBehavior("youtube-dl", { exitCode: 1 });
            mockExecutor.setSpawnBehavior("youtube-dl.exe", { exitCode: 1 });
            service = new nativeDownloadService_1.NativeDownloadService(settings, mockExecutor);
            const item = createMockDownloadItem({ status: "analyzing" });
            await service.add(item);
            const result = await simulateHandler(channels_1.IPC_CHANNELS.DOWNLOAD_START, { id: item.id }, service);
            (0, vitest_1.expect)(result.success).toBe(false);
        });
    });
    // ─── Event Emission ─────────────────────────────────────────────────────
    (0, vitest_1.describe)("progress and state-change events", () => {
        (0, vitest_1.beforeEach)(async () => {
            // Cache yt-dlp path to avoid resolution issues in tests
            mockExecutor.setAccessBehavior("yt-dlp", true);
            mockExecutor.setSpawnBehavior("yt-dlp", {
                stdout: "2024.01.01",
                stderr: "",
                exitCode: 0,
                delay: 10
            });
            // Trigger path resolution
            const tempItem = createMockDownloadItem({ status: "analyzing" });
            await service.add(tempItem);
            await service.start(tempItem.id).catch(() => { }); // Will cache ytdlp path
            await service.remove(tempItem.id);
        });
        (0, vitest_1.it)("should emit progress events during download", async () => {
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
        });
        (0, vitest_1.it)("should emit state-change events during lifecycle", async () => {
            const stateChangeEvents = [];
            service.on("download:state-change", (payload) => stateChangeEvents.push(payload));
            mockExecutor.setSpawnBehavior("yt-dlp", {
                stdout: "download:50.0%|47.7KiB|95.4KiB|25.0KiB/s|00:02\n",
                stderr: "",
                exitCode: 0,
                delay: 50
            });
            const item = createMockDownloadItem({ status: "analyzing" });
            await service.add(item);
            await service.start(item.id);
            await new Promise((resolve) => setTimeout(resolve, 100));
            (0, vitest_1.expect)(stateChangeEvents.length).toBeGreaterThan(0);
            const statuses = stateChangeEvents.map((e) => e.status);
            (0, vitest_1.expect)(statuses).toContain("downloading");
        });
        (0, vitest_1.it)("should emit state-change event with error details on failure", async () => {
            const stateChangeEvents = [];
            service.on("download:state-change", (payload) => stateChangeEvents.push(payload));
            mockExecutor.setSpawnBehavior("yt-dlp", {
                stdout: "",
                stderr: "ERROR: Video unavailable",
                exitCode: 1,
                delay: 50
            });
            const item = createMockDownloadItem({ status: "analyzing" });
            await service.add(item);
            await service.start(item.id);
            await new Promise((resolve) => setTimeout(resolve, 200));
            const failedEvent = stateChangeEvents.find((e) => e.status === "failed");
            (0, vitest_1.expect)(failedEvent).toBeDefined();
            if (failedEvent) {
                (0, vitest_1.expect)(failedEvent.errorCode).toBe("video_unavailable");
                (0, vitest_1.expect)(failedEvent.errorMessage).toBeDefined();
            }
        });
    });
    // ─── Concurrent Downloads ───────────────────────────────────────────────
    (0, vitest_1.describe)("concurrent download management via IPC", () => {
        (0, vitest_1.it)("should respect concurrent limit across multiple IPC calls", async () => {
            settings.concurrentDownloads = 2;
            service = new nativeDownloadService_1.NativeDownloadService(settings, mockExecutor);
            // Use a long delay so downloads stay active when the third start is attempted
            mockExecutor.setAccessBehavior("yt-dlp", true);
            mockExecutor.setSpawnBehavior("yt-dlp", {
                stdout: "download:50000|100000|25000|00:02\n",
                stderr: "",
                exitCode: 0,
                delay: 5000
            });
            const item1 = createMockDownloadItem({ status: "analyzing" });
            const item2 = createMockDownloadItem({ status: "analyzing" });
            const item3 = createMockDownloadItem({ status: "analyzing" });
            await simulateHandler(channels_1.IPC_CHANNELS.DOWNLOAD_ADD, { item: item1 }, service);
            await simulateHandler(channels_1.IPC_CHANNELS.DOWNLOAD_ADD, { item: item2 }, service);
            await simulateHandler(channels_1.IPC_CHANNELS.DOWNLOAD_ADD, { item: item3 }, service);
            await simulateHandler(channels_1.IPC_CHANNELS.DOWNLOAD_START, { id: item1.id }, service);
            await simulateHandler(channels_1.IPC_CHANNELS.DOWNLOAD_START, { id: item2.id }, service);
            const result = await simulateHandler(channels_1.IPC_CHANNELS.DOWNLOAD_START, { id: item3.id }, service);
            (0, vitest_1.expect)(result.success).toBe(false);
            if (!result.success) {
                (0, vitest_1.expect)(result.error.message).toContain("Concurrent download limit");
            }
        });
    });
});
//# sourceMappingURL=downloadIpc.test.js.map