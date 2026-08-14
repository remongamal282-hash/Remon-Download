import { create } from "zustand";

type MockScenario =
  | "success"
  | "network_error"
  | "video_unavailable"
  | "disk_full"
  | "permission_denied"
  | "ytdlp_error"
  | "ffmpeg_error";

interface DevToolsState {
  mockScenario: MockScenario;
  simulationSpeed: number;
  isPanelOpen: boolean;
  setMockScenario: (scenario: MockScenario) => void;
  setSimulationSpeed: (speed: number) => void;
  togglePanel: () => void;
}

export const useDevToolsStore = create<DevToolsState>((set) => ({
  mockScenario: "success",
  simulationSpeed: 1,
  isPanelOpen: false,
  setMockScenario: (mockScenario) => set({ mockScenario }),
  setSimulationSpeed: (simulationSpeed) => set({ simulationSpeed }),
  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen }))
}));
