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
- `queueStore`: session-only queue items.
- `settingsStore`: localStorage-backed settings and document language/theme application.
- `historyStore`, `favoritesStore`, `schedulerStore`: placeholders for upcoming features.
- `devToolsStore`: development-only state foundation.

## Services

- `MetadataService`: mock YouTube URL analysis.
- `DownloadService`: creates session-only queue items from metadata.
- `SettingsService`: reads, validates, repairs, updates, and resets localStorage settings.

## Electron Readiness

The UI talks to stores, and stores talk to service interfaces. Future Electron, filesystem, yt-dlp, FFmpeg, or SQLite integrations can replace service implementations without rewriting components.
