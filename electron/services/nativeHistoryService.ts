/**
 * NativeHistoryService — Main Process history boundary.
 *
 * Phase 2 Foundation: In-memory implementation. The IPC handlers delegate here.
 *
 * Note: MockHistoryService.remove() returns Promise<void> but the IPC contract
 * expects string (the removed id). The NativeHistoryService interface matches
 * the IPC contract (returns id string from remove).
 */
import type { HistoryItem } from "../../src/types/download";

export class NativeHistoryService {
  private items: HistoryItem[] = [];

  async getAll(): Promise<HistoryItem[]> {
    return [...this.items];
  }

  async add(item: HistoryItem): Promise<HistoryItem> {
    this.items = [item, ...this.items.filter((i) => i.id !== item.id)];
    return item;
  }

  async remove(id: string): Promise<string> {
    this.items = this.items.filter((i) => i.id !== id);
    return id;
  }

  async clear(): Promise<void> {
    this.items = [];
  }
}
