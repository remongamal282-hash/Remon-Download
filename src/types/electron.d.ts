/**
 * Global type augmentation for the Renderer process.
 *
 * Declares the shape of window.electronAPI that preload.ts injects via
 * contextBridge.exposeInMainWorld('electronAPI', ...) when running in Electron.
 *
 * In Web/Vitest mode, window.electronAPI is undefined.
 * The serviceResolver.ts checks for this at runtime to pick the right implementation.
 */

import type { AnalysisResult, DownloadItem, FavoriteItem, HistoryItem, ScheduledDownload } from "./download";
import type { AppSettings } from "./settings";
import type { AppErrorCode } from "./errors";

/**
 * Download progress event payload
 */
export interface DownloadProgressPayload {
  id: string;
  progress: number;
  downloadedSize: number;
  totalSize: number;
  speed: number;
  eta: string;
}

/**
 * Download state change event payload
 */
export interface DownloadStateChangePayload {
  id: string;
  status: import("./download").DownloadStatus;
  errorCode?: AppErrorCode;
  errorMessage?: string;
}

export interface ElectronAPI {
  readonly isElectron: true;

  metadata: {
    analyze(url: string): Promise<AnalysisResult>;
  };

  download: {
    getAll(): Promise<DownloadItem[]>;
    add(item: DownloadItem): Promise<DownloadItem>;
    start(id: string): Promise<DownloadItem>;
    pause(id: string): Promise<DownloadItem>;
    resume(id: string): Promise<DownloadItem>;
    cancel(id: string): Promise<DownloadItem>;
    retry(id: string): Promise<DownloadItem>;
    remove(id: string): Promise<string>;
    reorder(orderedIds: string[]): Promise<DownloadItem[]>;

    // Event listeners
    onProgress(callback: (data: DownloadProgressPayload) => void): () => void;
    onStateChange(callback: (data: DownloadStateChangePayload) => void): () => void;
  };

  settings: {
    get(): Promise<AppSettings>;
    update(settings: Partial<AppSettings>): Promise<AppSettings>;
    reset(): Promise<AppSettings>;
  };

  history: {
    getAll(): Promise<HistoryItem[]>;
    add(item: HistoryItem): Promise<HistoryItem>;
    remove(id: string): Promise<string>;
    clear(): Promise<void>;
  };

  favorites: {
    getAll(): Promise<FavoriteItem[]>;
    add(item: FavoriteItem): Promise<FavoriteItem>;
    remove(id: string): Promise<string>;
  };

  scheduler: {
    getAll(): Promise<ScheduledDownload[]>;
    create(
      schedule: Omit<ScheduledDownload, "id" | "createdAt" | "updatedAt" | "triggerCount">
    ): Promise<ScheduledDownload>;
    update(schedule: ScheduledDownload): Promise<ScheduledDownload>;
    cancel(id: string): Promise<ScheduledDownload>;
    remove(id: string): Promise<string>;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export { };
