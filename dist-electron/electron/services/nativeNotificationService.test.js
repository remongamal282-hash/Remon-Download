"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const nativeNotificationService_1 = require("./nativeNotificationService");
const { notificationInstances, notificationConstructor } = vitest_1.vi.hoisted(() => {
    const instances = [];
    const constructor = Object.assign(vitest_1.vi.fn((options) => {
        const instance = { options, show: vitest_1.vi.fn() };
        instances.push(instance);
        return instance;
    }), { isSupported: vitest_1.vi.fn(() => true) });
    return { notificationInstances: instances, notificationConstructor: constructor };
});
const { nativeImageMock } = vitest_1.vi.hoisted(() => ({
    nativeImageMock: {
        createFromBuffer: vitest_1.vi.fn(() => ({ source: "thumbnail", isEmpty: vitest_1.vi.fn(() => false) })),
        createFromPath: vitest_1.vi.fn((filePath) => ({ filePath, isEmpty: vitest_1.vi.fn(() => false) }))
    }
}));
vitest_1.vi.mock("electron", () => ({
    Notification: notificationConstructor,
    nativeImage: nativeImageMock,
    app: {
        getPath: vitest_1.vi.fn(() => process.env.TEMP ?? "."),
        getAppPath: vitest_1.vi.fn(() => process.cwd())
    }
}));
function createSettings(overrides) {
    return {
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
        fileNameTemplate: "%(title)s.%(ext)s",
        ytdlpPath: "",
        ffmpegPath: "",
        proxy: "",
        ...overrides
    };
}
function createItem(overrides) {
    return {
        id: "download-1",
        metadataId: "metadata-1",
        thumbnail: "",
        title: "Example Video",
        sourceUrl: "https://www.youtube.com/watch?v=example",
        quality: "720p",
        format: "mp4",
        fileSize: 100,
        downloadedSize: 100,
        speed: 0,
        eta: "--",
        progress: 100,
        status: "completed",
        order: 1,
        addedAt: new Date().toISOString(),
        phaseStartedAt: Date.now(),
        lastUpdatedAt: Date.now(),
        retryCount: 0,
        ...overrides
    };
}
function createSchedule(overrides) {
    return {
        id: "schedule-1",
        sourceUrl: "https://www.youtube.com/watch?v=example",
        date: "2026-08-19",
        time: "12:00",
        repeat: "once",
        status: "triggered",
        nextRunAt: "2026-08-19T12:00:00.000Z",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        triggerCount: 1,
        ...overrides
    };
}
(0, vitest_1.describe)("NativeNotificationService", () => {
    (0, vitest_1.beforeEach)(() => {
        notificationInstances.length = 0;
        notificationConstructor.mockClear();
        notificationConstructor.isSupported.mockReturnValue(true);
        nativeImageMock.createFromPath.mockClear();
    });
    (0, vitest_1.it)("does not notify when notifications are disabled", () => {
        const service = new nativeNotificationService_1.NativeNotificationService(createSettings({ enableNotifications: false }));
        service.handleDownloadStateChange({ id: "download-1", status: "completed", progress: 100, downloadedSize: 100, fileSize: 100, speed: 0, eta: "--" }, createItem());
        (0, vitest_1.expect)(notificationConstructor).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)("respects completed and failed notification settings", () => {
        const service = new nativeNotificationService_1.NativeNotificationService(createSettings({ notificationWhenCompleted: false }));
        const completed = { id: "download-1", status: "completed", progress: 100, downloadedSize: 100, fileSize: 100, speed: 0, eta: "--" };
        const failed = { id: "download-2", status: "failed", progress: 10, downloadedSize: 10, fileSize: 100, speed: 0, eta: "--", errorMessage: "Network error" };
        service.handleDownloadStateChange(completed, createItem());
        service.handleDownloadStateChange(failed, createItem({ id: "download-2", status: "failed" }));
        (0, vitest_1.expect)(notificationConstructor).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(notificationInstances[0]?.options).toMatchObject({ title: "Example Video", body: "Network error" });
    });
    (0, vitest_1.it)("notifies for completed and failed downloads with fallbacks", () => {
        const service = new nativeNotificationService_1.NativeNotificationService(createSettings());
        service.handleDownloadStateChange({ id: "download-1", status: "completed", progress: 100, downloadedSize: 100, fileSize: 100, speed: 0, eta: "--" }, createItem({ title: "" }));
        service.handleDownloadStateChange({ id: "download-2", status: "failed", progress: 0, downloadedSize: 0, fileSize: 100, speed: 0, eta: "--" }, createItem({ id: "download-2", title: "Failed Video", status: "failed" }));
        (0, vitest_1.expect)(notificationInstances.map((instance) => instance.options)).toEqual([
            vitest_1.expect.objectContaining({ title: "Remon Download", body: "Download completed successfully", icon: vitest_1.expect.anything() }),
            vitest_1.expect.objectContaining({ title: "Failed Video", body: "Download failed", icon: vitest_1.expect.anything() })
        ]);
    });
    (0, vitest_1.it)("localizes completion and scheduled notifications in Arabic", async () => {
        vitest_1.vi.stubGlobal("fetch", vitest_1.vi.fn(async () => new Response(Uint8Array.from([1, 2, 3]), {
            status: 200,
            headers: { "content-type": "image/jpeg" }
        })));
        const service = new nativeNotificationService_1.NativeNotificationService(createSettings({ language: "ar" }));
        service.handleDownloadStateChange({ id: "download-ar", status: "completed", progress: 100, downloadedSize: 100, fileSize: 100, speed: 0, eta: "--" }, createItem({ id: "download-ar", thumbnail: "https://example.com/ar-thumbnail.jpg" }));
        await vitest_1.vi.waitFor(() => (0, vitest_1.expect)(notificationConstructor).toHaveBeenCalledTimes(1));
        service.notifyScheduledDownload(createSchedule({ id: "schedule-ar" }));
        await vitest_1.vi.waitFor(() => (0, vitest_1.expect)(notificationConstructor).toHaveBeenCalledTimes(2));
        const bodies = notificationInstances.map((instance) => instance.options.body);
        (0, vitest_1.expect)(bodies).toContain("تم تحميل الفيديو بنجاح");
        (0, vitest_1.expect)(bodies).toContain("تمت إضافة التحميل المجدول إلى قائمة التنزيلات");
        vitest_1.vi.unstubAllGlobals();
    });
    (0, vitest_1.it)("keeps notification messages in English for English settings", () => {
        const service = new nativeNotificationService_1.NativeNotificationService(createSettings({ language: "en" }));
        service.handleDownloadStateChange({ id: "download-en", status: "failed", progress: 0, downloadedSize: 0, fileSize: 100, speed: 0, eta: "--" }, createItem({ id: "download-en", status: "failed" }));
        (0, vitest_1.expect)(notificationInstances[0]?.options).toMatchObject({ body: "Download failed" });
    });
    (0, vitest_1.it)("uses a clear English message instead of exposing the exit code", () => {
        const service = new nativeNotificationService_1.NativeNotificationService(createSettings({ language: "en" }));
        service.handleDownloadStateChange({
            id: "download-english-exit-code",
            status: "failed",
            progress: 0,
            downloadedSize: 0,
            fileSize: 100,
            speed: 0,
            eta: "--",
            errorMessage: "Download failed with exit code 1"
        }, createItem({ id: "download-english-exit-code", status: "failed" }));
        (0, vitest_1.expect)(notificationInstances[0]?.options).toMatchObject({
            body: "Download failed during processing"
        });
    });
    (0, vitest_1.it)("localizes an exit-code failure in Arabic", () => {
        const service = new nativeNotificationService_1.NativeNotificationService(createSettings({ language: "ar" }));
        service.handleDownloadStateChange({
            id: "download-exit-code",
            status: "failed",
            progress: 0,
            downloadedSize: 0,
            fileSize: 100,
            speed: 0,
            eta: "--",
            errorCode: "ytdlp_error",
            errorMessage: "Download failed with exit code 1"
        }, createItem({ id: "download-exit-code", status: "failed" }));
        (0, vitest_1.expect)(notificationInstances[0]?.options).toMatchObject({
            body: "تعذر تحميل الفيديو بسبب خطأ أثناء المعالجة"
        });
    });
    (0, vitest_1.it)("localizes an English fallback network message in Arabic", () => {
        const service = new nativeNotificationService_1.NativeNotificationService(createSettings({ language: "ar" }));
        service.handleDownloadStateChange({
            id: "download-network-fallback",
            status: "failed",
            progress: 0,
            downloadedSize: 0,
            fileSize: 100,
            speed: 0,
            eta: "--",
            errorMessage: "Network error"
        }, createItem({ id: "download-network-fallback", status: "failed" }));
        (0, vitest_1.expect)(notificationInstances[0]?.options).toMatchObject({
            body: "فشل تحميل الفيديو بسبب خطأ في الشبكة"
        });
    });
    (0, vitest_1.it)("uses the video thumbnail when it is available", async () => {
        vitest_1.vi.stubGlobal("fetch", vitest_1.vi.fn(async () => new Response(Uint8Array.from([1, 2, 3]), {
            status: 200,
            headers: { "content-type": "image/jpeg" }
        })));
        const service = new nativeNotificationService_1.NativeNotificationService(createSettings());
        service.handleDownloadStateChange({ id: "download-thumbnail", status: "completed", progress: 100, downloadedSize: 100, fileSize: 100, speed: 0, eta: "--" }, createItem({ id: "download-thumbnail", thumbnail: "https://example.com/thumbnail.jpg" }));
        await vitest_1.vi.waitFor(() => (0, vitest_1.expect)(notificationConstructor).toHaveBeenCalledTimes(1));
        (0, vitest_1.expect)(notificationInstances[0]?.options).toMatchObject({
            title: "Example Video",
            body: "Download completed successfully",
            icon: vitest_1.expect.objectContaining({ source: "thumbnail" })
        });
        vitest_1.vi.unstubAllGlobals();
    });
    (0, vitest_1.it)("uses one scheduled playlist notification for the playlist", async () => {
        vitest_1.vi.stubGlobal("fetch", vitest_1.vi.fn(async () => new Response(Uint8Array.from([1, 2, 3]), {
            status: 200,
            headers: { "content-type": "image/jpeg" }
        })));
        const service = new nativeNotificationService_1.NativeNotificationService(createSettings());
        const schedule = createSchedule({ id: "schedule-playlist", triggerCount: 1 });
        service.notifyScheduledDownload(schedule, {
            ...createItem(),
            id: "playlist-video-1",
            title: "First Playlist Video",
            thumbnail: "https://example.com/first.jpg"
        });
        service.notifyScheduledDownload(schedule, {
            ...createItem(),
            id: "playlist-video-2",
            title: "Second Playlist Video",
            thumbnail: "https://example.com/second.jpg"
        });
        await vitest_1.vi.waitFor(() => (0, vitest_1.expect)(notificationConstructor).toHaveBeenCalledTimes(1));
        (0, vitest_1.expect)(notificationInstances[0]?.options).toMatchObject({
            title: "First Playlist Video",
            icon: vitest_1.expect.objectContaining({ source: "thumbnail" })
        });
        vitest_1.vi.unstubAllGlobals();
    });
    (0, vitest_1.it)("keeps playlist notifications on the application icon", async () => {
        vitest_1.vi.stubGlobal("fetch", vitest_1.vi.fn(async () => new Response(Uint8Array.from([1, 2, 3]), {
            status: 200,
            headers: { "content-type": "image/jpeg" }
        })));
        const service = new nativeNotificationService_1.NativeNotificationService(createSettings());
        service.handleDownloadStateChange({ id: "playlist-download-2", status: "completed", progress: 100, downloadedSize: 100, fileSize: 100, speed: 0, eta: "--" }, createItem({
            id: "playlist-download-2",
            title: "Playlist Video 2",
            thumbnail: "",
            sourceUrl: "https://www.youtube.com/watch?v=playlist-video-2"
        }));
        await vitest_1.vi.waitFor(() => (0, vitest_1.expect)(notificationConstructor).toHaveBeenCalledTimes(1));
        (0, vitest_1.expect)(nativeImageMock.createFromPath).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(nativeImageMock.createFromPath.mock.calls[0]?.[0]).toContain("icon.ico");
        vitest_1.vi.unstubAllGlobals();
    });
    (0, vitest_1.it)("falls back to the application icon when the thumbnail fails", async () => {
        vitest_1.vi.stubGlobal("fetch", vitest_1.vi.fn(async () => new Response(null, { status: 503 })));
        const service = new nativeNotificationService_1.NativeNotificationService(createSettings());
        service.handleDownloadStateChange({ id: "download-thumbnail-error", status: "completed", progress: 100, downloadedSize: 100, fileSize: 100, speed: 0, eta: "--" }, createItem({ id: "download-thumbnail-error", thumbnail: "https://example.com/thumbnail.jpg" }));
        await vitest_1.vi.waitFor(() => (0, vitest_1.expect)(notificationConstructor).toHaveBeenCalledTimes(1));
        (0, vitest_1.expect)(notificationInstances[0]?.options).toEqual(vitest_1.expect.objectContaining({
            title: "Example Video",
            body: "Download completed successfully",
            icon: vitest_1.expect.anything()
        }));
        vitest_1.vi.unstubAllGlobals();
    });
    (0, vitest_1.it)("ignores non-terminal download states", () => {
        const service = new nativeNotificationService_1.NativeNotificationService(createSettings());
        const statuses = ["queued", "analyzing", "downloading", "paused", "retrying", "merging", "converting", "canceled"];
        statuses.forEach((status) => {
            service.handleDownloadStateChange({ id: `download-${status}`, status, progress: 0, downloadedSize: 0, fileSize: 100, speed: 0, eta: "--" }, createItem({ id: `download-${status}`, status }));
        });
        (0, vitest_1.expect)(notificationConstructor).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)("deduplicates terminal events and allows a new retry lifecycle", () => {
        const service = new nativeNotificationService_1.NativeNotificationService(createSettings());
        const completed = { id: "download-1", status: "completed", progress: 100, downloadedSize: 100, fileSize: 100, speed: 0, eta: "--" };
        const failed = { id: "download-1", status: "failed", progress: 10, downloadedSize: 10, fileSize: 100, speed: 0, eta: "--", errorMessage: "Failed" };
        const retrying = { id: "download-1", status: "retrying", progress: 10, downloadedSize: 10, fileSize: 100, speed: 0, eta: "--" };
        service.handleDownloadStateChange(completed, createItem());
        service.handleDownloadStateChange(completed, createItem());
        service.handleDownloadStateChange(retrying, createItem({ status: "retrying" }));
        service.handleDownloadStateChange(failed, createItem({ status: "failed" }));
        service.handleDownloadStateChange(failed, createItem({ status: "failed" }));
        (0, vitest_1.expect)(notificationConstructor).toHaveBeenCalledTimes(2);
    });
    (0, vitest_1.it)("notifies scheduled triggers once per schedule and trigger count", () => {
        const service = new nativeNotificationService_1.NativeNotificationService(createSettings());
        const first = createSchedule();
        service.notifyScheduledDownload(first);
        service.notifyScheduledDownload(first);
        service.notifyScheduledDownload(createSchedule({ triggerCount: 2 }));
        (0, vitest_1.expect)(notificationConstructor).toHaveBeenCalledTimes(2);
        (0, vitest_1.expect)(notificationInstances[0]?.options).toMatchObject({ body: "Scheduled download queued" });
    });
    (0, vitest_1.it)("uses scheduled video thumbnail", async () => {
        vitest_1.vi.stubGlobal("fetch", vitest_1.vi.fn(async () => new Response(Uint8Array.from([1, 2, 3]), {
            status: 200,
            headers: { "content-type": "image/jpeg" }
        })));
        const service = new nativeNotificationService_1.NativeNotificationService(createSettings());
        service.notifyScheduledDownload(createSchedule(), {
            id: "scheduled-video-1",
            sourceUrl: "https://www.youtube.com/watch?v=example",
            linkType: "video",
            thumbnail: "https://example.com/scheduled-thumbnail.jpg",
            title: "Example Video",
            channelName: "Example Channel",
            duration: "10:00",
            views: 100,
            qualityOptions: ["720p"],
            videoFormats: ["mp4"],
            audioFormats: ["mp3"],
            resolution: "720p",
            fps: 30,
            videoCodec: "H.264",
            audioCodec: "AAC",
            videoBitrate: "1 Mbps",
            audioBitrate: "128 Kbps",
            container: "mp4",
            fileSize: 100,
            uploadDate: "2026-08-19"
        });
        await vitest_1.vi.waitFor(() => (0, vitest_1.expect)(notificationConstructor).toHaveBeenCalledTimes(1));
        (0, vitest_1.expect)(notificationInstances[0]?.options).toMatchObject({
            title: "Example Video",
            body: "Scheduled download queued",
            icon: vitest_1.expect.objectContaining({ source: "thumbnail" })
        });
        vitest_1.vi.unstubAllGlobals();
    });
    (0, vitest_1.it)("handles unsupported notifications gracefully", () => {
        notificationConstructor.isSupported.mockReturnValue(false);
        const service = new nativeNotificationService_1.NativeNotificationService(createSettings());
        (0, vitest_1.expect)(() => service.notifyScheduledDownload(createSchedule())).not.toThrow();
        (0, vitest_1.expect)(notificationConstructor).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)("handles constructor errors without propagating them", () => {
        notificationConstructor.mockImplementationOnce(() => {
            throw new Error("Notification unavailable");
        });
        const service = new nativeNotificationService_1.NativeNotificationService(createSettings());
        (0, vitest_1.expect)(() => service.notifyScheduledDownload(createSchedule())).not.toThrow();
        (0, vitest_1.expect)(() => service.notifyScheduledDownload(createSchedule({ triggerCount: 2 }))).not.toThrow();
        (0, vitest_1.expect)(notificationConstructor).toHaveBeenCalledTimes(2);
    });
});
//# sourceMappingURL=nativeNotificationService.test.js.map