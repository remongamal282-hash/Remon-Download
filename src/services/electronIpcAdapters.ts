/**
 * Electron IPC Adapters — Renderer-side implementations of the Service Interfaces.
 *
 * These adapters call window.electronAPI (exposed by preload.ts via contextBridge)
 * and satisfy the same interfaces as the Mock Services so they are drop-in
 * replacements when running inside Electron.
 *
 * NEVER import Electron or Node.js modules here. This file runs in the Renderer
 * process and has NO access to Node.js APIs. All communication goes through the
 * typed window.electronAPI surface.
 */

import type { AnalysisResult, DownloadItem, FavoriteItem, HistoryItem, ScheduledDownload } from "../types/download";
import type { AppSettings } from "../types/settings";
import type { ErrorModel } from "../types/errors";
import type { MetadataService } from "./metadataService";
import type { HistoryService } from "./historyService";
import type { FavoritesService } from "./favoritesService";
import type { SettingsService } from "./settingsService";
import type { SchedulerService, SchedulerInput, SchedulerTickResult } from "./schedulerService";

// ─── Helpers ───────────────────────────────────────────────────────────────

function ipcError(message: string): ErrorModel {
  return { code: "unknown", message, recoverable: true };
}

// ─── MetadataService Adapter ────────────────────────────────────────────────

export class ElectronMetadataService implements MetadataService {
  async analyze(url: string): Promise<AnalysisResult> {
    return window.electronAPI!.metadata.analyze(url);
  }
}

// ─── HistoryService Adapter ─────────────────────────────────────────────────

export class ElectronHistoryService implements HistoryService {
  async getAll(): Promise<HistoryItem[]> {
    return window.electronAPI!.history.getAll();
  }

  async add(item: HistoryItem): Promise<HistoryItem> {
    return window.electronAPI!.history.add(item);
  }

  async addFromDownload(item: DownloadItem, now: string): Promise<HistoryItem> {
    const historyItem: HistoryItem = {
      id: `history-${item.id}`,
      sourceDownloadId: item.id,
      metadataId: item.metadataId,
      thumbnail: item.thumbnail,
      title: item.title,
      sourceUrl: item.sourceUrl,
      date: now,
      quality: item.quality,
      format: item.format,
      fileSize: item.fileSize,
      status: item.status === "completed" ? "completed" : item.status === "failed" ? "failed" : "canceled",
      errorCode: item.errorCode,
      errorMessage: item.errorMessage
    };
    return this.add(historyItem);
  }

  async remove(id: string): Promise<void> {
    await window.electronAPI!.history.remove(id);
  }

  async clear(): Promise<void> {
    await window.electronAPI!.history.clear();
  }

  // No-op in production; only meaningful for test injection in Mock services
  failNext(_error: ErrorModel): void {
    console.warn("[ElectronHistoryService] failNext() is not supported in Electron mode.");
  }
}

// ─── FavoritesService Adapter ────────────────────────────────────────────────

export class ElectronFavoritesService implements FavoritesService {
  async getAll(): Promise<FavoriteItem[]> {
    return window.electronAPI!.favorites.getAll();
  }

  async add(item: FavoriteItem): Promise<FavoriteItem> {
    return window.electronAPI!.favorites.add(item);
  }

  async remove(id: string): Promise<void> {
    await window.electronAPI!.favorites.remove(id);
  }

  async isFavorite(sourceUrl: string): Promise<boolean> {
    const items = await this.getAll();
    return items.some((item) => item.sourceUrl === sourceUrl);
  }

  async clear(): Promise<void> {
    const items = await this.getAll();
    await Promise.all(items.map((item) => this.remove(item.id)));
  }

  failNext(_error: ErrorModel): void {
    console.warn("[ElectronFavoritesService] failNext() is not supported in Electron mode.");
  }
}

// ─── SettingsService Adapter ─────────────────────────────────────────────────

export class ElectronSettingsService implements SettingsService {
  get(): AppSettings {
    // SettingsService.get() is sync in the interface (used by LocalStorage implementation).
    // The Electron adapter must bridge to async IPC. We cache the last known value and
    // trigger an async refresh, returning the cached value synchronously.
    // This is a known architectural trade-off documented in AI_HANDOFF.md.
    throw new Error(
      "[ElectronSettingsService] Synchronous get() is not supported over IPC. " +
      "Use getAsync() or ensure the store initializes with an async load."
    );
  }

  async getAsync(): Promise<AppSettings> {
    return window.electronAPI!.settings.get();
  }

  update(settings: Partial<AppSettings>): AppSettings {
    // Same sync/async mismatch — the interface is sync but IPC is async.
    // Return stale value and schedule async update.
    void window.electronAPI!.settings.update(settings);
    throw new Error(
      "[ElectronSettingsService] Synchronous update() is not supported over IPC. " +
      "Use updateAsync()."
    );
  }

  async updateAsync(settings: Partial<AppSettings>): Promise<AppSettings> {
    return window.electronAPI!.settings.update(settings);
  }

  reset(): AppSettings {
    void window.electronAPI!.settings.reset();
    throw new Error(
      "[ElectronSettingsService] Synchronous reset() is not supported over IPC. " +
      "Use resetAsync()."
    );
  }

  async resetAsync(): Promise<AppSettings> {
    return window.electronAPI!.settings.reset();
  }
}

// ─── SchedulerService Adapter ─────────────────────────────────────────────────

export class ElectronSchedulerService implements SchedulerService {
  async getAll(): Promise<ScheduledDownload[]> {
    return window.electronAPI!.scheduler.getAll();
  }

  async create(input: SchedulerInput): Promise<ScheduledDownload> {
    const schedule = {
      sourceUrl: input.sourceUrl,
      date: input.date,
      time: input.time,
      repeat: input.repeat,
      status: "scheduled" as const,
      nextRunAt: new Date(`${input.date}T${input.time}:00`).toISOString()
    };
    return window.electronAPI!.scheduler.create(schedule);
  }

  async update(id: string, input: SchedulerInput): Promise<ScheduledDownload> {
    // The IPC contract takes the full ScheduledDownload; we need to merge.
    const existing = await this.getAll();
    const item = existing.find((s) => s.id === id);
    if (!item) {
      throw ipcError(`Scheduled item not found: ${id}`);
    }
    const updated: ScheduledDownload = {
      ...item,
      sourceUrl: input.sourceUrl,
      date: input.date,
      time: input.time,
      repeat: input.repeat,
      status: "scheduled",
      nextRunAt: new Date(`${input.date}T${input.time}:00`).toISOString(),
      updatedAt: new Date().toISOString()
    };
    return window.electronAPI!.scheduler.update(updated);
  }

  async cancel(id: string): Promise<ScheduledDownload> {
    return window.electronAPI!.scheduler.cancel(id);
  }

  async remove(id: string): Promise<void> {
    await window.electronAPI!.scheduler.remove(id);
  }

  async tick(_now: number): Promise<SchedulerTickResult> {
    // Tick logic is handled in the Native Main Process for Electron.
    // The renderer should not poll for ticks; instead listen to push events (Phase 2.x).
    const items = await this.getAll();
    return { items, triggered: [] };
  }

  async clear(): Promise<void> {
    const items = await this.getAll();
    await Promise.all(items.map((item) => this.remove(item.id)));
  }

  failNext(_error: ErrorModel): void {
    console.warn("[ElectronSchedulerService] failNext() is not supported in Electron mode.");
  }
}
