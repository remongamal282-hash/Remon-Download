import { create } from "zustand";

interface SchedulerState {
  items: [];
}

export const useSchedulerStore = create<SchedulerState>(() => ({
  items: []
}));
