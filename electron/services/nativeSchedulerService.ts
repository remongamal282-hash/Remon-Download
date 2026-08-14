/**
 * NativeSchedulerService — Main Process scheduler boundary with persistent storage.
 *
 * Phase 3.1: Persistent storage using fs-based JSON files.
 * Scheduler is stored in %APPDATA%/remon-download/scheduler.json
 *
 * The IPC contract uses a full ScheduledDownload object for create/update (unlike
 * MockSchedulerService which uses a SchedulerInput helper type). This service
 * matches the IPC contract directly.
 */
import type { ScheduledDownload } from '../../src/types/download';
import { readJsonFile, writeJsonFile } from '../utils/fileStorage';

interface SchedulerFileFormat {
  version: string;
  data: ScheduledDownload[];
}

export class NativeSchedulerService {
  private items: ScheduledDownload[] = [];
  private readonly SCHEDULER_FILE = 'scheduler.json';
  private readonly FILE_VERSION = '1.0.0';

  /**
   * Initialize service by loading scheduler from disk
   * Must be called after construction
   */
  async initialize(): Promise<void> {
    const fileData = await readJsonFile<SchedulerFileFormat>(
      this.SCHEDULER_FILE,
      {
        version: this.FILE_VERSION,
        data: [],
      }
    );

    this.items = fileData.data;
  }

  /**
   * Persist current scheduler to disk
   */
  private async persist(): Promise<void> {
    await writeJsonFile<SchedulerFileFormat>(this.SCHEDULER_FILE, {
      version: this.FILE_VERSION,
      data: this.items,
    });
  }

  async getAll(): Promise<ScheduledDownload[]> {
    return [...this.items];
  }

  async create(
    schedule: Omit<
      ScheduledDownload,
      'id' | 'createdAt' | 'updatedAt' | 'triggerCount'
    >
  ): Promise<ScheduledDownload> {
    const now = new Date().toISOString();
    const item: ScheduledDownload = {
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

  async update(schedule: ScheduledDownload): Promise<ScheduledDownload> {
    const updated: ScheduledDownload = {
      ...schedule,
      updatedAt: new Date().toISOString(),
    };
    this.items = this.items.map((i) => (i.id === schedule.id ? updated : i));
    await this.persist();
    return updated;
  }

  async cancel(id: string): Promise<ScheduledDownload> {
    const item = this.requireItem(id);
    const canceled: ScheduledDownload = {
      ...item,
      status: 'canceled',
      updatedAt: new Date().toISOString(),
    };
    this.items = this.items.map((i) => (i.id === id ? canceled : i));
    await this.persist();
    return canceled;
  }

  async remove(id: string): Promise<string> {
    this.items = this.items.filter((i) => i.id !== id);
    await this.persist();
    return id;
  }

  private requireItem(id: string): ScheduledDownload {
    const item = this.items.find((i) => i.id === id);
    if (!item) throw new Error(`Scheduled item not found: ${id}`);
    return item;
  }
}
