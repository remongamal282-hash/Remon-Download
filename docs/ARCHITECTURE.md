# Remon Download Architecture

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- React Router
- Zustand for global state only
- Service interfaces with mock implementations

## Data Flow

```text
React Components
      ↓
Zustand Stores
      ↓
Service Interfaces
      ↓
Mock Service Implementations
```

Components do not import mock services directly.

## Current Structure

```text
src/
├── components/
├── constants/
├── i18n/
├── layouts/
├── pages/
├── services/
├── stores/
├── test/
├── types/
└── utils/
```

## Stores

- `metadataStore`: manages current Dashboard analysis state.
- `queueStore`: session-only queue items, ordering, lifecycle controls, mock errors, concurrency slots, and simulation ticks.
- `settingsStore`: localStorage-backed settings and document language/theme application.
- `historyStore`: session-only History items, loading/error state, remove/clear behavior, Re-download back into Queue, and Open Folder prototype simulation.
- `favoritesStore`, `schedulerStore`: placeholders for upcoming features.
- `devToolsStore`: development-only state foundation.

## Services

- `MetadataService`: mock YouTube URL analysis.
- `DownloadService`: creates queue items, enforces state transitions through the state machine, applies retry/failure semantics, and computes mock download progress.
- `HistoryService`: mock session-only History data access through a service interface.
- `SettingsService`: reads, validates, repairs, updates, and resets localStorage settings.

## Download Queue

- State machine logic lives in `src/utils/stateMachine.ts`.
- Mock speed and ETA helpers live in `src/utils/downloadSimulation.ts`.
- `QueuePage` uses `@dnd-kit/core` and `@dnd-kit/sortable` for mouse and keyboard reordering.
- Queue lifecycle is driven by a UI interval calling `queueStore.tick()`.
- Speed limit and concurrent download values come from `settingsStore`.

## History

- `HistoryPage` reads from `historyStore`; it does not call services directly.
- `QueueHistoryBridge` records Queue items in History once they reach `completed`, `failed`, or `canceled`.
- History stores `HistoryItem` records, not duplicate live `DownloadItem` state.
- Re-download creates a new queued `DownloadItem` through `queueStore.addFromHistoryItem`.
- Open Folder is a prototype toast only, with no filesystem, shell, Electron, or native OS access.

## Electron Readiness

The UI talks to stores, and stores talk to service interfaces. Future Electron, filesystem, yt-dlp, FFmpeg, or SQLite integrations can replace service implementations without rewriting components.
