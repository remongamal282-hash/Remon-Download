"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schedulerService = exports.MockSchedulerService = void 0;
function buildRunAt(date, time) {
    return new Date(`${date}T${time}:00`).toISOString();
}
function addRepeatTime(runAt, repeat) {
    const date = new Date(runAt);
    if (repeat === "daily") {
        date.setDate(date.getDate() + 1);
    }
    else if (repeat === "weekly") {
        date.setDate(date.getDate() + 7);
    }
    return date.toISOString();
}
function deriveVideoTitle(sourceUrl, fallback) {
    try {
        const parsed = new URL(sourceUrl);
        const videoId = parsed.searchParams.get("v");
        if (videoId) {
            return videoId;
        }
        const lastSegment = parsed.pathname.split("/").filter(Boolean).at(-1);
        if (lastSegment) {
            return decodeURIComponent(lastSegment.replace(/[-_]/g, " "));
        }
    }
    catch {
        // Ignore invalid URLs and fall back to the scheduled fallback title.
    }
    return fallback;
}
function deriveVideoThumbnail(sourceUrl) {
    try {
        const parsed = new URL(sourceUrl);
        const videoId = parsed.searchParams.get("v");
        if (videoId) {
            return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        }
    }
    catch {
        // Ignore invalid URLs and fall back to the generic scheduled thumbnail.
    }
    return "https://picsum.photos/seed/remon-scheduled/320/180";
}
async function createMetadata(schedule) {
    const triggerNumber = schedule.triggerCount + 1;
    const fallbackTitle = `Scheduled Download ${triggerNumber}`;
    return {
        id: `scheduled-${schedule.id}-${triggerNumber}`,
        sourceUrl: schedule.sourceUrl,
        linkType: "video",
        thumbnail: deriveVideoThumbnail(schedule.sourceUrl),
        title: deriveVideoTitle(schedule.sourceUrl, fallbackTitle),
        channelName: "Scheduled Queue",
        duration: "10:24",
        views: 128000,
        qualityOptions: ["2160p", "1440p", "1080p", "720p", "480p"],
        videoFormats: ["mp4", "webm", "mkv"],
        audioFormats: ["mp3", "opus"],
        resolution: "1080p",
        fps: 60,
        videoCodec: "H.264",
        audioCodec: "AAC",
        videoBitrate: "7.8 Mbps",
        audioBitrate: "192 Kbps",
        container: "mp4",
        fileSize: 220 * 1024 * 1024,
        uploadDate: "2026-08-01"
    };
}
class MockSchedulerService {
    constructor() {
        this.items = [];
        this.nextError = null;
    }
    async getAll() {
        await this.delay();
        this.throwIfNeeded();
        return [...this.items];
    }
    async create(input) {
        await this.delay();
        this.throwIfNeeded();
        const now = new Date().toISOString();
        const item = {
            id: crypto.randomUUID(),
            sourceUrl: input.sourceUrl,
            date: input.date,
            time: input.time,
            repeat: input.repeat,
            status: "scheduled",
            nextRunAt: buildRunAt(input.date, input.time),
            createdAt: now,
            updatedAt: now,
            triggerCount: 0
        };
        this.items = [item, ...this.items];
        return item;
    }
    async update(id, input) {
        await this.delay();
        this.throwIfNeeded();
        const existing = this.find(id);
        const updated = {
            ...existing,
            sourceUrl: input.sourceUrl,
            date: input.date,
            time: input.time,
            repeat: input.repeat,
            status: "scheduled",
            nextRunAt: buildRunAt(input.date, input.time),
            updatedAt: new Date().toISOString(),
            errorMessage: undefined
        };
        this.items = this.items.map((item) => (item.id === id ? updated : item));
        return updated;
    }
    async cancel(id) {
        await this.delay();
        this.throwIfNeeded();
        const existing = this.find(id);
        const canceled = {
            ...existing,
            status: "canceled",
            updatedAt: new Date().toISOString()
        };
        this.items = this.items.map((item) => (item.id === id ? canceled : item));
        return canceled;
    }
    async remove(id) {
        await this.delay();
        this.throwIfNeeded();
        this.items = this.items.filter((item) => item.id !== id);
    }
    async tick(now) {
        this.throwIfNeeded();
        const triggered = [];
        const nowIso = new Date(now).toISOString();
        const nextItems = [];
        for (const item of this.items) {
            if (item.status !== "scheduled" || new Date(item.nextRunAt).getTime() > now) {
                nextItems.push(item);
                continue;
            }
            const triggeredItem = {
                ...item,
                status: item.repeat === "once" ? "triggered" : "scheduled",
                nextRunAt: item.repeat === "once" ? item.nextRunAt : addRepeatTime(item.nextRunAt, item.repeat),
                triggerCount: item.triggerCount + 1,
                lastTriggeredAt: nowIso,
                updatedAt: nowIso
            };
            triggered.push({
                schedule: triggeredItem,
                metadata: await createMetadata(item)
            });
            nextItems.push(triggeredItem);
        }
        this.items = nextItems;
        return {
            items: [...this.items],
            triggered
        };
    }
    async clear() {
        await this.delay();
        this.throwIfNeeded();
        this.items = [];
    }
    failNext(error) {
        this.nextError = error;
    }
    find(id) {
        const item = this.items.find((candidate) => candidate.id === id);
        if (!item) {
            throw {
                code: "unknown",
                message: "scheduler.errors.notFound",
                recoverable: true
            };
        }
        return item;
    }
    async delay() {
        await new Promise((resolve) => window.setTimeout(resolve, 120));
    }
    throwIfNeeded() {
        if (!this.nextError) {
            return;
        }
        const error = this.nextError;
        this.nextError = null;
        throw error;
    }
}
exports.MockSchedulerService = MockSchedulerService;
exports.schedulerService = new MockSchedulerService();
//# sourceMappingURL=schedulerService.js.map