import { ipcMain } from "electron";
import { IPC_CHANNELS, type IpcResult } from "./channels";
import { NativeMetadataService } from "../services/nativeMetadataService";
import { NativeDownloadService } from "../services/nativeDownloadService";
import { NativeSettingsService } from "../services/nativeSettingsService";
import { NativeHistoryService } from "../services/nativeHistoryService";
import { NativeFavoritesService } from "../services/nativeFavoritesService";
import { NativeSchedulerService } from "../services/nativeSchedulerService";
import type { ErrorModel } from "../../src/types/errors";

function wrapSuccess<T>(data: T): IpcResult<T> {
  return { success: true, data };
}

function wrapError<T>(err: unknown): IpcResult<T> {
  const message = err instanceof Error ? err.message : String(err);
  const errorModel: ErrorModel = {
    code: "unknown",
    message,
    recoverable: true
  };
  return { success: false, error: errorModel };
}

export function registerIpcHandlers(): void {
  const metadataService = new NativeMetadataService();
  const downloadService = new NativeDownloadService();
  const settingsService = new NativeSettingsService();
  const historyService = new NativeHistoryService();
  const favoritesService = new NativeFavoritesService();
  const schedulerService = new NativeSchedulerService();

  // Metadata
  ipcMain.handle(IPC_CHANNELS.METADATA_ANALYZE, async (_, { url }) => {
    try {
      const data = await metadataService.analyze(url);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });

  // Download
  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_GET_ALL, async () => {
    try {
      const data = await downloadService.getAll();
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_ADD, async (_, { item }) => {
    try {
      const data = await downloadService.add(item);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_START, async (_, { id }) => {
    try {
      const data = await downloadService.start(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_PAUSE, async (_, { id }) => {
    try {
      const data = await downloadService.pause(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_RESUME, async (_, { id }) => {
    try {
      const data = await downloadService.resume(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_CANCEL, async (_, { id }) => {
    try {
      const data = await downloadService.cancel(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_RETRY, async (_, { id }) => {
    try {
      const data = await downloadService.retry(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_REMOVE, async (_, { id }) => {
    try {
      const data = await downloadService.remove(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_REORDER, async (_, { orderedIds }) => {
    try {
      const data = await downloadService.reorder(orderedIds);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });

  // Settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    try {
      const data = await settingsService.get();
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, async (_, { settings }) => {
    try {
      const data = await settingsService.update(settings);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_RESET, async () => {
    try {
      const data = await settingsService.reset();
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });

  // History
  ipcMain.handle(IPC_CHANNELS.HISTORY_GET_ALL, async () => {
    try {
      const data = await historyService.getAll();
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY_ADD, async (_, { item }) => {
    try {
      const data = await historyService.add(item);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY_REMOVE, async (_, { id }) => {
    try {
      const data = await historyService.remove(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY_CLEAR, async () => {
    try {
      await historyService.clear();
      return wrapSuccess(undefined);
    } catch (err) {
      return wrapError(err);
    }
  });

  // Favorites
  ipcMain.handle(IPC_CHANNELS.FAVORITES_GET_ALL, async () => {
    try {
      const data = await favoritesService.getAll();
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.FAVORITES_ADD, async (_, { item }) => {
    try {
      const data = await favoritesService.add(item);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.FAVORITES_REMOVE, async (_, { id }) => {
    try {
      const data = await favoritesService.remove(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });

  // Scheduler
  ipcMain.handle(IPC_CHANNELS.SCHEDULER_GET_ALL, async () => {
    try {
      const data = await schedulerService.getAll();
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SCHEDULER_CREATE, async (_, { schedule }) => {
    try {
      const data = await schedulerService.create(schedule);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SCHEDULER_UPDATE, async (_, { schedule }) => {
    try {
      const data = await schedulerService.update(schedule);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SCHEDULER_CANCEL, async (_, { id }) => {
    try {
      const data = await schedulerService.cancel(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SCHEDULER_REMOVE, async (_, { id }) => {
    try {
      const data = await schedulerService.remove(id);
      return wrapSuccess(data);
    } catch (err) {
      return wrapError(err);
    }
  });
}
