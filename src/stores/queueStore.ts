import { create } from "zustand";
import { downloadService } from "../services/downloadService";
import type { DownloadItem, VideoMetadata } from "../types/download";

interface QueueState {
  items: DownloadItem[];
  addFromMetadata: (metadata: VideoMetadata, quality: string, format: string) => DownloadItem;
  addManyFromMetadata: (metadata: VideoMetadata[], quality: string, format: string) => DownloadItem[];
  remove: (id: string) => void;
  clear: () => void;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  items: [],
  addFromMetadata: (metadata, quality, format) => {
    const order = get().items.length + 1;
    const item = downloadService.createFromMetadata(metadata, order, quality, format);
    set((state) => ({ items: [...state.items, item] }));
    return item;
  },
  addManyFromMetadata: (metadata, quality, format) => {
    const startOrder = get().items.length + 1;
    const items = metadata.map((video, index) =>
      downloadService.createFromMetadata(video, startOrder + index, quality, format)
    );
    set((state) => ({ items: [...state.items, ...items] }));
    return items;
  },
  remove: (id) => {
    set((state) => ({
      items: state.items
        .filter((item) => item.id !== id)
        .map((item, index) => ({ ...item, order: index + 1 }))
    }));
  },
  clear: () => set({ items: [] })
}));
