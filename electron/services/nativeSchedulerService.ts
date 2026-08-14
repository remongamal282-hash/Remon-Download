/**
 * NativeSchedulerService — Main Process scheduler boundary.
 *
 * Phase 2 Foundation: In-memory implementation. The IPC contract uses a full
 * ScheduledDownload object for create/update (unlike MockSchedulerService which
 * uses a SchedulerInput helper type). This service matches the IPC contract
 * directly.
 *
 * In Phase 2.x this will persist to a JSON file via Node.js fs.
 */
import type { ScheduledDownload } from "../../src/types/download";

export class NativeSchedulerService {
  private items: ScheduledDownload[] = [];

  async getAll(): Promise<ScheduledDownload[]> {
    return [...this.items];
  }

  async create(
    schedule: Omit<ScheduledDownload, "id" | "createdAt" | "updatedAt" | "triggerCount">
  ): Promise<ScheduledDownload> {
    const now = new Date().toISOString();
    const item: ScheduledDownload = {
      ...schedule,
      id: `sched-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
      triggerCount: 0
    };
    this.items = [item, ...this.items];
    return item;
  }

  async update(schedule: ScheduledDownload): Promise<ScheduledDownload> {
    const updated: ScheduledDownload = {
      ...schedule,
      updatedAt: new Date().toISOString()
    };
    this.items = this.items.map((i) => (i.id === schedule.id ? updated : i));
    return updated;
  }

  async cancel(id: string): Promise<ScheduledDownload> {
    const item = this.requireItem(id);
    const canceled: ScheduledDownload = {
      ...item,
      status: "canceled",
      updatedAt: new Date().toISOString()
    };
    this.items = this.items.map((i) => (i.id === id ? canceled : i));
    return canceled;
  }

  async remove(id: string): Promise<string> {
    this.items = this.items.filter((i) => i.id !== id);
    return id;
  }

  private requireItem(id: string): ScheduledDownload {
    const item = this.items.find((i) => i.id === id);
    if (!item) throw new Error(`Scheduled item not found: ${id}`);
    return item;
  }
}
