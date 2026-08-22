"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const schedulerBackground_1 = require("./schedulerBackground");
function makeMetadata(overrides = {}) {
    return {
        id: 'meta-1',
        sourceUrl: 'https://example.com/video',
        linkType: 'video',
        thumbnail: 'https://example.com/thumb.jpg',
        title: 'Scheduled Video',
        channelName: 'Channel',
        duration: '03:15',
        views: 123456,
        qualityOptions: ['1080p'],
        videoFormats: ['mp4'],
        audioFormats: ['mp3'],
        resolution: '1080p',
        fps: 30,
        videoCodec: 'H.264',
        audioCodec: 'AAC',
        videoBitrate: '5 Mbps',
        audioBitrate: '192 Kbps',
        container: 'mp4',
        fileSize: 1024 * 1024,
        uploadDate: '2024-01-01',
        ...overrides,
    };
}
function makeSchedule(overrides = {}) {
    return {
        id: 'sched-1',
        sourceUrl: 'https://example.com/video',
        date: '2024-01-01',
        time: '12:00',
        repeat: 'once',
        status: 'scheduled',
        nextRunAt: '2024-01-01T12:00:00.000Z',
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-01T10:00:00.000Z',
        triggerCount: 0,
        ...overrides,
    };
}
(0, vitest_1.describe)('SchedulerBackgroundLoop', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.it)('starts with Electron Main Process and executes a due scheduled task', async () => {
        const metadata = makeMetadata();
        const schedule = makeSchedule({
            id: 'sched-1',
            status: 'triggered',
            triggerCount: 1,
            nextRunAt: new Date(Date.now() - 60000).toISOString(),
        });
        const schedulerService = {
            tick: vitest_1.vi.fn(async () => ({
                items: [schedule],
                triggered: [{ schedule, metadata: [metadata] }],
            })),
        };
        const add = vitest_1.vi.fn(async (item) => item);
        const start = vitest_1.vi.fn(async (id) => ({ id, status: 'downloading' }));
        const downloadService = { add, start };
        const loop = new schedulerBackground_1.SchedulerBackgroundLoop({
            schedulerService: schedulerService,
            getDownloadService: () => downloadService,
            pollMs: 1000,
        });
        loop.start();
        await new Promise((resolve) => setTimeout(resolve, 50));
        (0, vitest_1.expect)(schedulerService.tick).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(add).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(start).toHaveBeenCalledWith(vitest_1.expect.any(String));
        (0, vitest_1.expect)(loop.isRunning()).toBe(true);
        loop.stop();
    });
    (0, vitest_1.it)('prevents duplicate execution of the same scheduled task', async () => {
        const metadata = makeMetadata();
        const schedule = makeSchedule({
            id: 'sched-dup',
            status: 'triggered',
            triggerCount: 2,
            nextRunAt: new Date(Date.now() - 60000).toISOString(),
        });
        const add = vitest_1.vi.fn(async (item) => item);
        const start = vitest_1.vi.fn(async (id) => ({ id, status: 'downloading' }));
        const schedulerService = {
            tick: vitest_1.vi.fn()
                .mockResolvedValueOnce({ items: [schedule], triggered: [{ schedule, metadata: [metadata] }] })
                .mockResolvedValueOnce({ items: [schedule], triggered: [{ schedule, metadata: [metadata] }] })
        };
        const loop = new schedulerBackground_1.SchedulerBackgroundLoop({
            schedulerService: schedulerService,
            getDownloadService: () => ({ add, start }),
            pollMs: 1000,
        });
        loop.start();
        await new Promise((resolve) => setTimeout(resolve, 1100));
        (0, vitest_1.expect)(add).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(start).toHaveBeenCalledTimes(1);
        loop.stop();
    });
    (0, vitest_1.it)('starts one native download for every scheduled playlist video', async () => {
        const schedule = makeSchedule({ id: 'sched-playlist', status: 'triggered', triggerCount: 1 });
        const metadata = [makeMetadata({ id: 'playlist-video-1' }), makeMetadata({ id: 'playlist-video-2' })];
        const add = vitest_1.vi.fn(async (item) => item);
        const start = vitest_1.vi.fn(async (id) => ({ id, status: 'downloading' }));
        const schedulerService = {
            tick: vitest_1.vi.fn(async () => ({ items: [schedule], triggered: [{ schedule, metadata }] }))
        };
        const loop = new schedulerBackground_1.SchedulerBackgroundLoop({
            schedulerService: schedulerService,
            getDownloadService: () => ({ add, start }),
            pollMs: 1000,
        });
        await loop.tickOnce(Date.now());
        (0, vitest_1.expect)(add).toHaveBeenCalledTimes(2);
        (0, vitest_1.expect)(start).toHaveBeenCalledTimes(2);
    });
    (0, vitest_1.it)('queues remaining scheduled playlist videos when the concurrent limit is one', async () => {
        const schedule = makeSchedule({ id: 'sched-limited', status: 'triggered', triggerCount: 1 });
        const metadata = [makeMetadata({ id: 'playlist-video-1' }), makeMetadata({ id: 'playlist-video-2' })];
        const add = vitest_1.vi.fn(async (item) => item);
        const start = vitest_1.vi.fn()
            .mockResolvedValueOnce({ id: 'scheduled-1', status: 'downloading' })
            .mockRejectedValueOnce(new Error('Concurrent download limit reached'))
            .mockResolvedValueOnce({ id: 'scheduled-2', status: 'downloading' });
        const schedulerService = {
            tick: vitest_1.vi.fn(async () => ({ items: [schedule], triggered: [{ schedule, metadata }] })),
            update: vitest_1.vi.fn(async () => schedule)
        };
        const listeners = [];
        const downloadService = {
            add,
            start,
            on: vitest_1.vi.fn((_event, listener) => listeners.push(listener))
        };
        const loop = new schedulerBackground_1.SchedulerBackgroundLoop({
            schedulerService: schedulerService,
            getDownloadService: () => downloadService,
            pollMs: 1000,
        });
        await loop.tickOnce(Date.now());
        (0, vitest_1.expect)(add).toHaveBeenCalledTimes(2);
        (0, vitest_1.expect)(start).toHaveBeenCalledTimes(2);
        listeners[0]?.({ id: add.mock.calls[0]?.[0].id, status: 'completed', progress: 100, downloadedSize: 1, fileSize: 1, speed: 0, eta: '--' });
        await new Promise((resolve) => setTimeout(resolve, 0));
        (0, vitest_1.expect)(start).toHaveBeenCalledTimes(3);
    });
    (0, vitest_1.it)('works without a SchedulerPage and can be stopped cleanly', async () => {
        const schedulerService = {
            tick: vitest_1.vi.fn(async () => ({ items: [], triggered: [] })),
        };
        const loop = new schedulerBackground_1.SchedulerBackgroundLoop({
            schedulerService: schedulerService,
            getDownloadService: () => null,
            pollMs: 1000,
        });
        loop.start();
        (0, vitest_1.expect)(loop.isRunning()).toBe(true);
        (0, vitest_1.expect)(loop.hasActiveTimer()).toBe(true);
        loop.stop();
        (0, vitest_1.expect)(loop.isRunning()).toBe(false);
        (0, vitest_1.expect)(loop.hasActiveTimer()).toBe(false);
    });
});
//# sourceMappingURL=schedulerBackground.test.js.map