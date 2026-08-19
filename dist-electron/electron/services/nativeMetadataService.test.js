"use strict";
/**
 * NativeMetadataService Tests with yt-dlp Integration
 *
 * Tests the yt-dlp subprocess integration without requiring:
 * - Live network connection to YouTube
 * - yt-dlp binary installed on test machine
 *
 * Uses MockProcessExecutor to simulate yt-dlp behavior.
 *
 * Coverage:
 * 1. yt-dlp path resolution (Settings path, PATH fallback, not found)
 * 2. Video URL metadata parsing
 * 3. Shorts URL metadata parsing
 * 4. Playlist URL metadata parsing
 * 5. Channel URL metadata parsing
 * 6. Invalid URL error handling
 * 7. Unsupported URL error handling
 * 8. yt-dlp not found error
 * 9. Spawn failure error
 * 10. Non-zero exit code error
 * 11. Invalid JSON error
 * 12. Timeout error
 * 13. Private video error
 * 14. Video unavailable error
 * 15. Network error
 * 16. URL argument safety (no shell injection)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const events_1 = require("events");
const nativeMetadataService_1 = require("./nativeMetadataService");
// ─── Mock Process Executor ──────────────────────────────────────────────────
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
        this.spawnCalls = [];
        this.accessCalls = [];
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
        this.spawnCalls.push({ command, args, options });
        if (this.spawnBehavior) {
            return this.spawnBehavior(command, args);
        }
        // Default: return mock process that does nothing
        return new MockChildProcess();
    }
    async checkAccess(path, mode) {
        this.accessCalls.push({ path, mode });
        if (this.accessBehavior) {
            return this.accessBehavior(path, mode);
        }
        // Default: throw error (file not found)
        throw new Error("ENOENT");
    }
    reset() {
        this.spawnCalls = [];
        this.accessCalls = [];
        this.spawnBehavior = null;
        this.accessBehavior = null;
    }
}
// ─── Helper Functions ───────────────────────────────────────────────────────
function createSuccessProcess(jsonOutput) {
    const proc = new MockChildProcess();
    setImmediate(() => {
        proc.stdout.emit("data", Buffer.from(jsonOutput));
        proc.emit("exit", 0);
    });
    return proc;
}
function createErrorProcess(exitCode, stderrMessage) {
    const proc = new MockChildProcess();
    setImmediate(() => {
        proc.stderr.emit("data", Buffer.from(stderrMessage));
        proc.emit("exit", exitCode);
    });
    return proc;
}
function createTimeoutProcess() {
    const proc = new MockChildProcess();
    setImmediate(() => {
        const error = new Error("Timeout");
        error.code = "ETIMEDOUT";
        proc.emit("error", error);
    });
    return proc;
}
function createSpawnErrorProcess(errorCode = "ENOENT") {
    const proc = new MockChildProcess();
    setImmediate(() => {
        const error = new Error(`spawn ${errorCode}`);
        error.code = errorCode;
        proc.emit("error", error);
    });
    return proc;
}
// ─── Test Fixtures ──────────────────────────────────────────────────────────
const SAMPLE_VIDEO_JSON = JSON.stringify({
    id: "dQw4w9WgXcQ",
    webpage_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    title: "Rick Astley - Never Gonna Give You Up",
    uploader: "Rick Astley",
    duration: 212,
    view_count: 1234567890,
    thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    upload_date: "20091024",
    formats: [
        {
            format_id: "22",
            ext: "mp4",
            height: 720,
            fps: 30,
            vcodec: "avc1",
            acodec: "mp4a",
            tbr: 1500,
            abr: 128,
            filesize: 50000000
        }
    ]
});
const SAMPLE_SHORTS_JSON = JSON.stringify({
    id: "abc123xyz",
    webpage_url: "https://www.youtube.com/shorts/abc123xyz",
    title: "Amazing Short Video",
    uploader: "Content Creator",
    duration: 45,
    view_count: 98765,
    thumbnail: "https://i.ytimg.com/vi/abc123xyz/maxresdefault.jpg",
    upload_date: "20260101",
    formats: [
        {
            format_id: "18",
            ext: "mp4",
            height: 1080,
            fps: 60,
            vcodec: "avc1",
            acodec: "mp4a",
            tbr: 2000,
            abr: 192,
            filesize: 10000000
        }
    ]
});
const SAMPLE_PLAYLIST_JSON = JSON.stringify({
    id: "PLxxxxxx",
    webpage_url: "https://www.youtube.com/playlist?list=PLxxxxxx",
    title: "My Amazing Playlist",
    thumbnail: "https://i.ytimg.com/vi/playlist/maxresdefault.jpg",
    entries: [
        {
            id: "video1",
            webpage_url: "https://www.youtube.com/watch?v=video1",
            title: "Playlist Video 1",
            uploader: "Channel Name",
            duration: 300,
            view_count: 1000,
            thumbnail: "https://i.ytimg.com/vi/video1/maxresdefault.jpg",
            upload_date: "20260101",
            formats: [{ ext: "mp4", height: 720, fps: 30, vcodec: "avc1", acodec: "mp4a", tbr: 1000, abr: 128, filesize: 20000000 }]
        },
        {
            id: "video2",
            webpage_url: "https://www.youtube.com/watch?v=video2",
            title: "Playlist Video 2",
            uploader: "Channel Name",
            duration: 240,
            view_count: 2000,
            thumbnail: "https://i.ytimg.com/vi/video2/maxresdefault.jpg",
            upload_date: "20260102",
            formats: [{ ext: "mp4", height: 1080, fps: 60, vcodec: "avc1", acodec: "mp4a", tbr: 1500, abr: 192, filesize: 30000000 }]
        }
    ]
});
const SAMPLE_CHANNEL_JSON = JSON.stringify({
    id: "UCxxxxxx",
    webpage_url: "https://www.youtube.com/@ChannelName",
    title: "Channel Name",
    thumbnail: "https://i.ytimg.com/channel/thumbnail.jpg",
    entries: [
        {
            id: "latest1",
            webpage_url: "https://www.youtube.com/watch?v=latest1",
            title: "Latest Video 1",
            uploader: "Channel Name",
            duration: 600,
            view_count: 5000,
            thumbnail: "https://i.ytimg.com/vi/latest1/maxresdefault.jpg",
            upload_date: "20260110",
            formats: [{ ext: "mp4", height: 1080, fps: 30, vcodec: "avc1", acodec: "mp4a", tbr: 2000, abr: 192, filesize: 100000000 }]
        }
    ]
});
// ─── Tests ──────────────────────────────────────────────────────────────────
(0, vitest_1.describe)("NativeMetadataService — yt-dlp Integration", () => {
    let mockExecutor;
    (0, vitest_1.beforeEach)(() => {
        mockExecutor = new MockProcessExecutor();
    });
    (0, vitest_1.describe)("yt-dlp path resolution", () => {
        (0, vitest_1.it)("uses Settings ytdlpPath if provided and valid", async () => {
            mockExecutor.setAccessBehavior(async () => { });
            mockExecutor.setSpawnBehavior(() => createSuccessProcess(SAMPLE_VIDEO_JSON));
            const service = new nativeMetadataService_1.NativeMetadataService("/custom/path/to/yt-dlp", mockExecutor);
            await service.analyze("https://www.youtube.com/watch?v=test");
            (0, vitest_1.expect)(mockExecutor.accessCalls).toHaveLength(1);
            (0, vitest_1.expect)(mockExecutor.accessCalls[0]?.path).toBe("/custom/path/to/yt-dlp");
            (0, vitest_1.expect)(mockExecutor.spawnCalls[0]?.command).toBe("/custom/path/to/yt-dlp");
        });
        (0, vitest_1.it)("falls back to PATH if Settings path is invalid", async () => {
            mockExecutor.setAccessBehavior(async () => {
                throw new Error("ENOENT");
            });
            mockExecutor.setSpawnBehavior((cmd, args) => {
                if (args[0] === "--version") {
                    return createSuccessProcess("2024.01.01");
                }
                return createSuccessProcess(SAMPLE_VIDEO_JSON);
            });
            const service = new nativeMetadataService_1.NativeMetadataService("/invalid/path", mockExecutor);
            await service.analyze("https://www.youtube.com/watch?v=test");
            (0, vitest_1.expect)(mockExecutor.spawnCalls[0]?.command).toBe("yt-dlp");
            (0, vitest_1.expect)(mockExecutor.spawnCalls[0]?.args[0]).toBe("--version");
            (0, vitest_1.expect)(mockExecutor.spawnCalls[1]?.command).toBe("yt-dlp");
            (0, vitest_1.expect)(mockExecutor.spawnCalls[1]?.args).toContain("--dump-single-json");
        });
        (0, vitest_1.it)("throws ytdlp_not_found if yt-dlp not in PATH", async () => {
            mockExecutor.setAccessBehavior(async () => {
                throw new Error("ENOENT");
            });
            mockExecutor.setSpawnBehavior(() => createSpawnErrorProcess("ENOENT"));
            const service = new nativeMetadataService_1.NativeMetadataService(undefined, mockExecutor);
            await (0, vitest_1.expect)(service.analyze("https://www.youtube.com/watch?v=test"))
                .rejects.toThrow("ytdlp_not_found");
        });
    });
    (0, vitest_1.describe)("Video URL", () => {
        (0, vitest_1.beforeEach)(() => {
            mockExecutor.setAccessBehavior(async () => {
                throw new Error("ENOENT");
            });
            mockExecutor.setSpawnBehavior((cmd, args) => {
                if (args[0] === "--version") {
                    return createSuccessProcess("2024.01.01");
                }
                return createSuccessProcess(SAMPLE_VIDEO_JSON);
            });
        });
        (0, vitest_1.it)("parses video metadata correctly", async () => {
            const service = new nativeMetadataService_1.NativeMetadataService(undefined, mockExecutor);
            const result = await service.analyze("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
            (0, vitest_1.expect)(result.linkType).toBe("video");
            (0, vitest_1.expect)(result.title).toBe("Rick Astley - Never Gonna Give You Up");
            (0, vitest_1.expect)(result).toMatchObject({
                linkType: "video",
                channelName: "Rick Astley",
                duration: "3:32",
                views: 1234567890,
                resolution: "720p",
                fps: 30
            });
        });
        (0, vitest_1.it)("passes URL as separate argument (security)", async () => {
            const service = new nativeMetadataService_1.NativeMetadataService(undefined, mockExecutor);
            const maliciousUrl = "https://www.youtube.com/watch?v=test; rm -rf /";
            await service.analyze(maliciousUrl);
            const metadataCall = mockExecutor.spawnCalls.find(call => call.args.includes("--dump-single-json"));
            (0, vitest_1.expect)(metadataCall?.args).toContain(maliciousUrl);
            (0, vitest_1.expect)(metadataCall?.options?.windowsHide).toBe(true);
        });
    });
    (0, vitest_1.describe)("Shorts URL", () => {
        (0, vitest_1.beforeEach)(() => {
            mockExecutor.setAccessBehavior(async () => {
                throw new Error("ENOENT");
            });
            mockExecutor.setSpawnBehavior((cmd, args) => {
                if (args[0] === "--version") {
                    return createSuccessProcess("2024.01.01");
                }
                return createSuccessProcess(SAMPLE_SHORTS_JSON);
            });
        });
        (0, vitest_1.it)("parses shorts metadata correctly", async () => {
            const service = new nativeMetadataService_1.NativeMetadataService(undefined, mockExecutor);
            const result = await service.analyze("https://www.youtube.com/shorts/abc123xyz");
            (0, vitest_1.expect)(result.linkType).toBe("shorts");
            (0, vitest_1.expect)(result.title).toBe("Amazing Short Video");
            (0, vitest_1.expect)(result).toMatchObject({
                linkType: "shorts",
                duration: "0:45"
            });
        });
    });
    (0, vitest_1.describe)("Playlist URL", () => {
        (0, vitest_1.beforeEach)(() => {
            mockExecutor.setAccessBehavior(async () => {
                throw new Error("ENOENT");
            });
            mockExecutor.setSpawnBehavior((cmd, args) => {
                if (args[0] === "--version") {
                    return createSuccessProcess("2024.01.01");
                }
                return createSuccessProcess(SAMPLE_PLAYLIST_JSON);
            });
        });
        (0, vitest_1.it)("parses playlist metadata with video entries", async () => {
            const service = new nativeMetadataService_1.NativeMetadataService(undefined, mockExecutor);
            const result = await service.analyze("https://www.youtube.com/playlist?list=PLxxxxxx");
            (0, vitest_1.expect)(result.linkType).toBe("playlist");
            if (result.linkType === "playlist") {
                (0, vitest_1.expect)(result.title).toBe("My Amazing Playlist");
                (0, vitest_1.expect)(result.videos).toHaveLength(2);
                (0, vitest_1.expect)(result.videos[0]?.title).toBe("Playlist Video 1");
                (0, vitest_1.expect)(result.videos[0]?.linkType).toBe("playlist-video");
            }
        });
        (0, vitest_1.it)("uses --yes-playlist flag for playlists", async () => {
            const service = new nativeMetadataService_1.NativeMetadataService(undefined, mockExecutor);
            await service.analyze("https://www.youtube.com/playlist?list=PLxxxxxx");
            const metadataCall = mockExecutor.spawnCalls.find(call => call.args.includes("--dump-single-json"));
            (0, vitest_1.expect)(metadataCall?.args).toContain("--yes-playlist");
            (0, vitest_1.expect)(metadataCall?.args).toContain("--flat-playlist");
        });
    });
    (0, vitest_1.describe)("Channel URL", () => {
        (0, vitest_1.beforeEach)(() => {
            mockExecutor.setAccessBehavior(async () => {
                throw new Error("ENOENT");
            });
            mockExecutor.setSpawnBehavior((cmd, args) => {
                if (args[0] === "--version") {
                    return createSuccessProcess("2024.01.01");
                }
                return createSuccessProcess(SAMPLE_CHANNEL_JSON);
            });
        });
        (0, vitest_1.it)("parses channel metadata with latest videos", async () => {
            const service = new nativeMetadataService_1.NativeMetadataService(undefined, mockExecutor);
            const result = await service.analyze("https://www.youtube.com/@ChannelName");
            (0, vitest_1.expect)(result.linkType).toBe("channel");
            if (result.linkType === "channel") {
                (0, vitest_1.expect)(result.name).toBe("Channel Name");
                (0, vitest_1.expect)(result.latestVideos).toHaveLength(1);
                (0, vitest_1.expect)(result.latestVideos[0]?.title).toBe("Latest Video 1");
            }
        });
    });
    (0, vitest_1.describe)("Error handling", () => {
        (0, vitest_1.it)("throws invalid_url for empty string", async () => {
            const service = new nativeMetadataService_1.NativeMetadataService(undefined, mockExecutor);
            await (0, vitest_1.expect)(service.analyze("")).rejects.toThrow("invalid_url");
        });
        (0, vitest_1.it)("throws invalid_url for non-URL string", async () => {
            const service = new nativeMetadataService_1.NativeMetadataService(undefined, mockExecutor);
            await (0, vitest_1.expect)(service.analyze("not-a-url")).rejects.toThrow("invalid_url");
        });
        (0, vitest_1.it)("throws unsupported_url for non-YouTube URL", async () => {
            const service = new nativeMetadataService_1.NativeMetadataService(undefined, mockExecutor);
            await (0, vitest_1.expect)(service.analyze("https://vimeo.com/123456")).rejects.toThrow("unsupported_url");
        });
        (0, vitest_1.it)("throws video_unavailable on yt-dlp unavailable error", async () => {
            mockExecutor.setAccessBehavior(async () => {
                throw new Error("ENOENT");
            });
            mockExecutor.setSpawnBehavior((cmd, args) => {
                if (args[0] === "--version") {
                    return createSuccessProcess("2024.01.01");
                }
                return createErrorProcess(1, "ERROR: Video unavailable");
            });
            const service = new nativeMetadataService_1.NativeMetadataService(undefined, mockExecutor);
            await (0, vitest_1.expect)(service.analyze("https://www.youtube.com/watch?v=unavailable"))
                .rejects.toThrow("video_unavailable");
        });
        (0, vitest_1.it)("throws video_private on yt-dlp private video error", async () => {
            mockExecutor.setAccessBehavior(async () => {
                throw new Error("ENOENT");
            });
            mockExecutor.setSpawnBehavior((cmd, args) => {
                if (args[0] === "--version") {
                    return createSuccessProcess("2024.01.01");
                }
                return createErrorProcess(1, "ERROR: This is a private video");
            });
            const service = new nativeMetadataService_1.NativeMetadataService(undefined, mockExecutor);
            await (0, vitest_1.expect)(service.analyze("https://www.youtube.com/watch?v=private"))
                .rejects.toThrow("video_private");
        });
        (0, vitest_1.it)("throws network_error on yt-dlp network failure", async () => {
            mockExecutor.setAccessBehavior(async () => {
                throw new Error("ENOENT");
            });
            mockExecutor.setSpawnBehavior((cmd, args) => {
                if (args[0] === "--version") {
                    return createSuccessProcess("2024.01.01");
                }
                return createErrorProcess(1, "ERROR: Unable to connect to server. Network error");
            });
            const service = new nativeMetadataService_1.NativeMetadataService(undefined, mockExecutor);
            await (0, vitest_1.expect)(service.analyze("https://www.youtube.com/watch?v=test"))
                .rejects.toThrow("network_error");
        });
        (0, vitest_1.it)("throws ytdlp_invalid_json on malformed JSON output", async () => {
            mockExecutor.setAccessBehavior(async () => {
                throw new Error("ENOENT");
            });
            mockExecutor.setSpawnBehavior((cmd, args) => {
                if (args[0] === "--version") {
                    return createSuccessProcess("2024.01.01");
                }
                const proc = new MockChildProcess();
                setImmediate(() => {
                    proc.stdout.emit("data", Buffer.from("{ invalid json"));
                    proc.emit("exit", 0);
                });
                return proc;
            });
            const service = new nativeMetadataService_1.NativeMetadataService(undefined, mockExecutor);
            await (0, vitest_1.expect)(service.analyze("https://www.youtube.com/watch?v=test"))
                .rejects.toThrow("ytdlp_invalid_json");
        });
        (0, vitest_1.it)("throws ytdlp_timeout on process timeout", async () => {
            mockExecutor.setAccessBehavior(async () => {
                throw new Error("ENOENT");
            });
            mockExecutor.setSpawnBehavior((cmd, args) => {
                if (args[0] === "--version") {
                    return createSuccessProcess("2024.01.01");
                }
                return createTimeoutProcess();
            });
            const service = new nativeMetadataService_1.NativeMetadataService(undefined, mockExecutor);
            await (0, vitest_1.expect)(service.analyze("https://www.youtube.com/watch?v=test"))
                .rejects.toThrow("ytdlp_timeout");
        });
        (0, vitest_1.it)("throws ytdlp_spawn_failed on spawn error", async () => {
            mockExecutor.setAccessBehavior(async () => {
                throw new Error("ENOENT");
            });
            mockExecutor.setSpawnBehavior((cmd, args) => {
                if (args[0] === "--version") {
                    return createSuccessProcess("2024.01.01");
                }
                return createSpawnErrorProcess("EPERM");
            });
            const service = new nativeMetadataService_1.NativeMetadataService(undefined, mockExecutor);
            await (0, vitest_1.expect)(service.analyze("https://www.youtube.com/watch?v=test"))
                .rejects.toThrow("ytdlp_spawn_failed");
        });
    });
    (0, vitest_1.describe)("URL classification (no yt-dlp call)", () => {
        (0, vitest_1.it)("classifies /shorts/ URLs correctly", () => {
            (0, vitest_1.expect)((0, nativeMetadataService_1.classifyYouTubeUrl)("https://www.youtube.com/shorts/abc123")).toBe("shorts");
        });
        (0, vitest_1.it)("classifies /channel/ URLs correctly", () => {
            (0, vitest_1.expect)((0, nativeMetadataService_1.classifyYouTubeUrl)("https://www.youtube.com/channel/UC123")).toBe("channel");
        });
        (0, vitest_1.it)("classifies /@handle URLs correctly", () => {
            (0, vitest_1.expect)((0, nativeMetadataService_1.classifyYouTubeUrl)("https://www.youtube.com/@ChannelName")).toBe("channel");
        });
        (0, vitest_1.it)("classifies playlist URLs correctly", () => {
            (0, vitest_1.expect)((0, nativeMetadataService_1.classifyYouTubeUrl)("https://www.youtube.com/playlist?list=PLxxx")).toBe("playlist");
        });
        (0, vitest_1.it)("classifies playlist-video URLs correctly", () => {
            (0, vitest_1.expect)((0, nativeMetadataService_1.classifyYouTubeUrl)("https://www.youtube.com/watch?v=abc&list=PLxxx")).toBe("playlist-video");
        });
        (0, vitest_1.it)("classifies regular video URLs correctly", () => {
            (0, vitest_1.expect)((0, nativeMetadataService_1.classifyYouTubeUrl)("https://www.youtube.com/watch?v=abc123")).toBe("video");
        });
    });
});
//# sourceMappingURL=nativeMetadataService.test.js.map