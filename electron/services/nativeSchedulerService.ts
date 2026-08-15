/**
 * NativeSchedulerService — Main Process scheduler boundary with persistent storage.
 *
 * Phase 3.1: Persistent storage using fs-based JSON files.
 * Scheduler is stored in %APPDATA%/remon-download/scheduler.json
 *
 * Uses the same pattern as NativeFavoritesService:
 * - initializationPromise guard (once-only, idempotent)
 * - isSchedulerFileFormat type guard
 * - normalizeScheduledDownload for safe deserialization
 * - ensureInitialized() in every public method
 * - persist() after create/update/cancel/remove
 */
import type { ScheduledDownload, ScheduleRepeat, ScheduledDownloadStatus } from '../../src/types/download';
import { readJsonFile, writeJsonFile } from '../utils/fileStorage';

interface SchedulerFileFormat {
  version: string;
  data: ScheduledDownload[];
}

function isSchedulerFileFormat(value: unknown): value is SchedulerFileFormat {
  return (
    !!value &&
    typeof value === 'object' &&
    'data' in value &&
    Array.isArray((value as { data?: unknown }).data)
  );
}

const VALID_REPEAT: ReadonlySet<string> = new Set<ScheduleRepeat>(['once', 'daily', 'weekly']);
const VALID_STATUS: ReadonlySet<string> = new Set<ScheduledDownloadStatus>([
  'scheduled', 'triggered', 'completed', 'failed', 'canceled',
]);

function normalizeScheduledDownload(item: Record<string, unknown> | null | undefined): ScheduledDownload | null {
  if (!item || typeof item !== 'object') return null;

  const id = item['id'] !== undefined ? String(item['id']) : null;
  if (!id) return null;

  const now = new Date().toISOString();

  const repeat = VALID_REPEAT.has(String(item['repeat'] ?? ''))
    ? (item['repeat'] as ScheduleRepeat)
    : 'once';

  const status = VALID_STATUS.has(String(item['status'] ?? ''))
    ? (item['status'] as ScheduledDownloadStatus)
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

export class NativeSchedulerService {
  private items: ScheduledDownload[] = [];
  private readonly SCHEDULER_FILE = 'scheduler.json';
  private readonly FILE_VERSION = '1.0.0';
  private initializationPromise: Promise<void> | null = null;

  /**
   * Initialize service by loading scheduler from disk.
   * Idempotent — multiple calls return the same promise.
   */
  async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      const fileData = await readJsonFile<unknown>(this.SCHEDULER_FILE, {
        version: this.FILE_VERSION,
        data: [],
      });

      if (isSchedulerFileFormat(fileData)) {
        this.items = fileData.data
          .map((item) => normalizeScheduledDownload(item as unknown as Record<string, unknown>))
          .filter((item): item is ScheduledDownload => item !== null);
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
  private async ensureInitialized(): Promise<void> {
    if (!this.initializationPromise) {
      await this.initialize();
    } else {
      await this.initializationPromise;
    }
  }

  /**
   * Persist current scheduler state to disk.
   */
  private async persist(): Promise<void> {
    await writeJsonFile<SchedulerFileFormat>(this.SCHEDULER_FILE, {
      version: this.FILE_VERSION,
      data: this.items,
    });
  }

  async getAll(): Promise<ScheduledDownload[]> {
    await this.ensureInitialized();
    return [...this.items];
  }

  async create(
    schedule: Omit<ScheduledDownload, 'id' | 'createdAt' | 'updatedAt' | 'triggerCount'>
  ): Promise<ScheduledDownload> {
    await this.ensureInitialized();

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
    await this.ensureInitialized();

    const updated: ScheduledDownload = {
      ...schedule,
      updatedAt: new Date().toISOString(),
    };
    this.items = this.items.map((i) => (i.id === schedule.id ? updated : i));
    await this.persist();
    return updated;
  }

  async cancel(id: string): Promise<ScheduledDownload> {
    await this.ensureInitialized();

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
    await this.ensureInitialized();

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
