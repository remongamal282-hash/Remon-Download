/**
 * NativeHistoryService — Main Process history boundary with persistent storage.
 *
 * Phase 3.1: Persistent storage using fs-based JSON files.
 * History is stored in %APPDATA%/remon-download/history.json
 *
 * Note: MockHistoryService.remove() returns Promise<void> but the IPC contract
 * expects string (the removed id). The NativeHistoryService interface matches
 * the IPC contract (returns id string from remove).
 */
import type { HistoryItem } from '../../src/types/download';
import { readJsonFile, writeJsonFile } from '../utils/fileStorage';

interface HistoryFileFormat {
  version: string;
  data: HistoryItem[];
}

export class NativeHistoryService {
  private items: HistoryItem[] = [];
  private readonly HISTORY_FILE = 'history.json';
  private readonly FILE_VERSION = '1.0.0';
  private initializationPromise: Promise<void> | null = null;

  /**
   * Initialize service by loading history from disk
   * Must be called after construction
   */
  async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      const fileData = await readJsonFile<HistoryFileFormat>(this.HISTORY_FILE, {
        version: this.FILE_VERSION,
        data: [],
      });

      // Convert date strings back to Date objects
      this.items = fileData.data.map((item) => ({
        ...item,
        downloadedAt: new Date(item.downloadedAt),
      }));
    })();

    return this.initializationPromise;
  }

  /**
   * Ensure service is initialized before proceeding
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initializationPromise) {
      await this.initialize();
    } else {
      await this.initializationPromise;
    }
  }

  /**
   * Persist current history to disk
   */
  private async persist(): Promise<void> {
    await writeJsonFile<HistoryFileFormat>(this.HISTORY_FILE, {
      version: this.FILE_VERSION,
      data: this.items,
    });
  }

  async getAll(): Promise<HistoryItem[]> {
    await this.ensureInitialized();
    return [...this.items];
  }

  async add(item: HistoryItem): Promise<HistoryItem> {
    this.items = [item, ...this.items.filter((i) => i.id !== item.id)];
    await this.persist();
    return item;
  }

  async remove(id: string): Promise<string> {
    this.items = this.items.filter((i) => i.id !== id);
    await this.persist();
    return id;
  }

  async clear(): Promise<void> {
    this.items = [];
    await this.persist();
  }
}
