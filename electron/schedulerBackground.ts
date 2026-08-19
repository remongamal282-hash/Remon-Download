import type { DownloadItem, ScheduledDownload, VideoMetadata } from "../src/types/download";
import { NativeDownloadService } from "./services/nativeDownloadService";
import { NativeSchedulerService } from "./services/nativeSchedulerService";

export interface SchedulerBackgroundLoopOptions {
  schedulerService?: NativeSchedulerService;
  getDownloadService?: () => NativeDownloadService | null;
  pollMs?: number;
  logger?: Pick<Console, "log" | "warn" | "error">;
}

export class SchedulerBackgroundLoop {
  private readonly schedulerService: NativeSchedulerService;
  private readonly getDownloadService: () => NativeDownloadService | null;
  private readonly pollMs: number;
  private readonly logger: Pick<Console, "log" | "warn" | "error">;
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private tickInFlight = false;
  private activeExecutionIds = new Set<string>();
  private lastTriggeredBySchedule = new Map<string, number>();

  constructor(options: SchedulerBackgroundLoopOptions = {}) {
    this.schedulerService = options.schedulerService ?? new NativeSchedulerService();
    this.getDownloadService = options.getDownloadService ?? (() => null);
    this.pollMs = options.pollMs ?? 1000;
    this.logger = options.logger ?? console;
  }

  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.lastTriggeredBySchedule.clear();
    this.logger.log("[Main] scheduler started");

    this.timer = setInterval(() => {
      void this.tickOnce(Date.now());
    }, this.pollMs);

    void this.tickOnce(Date.now());
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.running = false;
    this.activeExecutionIds.clear();
    this.lastTriggeredBySchedule.clear();
    this.logger.log("[Main] scheduler stopped");
  }

  isRunning(): boolean {
    return this.running;
  }

  hasActiveTimer(): boolean {
    return this.timer !== null;
  }

  async tickOnce(now: number): Promise<number> {
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
        } catch (error) {
          this.logger.error(`[Main] scheduled download failed: ${scheduleId}`, error);
        } finally {
          this.activeExecutionIds.delete(scheduleId);
        }
      }

      return startedCount;
    } catch (error) {
      this.logger.error("[Main] scheduler tick failed", error);
      return 0;
    } finally {
      this.tickInFlight = false;
    }
  }

  private async executeTriggeredTask(schedule: ScheduledDownload, metadata: VideoMetadata): Promise<void> {
    const downloadService = this.getDownloadService();
    if (!downloadService) {
      this.logger.warn(`[Main] scheduler task skipped because download service is unavailable: ${schedule.id}`);
      return;
    }

    const itemId = `${schedule.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const item: DownloadItem = {
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
    await downloadService.start(item.id);

    this.logger.log(`[Main] scheduled task completed: ${schedule.id}`);
  }
}
