"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerBackgroundLoop = void 0;
const nativeSchedulerService_1 = require("./services/nativeSchedulerService");
class SchedulerBackgroundLoop {
    constructor(options = {}) {
        this.timer = null;
        this.running = false;
        this.tickInFlight = false;
        this.activeExecutionIds = new Set();
        this.lastTriggeredBySchedule = new Map();
        this.scheduledDownloadIds = new Map();
        this.downloadListenerAttached = false;
        this.schedulerService = options.schedulerService ?? new nativeSchedulerService_1.NativeSchedulerService();
        this.getDownloadService = options.getDownloadService ?? (() => null);
        this.getNotificationService = options.getNotificationService ?? (() => null);
        this.pollMs = options.pollMs ?? 1000;
        this.logger = options.logger ?? console;
    }
    start() {
        if (this.running) {
            return;
        }
        this.running = true;
        this.lastTriggeredBySchedule.clear();
        this.scheduledDownloadIds.clear();
        this.logger.log("[Main] scheduler started");
        this.timer = setInterval(() => {
            void this.tickOnce(Date.now());
        }, this.pollMs);
        void this.tickOnce(Date.now());
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.running = false;
        this.activeExecutionIds.clear();
        this.lastTriggeredBySchedule.clear();
        this.scheduledDownloadIds.clear();
        this.logger.log("[Main] scheduler stopped");
    }
    isRunning() {
        return this.running;
    }
    hasActiveTimer() {
        return this.timer !== null;
    }
    async tickOnce(now) {
        if (this.tickInFlight) {
            this.logger.log("[Main] tick skipped: scheduler already running");
            return 0;
        }
        this.tickInFlight = true;
        try {
            this.logger.log(`[Main] scheduler tick ${new Date(now).toISOString()}`);
            const result = await this.schedulerService.tick(now);
            if (result.triggered.length === 0) {
                return 0;
            }
            this.logger.log(`[Main] scheduled task detected: ${result.triggered.length} due task(s)`);
            let startedCount = 0;
            for (const triggered of result.triggered) {
                const scheduleId = triggered.schedule.id;
                const triggerKey = triggered.schedule.triggerCount;
                if (this.activeExecutionIds.has(scheduleId) || this.lastTriggeredBySchedule.get(scheduleId) === triggerKey) {
                    this.logger.warn(`[Main] duplicate scheduled task detected and skipped: ${scheduleId}`);
                    continue;
                }
                this.activeExecutionIds.add(scheduleId);
                this.lastTriggeredBySchedule.set(scheduleId, triggerKey);
                try {
                    await this.executeTriggeredTask(triggered.schedule, triggered.metadata);
                    startedCount += 1;
                }
                catch (error) {
                    this.logger.error(`[Main] scheduled download failed: ${scheduleId}`, error);
                }
                finally {
                    this.activeExecutionIds.delete(scheduleId);
                }
            }
            return startedCount;
        }
        catch (error) {
            this.logger.error("[Main] scheduler tick failed", error);
            return 0;
        }
        finally {
            this.tickInFlight = false;
        }
    }
    async executeTriggeredTask(schedule, metadata) {
        const downloadService = this.getDownloadService();
        if (!downloadService) {
            this.logger.warn(`[Main] scheduler task skipped because download service is unavailable: ${schedule.id}`);
            return;
        }
        this.attachDownloadListener(downloadService);
        const itemId = `${schedule.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const item = {
            id: itemId,
            metadataId: metadata.id,
            thumbnail: metadata.thumbnail,
            title: metadata.title,
            sourceUrl: metadata.sourceUrl,
            quality: "auto",
            format: "mp4",
            fileSize: metadata.fileSize,
            downloadedSize: 0,
            speed: 0,
            eta: "--",
            progress: 0,
            status: "queued",
            order: 0,
            addedAt: new Date().toISOString(),
            phaseStartedAt: Date.now(),
            lastUpdatedAt: Date.now(),
            retryCount: 0,
        };
        this.logger.log(`[Main] scheduled download started: ${item.id} for ${schedule.id}`);
        await downloadService.add(item);
        this.scheduledDownloadIds.set(item.id, { schedule, item });
        this.getNotificationService()?.notifyScheduledDownload(schedule, metadata);
        await downloadService.start(item.id);
        this.logger.log(`[Main] scheduled task completed: ${schedule.id}`);
    }
    attachDownloadListener(downloadService) {
        if (this.downloadListenerAttached || typeof downloadService.on !== "function") {
            return;
        }
        downloadService.on("download:state-change", (payload) => {
            const trackedDownload = this.scheduledDownloadIds.get(payload.id);
            if (!trackedDownload || !["completed", "failed"].includes(payload.status)) {
                return;
            }
            this.scheduledDownloadIds.delete(payload.id);
            const updatedItem = {
                ...trackedDownload.item,
                status: payload.status,
                progress: payload.progress,
                downloadedSize: payload.downloadedSize,
                errorCode: payload.errorCode,
                errorMessage: payload.errorMessage,
                lastUpdatedAt: Date.now()
            };
            this.getNotificationService()?.handleDownloadStateChange(payload, updatedItem);
            void this.schedulerService.update({
                ...trackedDownload.schedule,
                status: payload.status === "completed" ? "completed" : "failed",
                errorMessage: payload.errorMessage,
                updatedAt: new Date().toISOString()
            });
        });
        this.downloadListenerAttached = true;
    }
}
exports.SchedulerBackgroundLoop = SchedulerBackgroundLoop;
//# sourceMappingURL=schedulerBackground.js.map