/**
 * NativeDownloadService — Main Process download queue boundary.
 *
 * Phase 2 Foundation: In-memory implementation that maintains the download
 * queue state in the Main Process. The IPC handlers delegate to this service.
 *
 * In Phase 2.x this will be replaced by the real yt-dlp download engine.
 * The interface is intentionally async throughout for I/O readiness.
 */
import type { DownloadItem } from "../../src/types/download";

export class NativeDownloadService {
  private items: Map<string, DownloadItem> = new Map();

  async getAll(): Promise<DownloadItem[]> {
    return Array.from(this.items.values());
  }

  async add(item: DownloadItem): Promise<DownloadItem> {
    this.items.set(item.id, item);
    return item;
  }

  async start(id: string): Promise<DownloadItem> {
    return this.requireItem(id);
  }

  async pause(id: string): Promise<DownloadItem> {
    return this.requireItem(id);
  }

  async resume(id: string): Promise<DownloadItem> {
    return this.requireItem(id);
  }

  async cancel(id: string): Promise<DownloadItem> {
    return this.requireItem(id);
  }

  async retry(id: string): Promise<DownloadItem> {
    return this.requireItem(id);
  }

  async remove(id: string): Promise<string> {
    this.items.delete(id);
    return id;
  }

  async reorder(orderedIds: string[]): Promise<DownloadItem[]> {
    const result: DownloadItem[] = [];
    for (const id of orderedIds) {
      const item = this.items.get(id);
      if (item) result.push(item);
    }
    return result;
  }

  private requireItem(id: string): DownloadItem {
    const item = this.items.get(id);
    if (!item) throw new Error(`Download item not found: ${id}`);
    return item;
  }
}
