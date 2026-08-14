import { create } from "zustand";
import { schedulerService, type SchedulerInput } from "../services/schedulerService";
import type { ScheduledDownload } from "../types/download";
import type { ErrorModel } from "../types/errors";
import { useQueueStore } from "./queueStore";
import { useSettingsStore } from "./settingsStore";

interface SchedulerState {
  items: ScheduledDownload[];
  isLoading: boolean;
  error: ErrorModel | null;
  lastTriggeredId: string | null;
  load: () => Promise<void>;
  create: (input: SchedulerInput) => Promise<ScheduledDownload | null>;
  update: (id: string, input: SchedulerInput) => Promise<ScheduledDownload | null>;
  cancel: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  tick: (now?: number) => Promise<number>;
  failNext: (error: ErrorModel) => void;
  clearError: () => void;
  resetForTests: () => Promise<void>;
}

function toErrorModel(error: unknown): ErrorModel {
  if (typeof error === "object" && error !== null && "code" in error && "message" in error) {
    return error as ErrorModel;
  }

  return {
    code: "unknown",
    message: "errors.unknown",
    recoverable: true
  };
}

export const useSchedulerStore = create<SchedulerState>((set) => ({
  items: [],
  isLoading: false,
  error: null,
  lastTriggeredId: null,
  load: async () => {
    set({ isLoading: true, error: null });

    try {
      const items = await schedulerService.getAll();
      set({ items, isLoading: false });
    } catch (error) {
      set({ error: toErrorModel(error), isLoading: false });
    }
  },
  create: async (input) => {
    try {
      const item = await schedulerService.create(input);
      set((state) => ({ items: [item, ...state.items], error: null }));
      return item;
    } catch (error) {
      set({ error: toErrorModel(error) });
      return null;
    }
  },
  update: async (id, input) => {
    try {
      const item = await schedulerService.update(id, input);
      set((state) => ({
        items: state.items.map((existingItem) => (existingItem.id === id ? item : existingItem)),
        error: null
      }));
      return item;
    } catch (error) {
      set({ error: toErrorModel(error) });
      return null;
    }
  },
  cancel: async (id) => {
    try {
      const item = await schedulerService.cancel(id);
      set((state) => ({
        items: state.items.map((existingItem) => (existingItem.id === id ? item : existingItem)),
        error: null
      }));
    } catch (error) {
      set({ error: toErrorModel(error) });
    }
  },
  remove: async (id) => {
    try {
      await schedulerService.remove(id);
      set((state) => ({ items: state.items.filter((item) => item.id !== id), error: null }));
    } catch (error) {
      set({ error: toErrorModel(error) });
    }
  },
  tick: async (now = Date.now()) => {
    try {
      const result = await schedulerService.tick(now);
      const settings = useSettingsStore.getState().settings;

      result.triggered.forEach((triggered) => {
        useQueueStore.getState().addFromMetadata(
          triggered.metadata,
          settings.defaultQuality,
          settings.defaultVideoFormat
        );
      });

      set({
        items: result.items,
        error: null,
        lastTriggeredId: result.triggered.length > 0
          ? result.triggered[result.triggered.length - 1]?.schedule.id ?? null
          : null
      });
      return result.triggered.length;
    } catch (error) {
      set({ error: toErrorModel(error) });
      return 0;
    }
  },
  failNext: (error) => schedulerService.failNext(error),
  clearError: () => set({ error: null, lastTriggeredId: null }),
  resetForTests: async () => {
    await schedulerService.clear();
    set({ items: [], isLoading: false, error: null, lastTriggeredId: null });
  }
}));
