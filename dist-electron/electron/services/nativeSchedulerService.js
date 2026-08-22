"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativeSchedulerService = void 0;
const fileStorage_1 = require("../utils/fileStorage");
const nativeMetadataService_1 = require("./nativeMetadataService");
function isSchedulerFileFormat(value) {
    return (!!value &&
        typeof value === 'object' &&
        'data' in value &&
        Array.isArray(value.data));
}
const VALID_REPEAT = new Set(['once', 'daily', 'weekly']);
const VALID_STATUS = new Set([
    'scheduled', 'triggered', 'completed', 'failed', 'canceled',
]);
function normalizeScheduledDownload(item) {
    if (!item || typeof item !== 'object')
        return null;
    const id = item['id'] !== undefined ? String(item['id']) : null;
    if (!id)
        return null;
    const now = new Date().toISOString();
    const repeat = VALID_REPEAT.has(String(item['repeat'] ?? ''))
        ? item['repeat']
        : 'once';
    const status = VALID_STATUS.has(String(item['status'] ?? ''))
        ? item['status']
        : 'scheduled';
    return {
        id,
        sourceUrl: String(item['sourceUrl'] ?? item['url'] ?? ''),
        date: String(item['date'] ?? now.slice(0, 10)),
        time: String(item['time'] ?? '00:00'),
        repeat,
        status,
        nextRunAt: String(item['nextRunAt'] ?? now),
        createdAt: String(item['createdAt'] ?? now),
        updatedAt: String(item['updatedAt'] ?? now),
        triggerCount: typeof item['triggerCount'] === 'number' ? item['triggerCount'] : 0,
        lastTriggeredAt: item['lastTriggeredAt'] !== undefined
            ? String(item['lastTriggeredAt'])
            : undefined,
        errorMessage: item['errorMessage'] !== undefined
            ? String(item['errorMessage'])
            : undefined,
    };
}
class NativeSchedulerService {
    constructor() {
        this.items = [];
        this.SCHEDULER_FILE = 'scheduler.json';
        this.FILE_VERSION = '1.0.0';
        this.initializationPromise = null;
        this.nextError = null;
    }
    /**
     * Initialize service by loading scheduler from disk.
     * Idempotent — multiple calls return the same promise.
     */
    async initialize() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }
        this.initializationPromise = (async () => {
            const fileData = await (0, fileStorage_1.readJsonFile)(this.SCHEDULER_FILE, {
                version: this.FILE_VERSION,
                data: [],
            });
            if (isSchedulerFileFormat(fileData)) {
                this.items = fileData.data
                    .map((item) => normalizeScheduledDownload(item))
                    .filter((item) => item !== null);
                return;
            }
            // Fallback: corrupted / legacy format
            this.items = [];
        })();
        return this.initializationPromise;
    }
    /**
     * Ensure service is initialized before any operation.
     */
    async ensureInitialized() {
        if (!this.initializationPromise) {
            await this.initialize();
        }
        else {
            await this.initializationPromise;
        }
    }
    /**
     * Persist current scheduler state to disk.
     */
    async persist() {
        await (0, fileStorage_1.writeJsonFile)(this.SCHEDULER_FILE, {
            version: this.FILE_VERSION,
            data: this.items,
        });
    }
    async getAll() {
        this.throwIfNeeded();
        await this.ensureInitialized();
        return [...this.items];
    }
    async create(schedule) {
        this.throwIfNeeded();
        await this.ensureInitialized();
        const now = new Date().toISOString();
        const item = {
            ...schedule,
            id: `sched-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            createdAt: now,
            updatedAt: now,
            triggerCount: 0,
        };
        this.items = [item, ...this.items];
        await this.persist();
        return item;
    }
    async update(schedule) {
        this.throwIfNeeded();
        await this.ensureInitialized();
        const updated = {
            ...schedule,
            updatedAt: new Date().toISOString(),
        };
        this.items = this.items.map((i) => (i.id === schedule.id ? updated : i));
        await this.persist();
        return updated;
    }
    async cancel(id) {
        this.throwIfNeeded();
        await this.ensureInitialized();
        const item = this.requireItem(id);
        const canceled = {
            ...item,
            status: 'canceled',
            updatedAt: new Date().toISOString(),
        };
        this.items = this.items.map((i) => (i.id === id ? canceled : i));
        await this.persist();
        return canceled;
    }
    async remove(id) {
        this.throwIfNeeded();
        await this.ensureInitialized();
        this.items = this.items.filter((i) => i.id !== id);
        await this.persist();
        return id;
    }
    async tick(now) {
        this.throwIfNeeded();
        await this.ensureInitialized();
        const triggered = [];
        const nowIso = new Date(now).toISOString();
        const nextItems = [];
        for (const item of this.items) {
            // Only process scheduled items that are due
            if (item.status !== 'scheduled' || new Date(item.nextRunAt).getTime() > now) {
                nextItems.push(item);
                continue;
            }
            // Item is due - trigger it
            const addRepeatTime = (runAt, repeat) => {
                const date = new Date(runAt);
                if (repeat === 'daily') {
                    date.setDate(date.getDate() + 1);
                }
                else if (repeat === 'weekly') {
                    date.setDate(date.getDate() + 7);
                }
                return date.toISOString();
            };
            const triggeredItem = {
                ...item,
                status: item.repeat === 'once' ? 'triggered' : 'scheduled',
                nextRunAt: item.repeat === 'once' ? item.nextRunAt : addRepeatTime(item.nextRunAt, item.repeat),
                triggerCount: item.triggerCount + 1,
                lastTriggeredAt: nowIso,
                updatedAt: nowIso,
            };
            triggered.push({
                schedule: triggeredItem,
                metadata: await this.createMetadata(triggeredItem),
            });
            nextItems.push(triggeredItem);
        }
        this.items = nextItems;
        // Persist changes only if something was triggered
        if (triggered.length > 0) {
            await this.persist();
        }
        return {
            items: [...this.items],
            triggered,
        };
    }
    async clear() {
        this.throwIfNeeded();
        await this.ensureInitialized();
        this.items = [];
        await this.persist();
    }
    failNext(error) {
        this.nextError = error;
    }
    throwIfNeeded() {
        if (this.nextError) {
            const error = this.nextError;
            this.nextError = null;
            throw error;
        }
    }
    requireItem(id) {
        const item = this.items.find((i) => i.id === id);
        if (!item)
            throw new Error(`Scheduled item not found: ${id}`);
        return item;
    }
    async createMetadata(schedule) {
        const triggerNumber = schedule.triggerCount + 1;
        const fallbackTitle = `Scheduled Download ${triggerNumber}`;
        try {
            const analyzed = await new nativeMetadataService_1.NativeMetadataService().analyze(schedule.sourceUrl);
            if (analyzed.linkType === 'playlist') {
                return analyzed.videos.map((video, index) => ({
                    ...video,
                    id: `scheduled-${schedule.id}-${triggerNumber}-${index + 1}`,
                }));
            }
            if (analyzed.linkType === 'video' || analyzed.linkType === 'shorts' || analyzed.linkType === 'playlist-video') {
                return [{
                        ...analyzed,
                        id: `scheduled-${schedule.id}-${triggerNumber}`,
                    }];
            }
        }
        catch {
            // Fall back to URL-based metadata when the yt-dlp lookup fails.
        }
        const title = (() => {
            try {
                const parsed = new URL(schedule.sourceUrl);
                const videoId = parsed.searchParams.get('v');
                if (videoId) {
                    return videoId;
                }
                const lastSegment = parsed.pathname.split('/').filter(Boolean).at(-1);
                if (lastSegment) {
                    return decodeURIComponent(lastSegment.replace(/[-_]/g, ' '));
                }
            }
            catch {
                // Ignore invalid URLs and fall back to the generic scheduled title.
            }
            return fallbackTitle;
        })();
        const thumbnail = (() => {
            try {
                const parsed = new URL(schedule.sourceUrl);
                const videoId = parsed.searchParams.get('v');
                if (videoId) {
                    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
                }
            }
            catch {
                // Ignore invalid URLs and fall back to the generic scheduled thumbnail.
            }
            return 'https://picsum.photos/seed/remon-scheduled/320/180';
        })();
        return [{
                id: `scheduled-${schedule.id}-${triggerNumber}`,
                sourceUrl: schedule.sourceUrl,
                linkType: 'video',
                thumbnail,
                title,
                channelName: 'Scheduled Queue',
                duration: '10:24',
                views: 128000,
                qualityOptions: ['2160p', '1440p', '1080p', '720p', '480p'],
                videoFormats: ['mp4', 'webm', 'mkv'],
                audioFormats: ['mp3', 'opus'],
                resolution: '1080p',
                fps: 60,
                videoCodec: 'H.264',
                audioCodec: 'AAC',
                videoBitrate: '7.8 Mbps',
                audioBitrate: '192 Kbps',
                container: 'mp4',
                fileSize: 220 * 1024 * 1024,
                uploadDate: '2026-08-01',
            }];
    }
}
exports.NativeSchedulerService = NativeSchedulerService;
//# sourceMappingURL=nativeSchedulerService.js.map