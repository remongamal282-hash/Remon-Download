import { create } from "zustand";

interface HistoryState {
  items: [];
}

export const useHistoryStore = create<HistoryState>(() => ({
  items: []
}));
