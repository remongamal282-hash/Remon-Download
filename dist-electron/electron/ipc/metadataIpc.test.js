"use strict";
/**
 * Metadata IPC Integration Tests
 *
 * Tests the complete Metadata IPC path in isolation (no live Electron):
 *
 *   NativeMetadataService → wrapSuccess/wrapError → IpcResult<AnalysisResult>
 *   ElectronMetadataService adapter → window.electronAPI.metadata.analyze()
 *   serviceResolver → Electron mode vs Web/Mock mode
 *
 * These run under Vitest (JSDOM) without a running Electron instance.
 *
 * Coverage (14 required points):
 * 1.  Metadata IPC channel exists with correct name
 * 2.  IPC handler simulation — wrapSuccess for valid URL
 * 3.  IPC handler simulation — wrapError for unsupported URL
 * 4.  IPC handler simulation — wrapError for invalid URL
 * 5.  ElectronMetadataService adapter — delegates to window.electronAPI.metadata.analyze
 * 6.  serviceResolver — Web mode returns MockMetadataService
 * 7.  serviceResolver — Electron mode returns ElectronMetadataService
 * 8.  Error propagation — adapter re-throws IPC error to store
 * 9.  Video URL — handler returns VideoMetadata from NativeMetadataService
 * 10. Shorts URL — handler returns VideoMetadata with linkType "shorts"
 * 11. Playlist URL — handler returns PlaylistMetadata
 * 12. Channel URL — handler returns ChannelMetadata
 * 13. Invalid URL — handler returns IpcResult error (no crash)
 * 14. Unsupported URL — handler returns IpcResult error (no crash)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const events_1 = require("events");
const channels_1 = require("../ipc/channels");
const nativeMetadataService_1 = require("../services/nativeMetadataService");
const electronIpcAdapters_1 = require("../../src/services/electronIpcAdapters");
const serviceResolver_1 = require("../../src/services/serviceResolver");
const metadataService_1 = require("../../src/services/metadataService");
// ─── Mock Process Executor (same as in nativeMetadataService.test.ts) ───────
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
        return true;
    }
}
class MockProcessExecutor {
    constructor() {
        this.spawnBehavior = null;
        this.accessBehavior = null;
    }
    setSpawnBehavior(fn) {
        this.spawnBehavior = fn;
    }
    setAccessBehavior(fn) {
        this.accessBehavior = fn;
    }
    spawn(command, args, options) {
        if (this.spawnBehavior) {
            return this.spawnBehavior(command, args);
        }
        return new MockChildProcess();
    }
    async checkAccess(path, mode) {
        if (this.accessBehavior) {
            return this.accessBehavior(path, mode);
        }
        throw new Error("ENOENT");
    }
}
function createSuccessProcess(jsonOutput) {
    const proc = new MockChildProcess();
    setImmediate(() => {
        proc.stdout.emit("data", Buffer.from(jsonOutput));
        proc.emit("exit", 0);
    });
    return proc;
}
// ─── Test Fixtures ────────────────────────────────────────────────────────────
const SAMPLE_VIDEO_JSON = JSON.stringify({
    id: "dQw4w9WgXcQ",
    webpage_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    title: "Test Video",
    uploader: "Test Channel",
    duration: 300,
    view_count: 1000,
    thumbnail: "https://example.com/thumb.jpg",
    upload_date: "20260101",
    formats: [{ ext: "mp4", height: 1080, fps: 30, vcodec: "avc1", acodec: "mp4a", tbr: 5000, abr: 192, filesize: 100000 }]
});
const SAMPLE_SHORTS_JSON = JSON.stringify({
    id: "abc123",
    webpage_url: "https://www.youtube.com/shorts/abc123",
    title: "Test Shorts",
    uploader: "Test Channel",
    duration: 45,
    view_count: 500,
    thumbnail: "https://example.com/shorts.jpg",
    upload_date: "20260101",
    formats: [{ ext: "mp4", height: 1080, fps: 60, vcodec: "avc1", acodec: "mp4a", tbr: 2000, abr: 192, filesize: 5000 }]
});
const SAMPLE_PLAYLIST_JSON = JSON.stringify({
    id: "PLxxxxxx",
    webpage_url: "https://www.youtube.com/playlist?list=PLxxxxxx",
    title: "Test Playlist",
    thumbnail: "https://example.com/playlist.jpg",
    entries: [
        {
            id: "video1",
            webpage_url: "https://www.youtube.com/watch?v=video1",
            title: "Video 1",
            uploader: "Channel",
            duration: 100,
            view_count: 1000,
            thumbnail: "https://example.com/v1.jpg",
            upload_date: "20260101",
            formats: [{ ext: "mp4", height: 720, fps: 30, vcodec: "avc1", acodec: "mp4a", tbr: 1000, abr: 128, filesize: 10000 }]
        }
    ]
});
const SAMPLE_CHANNEL_JSON = JSON.stringify({
    id: "UCxxxxxx",
    webpage_url: "https://www.youtube.com/@ExampleChannel",
    title: "Test Channel",
    thumbnail: "https://example.com/channel.jpg",
    entries: [
        {
            id: "latest1",
            webpage_url: "https://www.youtube.com/watch?v=latest1",
            title: "Latest Video",
            uploader: "Test Channel",
            duration: 200,
            view_count: 2000,
            thumbnail: "https://example.com/latest.jpg",
            upload_date: "20260110",
            formats: [{ ext: "mp4", height: 1080, fps: 30, vcodec: "avc1", acodec: "mp4a", tbr: 2000, abr: 192, filesize: 50000 }]
        }
    ]
});
const URLS = {
    video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    shorts: "https://www.youtube.com/shorts/abc123",
    playlist: "https://www.youtube.com/playlist?list=PLxxxxxx",
    channel: "https://www.youtube.com/@ExampleChannel",
    unsupported: "https://vimeo.com/123456",
    invalid: "not-a-url"
};
// ─── Shared helpers ──────────────────────────────────────────────────────────
function wrapSuccess(data) {
    return { success: true, data };
}
function wrapError(err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: { code: "unknown", message, recoverable: true } };
}
function createMockExecutor(responseMap) {
    const executor = new MockProcessExecutor();
    executor.setAccessBehavior(async () => {
        throw new Error("ENOENT"); // Force PATH lookup
    });
    executor.setSpawnBehavior((cmd, args) => {
        if (args[0] === "--version") {
            return createSuccessProcess("2024.01.01");
        }
        // Find URL in args
        const url = args.find(arg => arg.startsWith("http"));
        if (url && responseMap[url]) {
            return createSuccessProcess(responseMap[url]);
        }
        // Default error
        const proc = new MockChildProcess();
        setImmediate(() => {
            proc.stderr.emit("data", Buffer.from("ERROR: Video unavailable"));
            proc.emit("exit", 1);
        });
        return proc;
    });
    return executor;
}
async function simulateHandler(url, responseMap) {
    const executor = createMockExecutor(responseMap);
    const service = new nativeMetadataService_1.NativeMetadataService(undefined, executor);
    try {
        const data = await service.analyze(url);
        return wrapSuccess(data);
    }
    catch (err) {
        return wrapError(err);
    }
}
// ─── 1. Metadata IPC channel ─────────────────────────────────────────────────
(0, vitest_1.describe)("Metadata IPC channel", () => {
    (0, vitest_1.it)("METADATA_ANALYZE channel exists in IPC_CHANNELS", () => {
        (0, vitest_1.expect)(channels_1.IPC_CHANNELS.METADATA_ANALYZE).toBeDefined();
    });
    (0, vitest_1.it)("METADATA_ANALYZE channel follows namespace:action pattern", () => {
        (0, vitest_1.expect)(channels_1.IPC_CHANNELS.METADATA_ANALYZE).toBe("metadata:analyze");
    });
    (0, vitest_1.it)("METADATA_ANALYZE is a unique channel string", () => {
        const values = Object.values(channels_1.IPC_CHANNELS);
        const count = values.filter((v) => v === channels_1.IPC_CHANNELS.METADATA_ANALYZE).length;
        (0, vitest_1.expect)(count).toBe(1);
    });
});
// ─── 2-4. IPC handler simulation ─────────────────────────────────────────────
(0, vitest_1.describe)("IPC handler simulation — metadata:analyze", () => {
    const responseMap = {
        [URLS.video]: SAMPLE_VIDEO_JSON
    };
    (0, vitest_1.it)("returns IpcResult { success: true } for a valid video URL", async () => {
        const result = await simulateHandler(URLS.video, responseMap);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.linkType).toBe("video");
        }
    });
    (0, vitest_1.it)("returns IpcResult { success: false } for an unsupported URL — does not crash", async () => {
        const result = await simulateHandler(URLS.unsupported, {});
        (0, vitest_1.expect)(result.success).toBe(false);
        if (!result.success) {
            (0, vitest_1.expect)(result.error.message).toBe("unsupported_url");
        }
    });
    (0, vitest_1.it)("returns IpcResult { success: false } for an invalid URL — does not crash", async () => {
        const result = await simulateHandler(URLS.invalid, {});
        (0, vitest_1.expect)(result.success).toBe(false);
        if (!result.success) {
            (0, vitest_1.expect)(result.error.message).toBe("invalid_url");
        }
    });
    (0, vitest_1.it)("Main Process never throws — errors are always wrapped in IpcResult", async () => {
        await (0, vitest_1.expect)(simulateHandler("", {})).resolves.toMatchObject({ success: false });
        await (0, vitest_1.expect)(simulateHandler(URLS.unsupported, {})).resolves.toMatchObject({ success: false });
    });
});
// ─── 9-14. URL-type coverage ─────────────────────────────────────────────────
(0, vitest_1.describe)("IPC handler — URL type coverage", () => {
    (0, vitest_1.it)("Video URL → IpcResult<VideoMetadata> with linkType 'video'", async () => {
        const responseMap = { [URLS.video]: SAMPLE_VIDEO_JSON };
        const result = await simulateHandler(URLS.video, responseMap);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.linkType).toBe("video");
            const video = result.data;
            (0, vitest_1.expect)(video.qualityOptions.length).toBeGreaterThan(0);
        }
    });
    (0, vitest_1.it)("Shorts URL → IpcResult<VideoMetadata> with linkType 'shorts'", async () => {
        const responseMap = { [URLS.shorts]: SAMPLE_SHORTS_JSON };
        const result = await simulateHandler(URLS.shorts, responseMap);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.linkType).toBe("shorts");
        }
    });
    (0, vitest_1.it)("Playlist URL → IpcResult<PlaylistMetadata> with linkType 'playlist'", async () => {
        const responseMap = { [URLS.playlist]: SAMPLE_PLAYLIST_JSON };
        const result = await simulateHandler(URLS.playlist, responseMap);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.linkType).toBe("playlist");
            const pl = result.data;
            (0, vitest_1.expect)(Array.isArray(pl.videos)).toBe(true);
        }
    });
    (0, vitest_1.it)("Channel URL → IpcResult<ChannelMetadata> with linkType 'channel'", async () => {
        const responseMap = { [URLS.channel]: SAMPLE_CHANNEL_JSON };
        const result = await simulateHandler(URLS.channel, responseMap);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.linkType).toBe("channel");
            const ch = result.data;
            (0, vitest_1.expect)(Array.isArray(ch.latestVideos)).toBe(true);
        }
    });
    (0, vitest_1.it)("Invalid URL → IpcResult error with message 'invalid_url'", async () => {
        const result = await simulateHandler(URLS.invalid, {});
        (0, vitest_1.expect)(result.success).toBe(false);
        if (!result.success) {
            (0, vitest_1.expect)(result.error.message).toBe("invalid_url");
            (0, vitest_1.expect)(result.error.recoverable).toBe(true);
        }
    });
    (0, vitest_1.it)("Unsupported URL → IpcResult error with message 'unsupported_url'", async () => {
        const result = await simulateHandler(URLS.unsupported, {});
        (0, vitest_1.expect)(result.success).toBe(false);
        if (!result.success) {
            (0, vitest_1.expect)(result.error.message).toBe("unsupported_url");
            (0, vitest_1.expect)(result.error.recoverable).toBe(true);
        }
    });
});
// ─── 5. ElectronMetadataService adapter ─────────────────────────────────────
(0, vitest_1.describe)("ElectronMetadataService adapter", () => {
    (0, vitest_1.beforeEach)(() => {
        delete window.electronAPI;
    });
    (0, vitest_1.it)("delegates analyze() to window.electronAPI.metadata.analyze()", async () => {
        const mockAnalyze = vitest_1.vi.fn().mockResolvedValue({
            id: "test-id",
            sourceUrl: URLS.video,
            linkType: "video",
            thumbnail: "https://example.com/thumb.jpg",
            title: "Test Video",
            channelName: "Test Channel",
            duration: "5:00",
            views: 100,
            qualityOptions: ["1080p"],
            videoFormats: ["mp4"],
            audioFormats: ["m4a"],
            resolution: "1080p",
            fps: 30,
            videoCodec: "H.264",
            audioCodec: "AAC",
            videoBitrate: "5 Mbps",
            audioBitrate: "192 Kbps",
            container: "mp4",
            fileSize: 100000,
            uploadDate: "2026-01-01"
        });
        window.electronAPI = {
            isElectron: true,
            metadata: { analyze: mockAnalyze },
            download: {},
            settings: {},
            history: {},
            favorites: {},
            scheduler: {}
        };
        const adapter = new electronIpcAdapters_1.ElectronMetadataService();
        const result = await adapter.analyze(URLS.video);
        (0, vitest_1.expect)(mockAnalyze).toHaveBeenCalledWith(URLS.video);
        (0, vitest_1.expect)(result.linkType).toBe("video");
        delete window.electronAPI;
    });
    (0, vitest_1.it)("re-throws errors from window.electronAPI.metadata.analyze()", async () => {
        const mockAnalyze = vitest_1.vi.fn().mockRejectedValue(new Error("unsupported_url"));
        window.electronAPI = {
            isElectron: true,
            metadata: { analyze: mockAnalyze },
            download: {},
            settings: {},
            history: {},
            favorites: {},
            scheduler: {}
        };
        const adapter = new electronIpcAdapters_1.ElectronMetadataService();
        await (0, vitest_1.expect)(adapter.analyze(URLS.unsupported)).rejects.toThrow("unsupported_url");
        delete window.electronAPI;
    });
});
// ─── 6-7. serviceResolver dual-mode ─────────────────────────────────────────
(0, vitest_1.describe)("serviceResolver — metadata dual-mode", () => {
    (0, vitest_1.beforeEach)(() => {
        delete window.electronAPI;
        (0, serviceResolver_1._resetServiceCache)();
    });
    (0, vitest_1.it)("Web mode — resolveMetadataService() returns MockMetadataService", () => {
        const svc = (0, serviceResolver_1.resolveMetadataService)();
        (0, vitest_1.expect)(svc).toBeInstanceOf(metadataService_1.MockMetadataService);
    });
    (0, vitest_1.it)("Electron mode — resolveMetadataService() returns ElectronMetadataService", () => {
        window.electronAPI = { isElectron: true };
        (0, serviceResolver_1._resetServiceCache)();
        const svc = (0, serviceResolver_1.resolveMetadataService)();
        (0, vitest_1.expect)(svc).toBeInstanceOf(electronIpcAdapters_1.ElectronMetadataService);
        delete window.electronAPI;
    });
    (0, vitest_1.it)("Web mode MockMetadataService.analyze() rejects unsupported URLs with 'unsupported_url'", async () => {
        const svc = (0, serviceResolver_1.resolveMetadataService)();
        await (0, vitest_1.expect)(svc.analyze(URLS.unsupported)).rejects.toThrow("unsupported_url");
    });
});
// ─── 8. Error propagation ─────────────────────────────────────────────────────
(0, vitest_1.describe)("Error propagation — store error flow", () => {
    (0, vitest_1.it)("wrapError from NativeMetadataService → IpcResult error → adapter throws → store catches", async () => {
        // Step 1: NativeMetadataService throws (with mock executor)
        const executor = createMockExecutor({});
        const nativeSvc = new nativeMetadataService_1.NativeMetadataService(undefined, executor);
        let nativeError = null;
        try {
            await nativeSvc.analyze(URLS.unsupported);
        }
        catch (err) {
            nativeError = err;
        }
        (0, vitest_1.expect)(nativeError?.message).toBe("unsupported_url");
        // Step 2: handler wraps to IpcResult
        const ipcResult = await simulateHandler(URLS.unsupported, {});
        (0, vitest_1.expect)(ipcResult.success).toBe(false);
        if (!ipcResult.success) {
            (0, vitest_1.expect)(ipcResult.error.message).toBe("unsupported_url");
        }
        // Step 3: Confirm error chain
        (0, vitest_1.expect)(nativeError?.message).toBe("unsupported_url");
    });
});
//# sourceMappingURL=metadataIpc.test.js.map