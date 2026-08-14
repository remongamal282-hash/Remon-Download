# Changelog

## 0.7.0

Added:
- Focused About page tests for required application information and Arabic localization.

Changed:
- Polished About page layout, spacing, typography, and responsive details grid.
- About page now removes placeholder contact text and displays a localized not-specified contact status when no contact is defined in project metadata or `docs/SPEC.md`.

Fixed:
- Confirmed `npm run test` passes with 21 test files and 81 tests.
- Confirmed `npm run build` passes, including `tsc -b`.

## 0.6.0

Added:
- Interactive Settings page with General, Appearance, Language, Downloads, Notifications, Clipboard, Advanced, and Smart File Naming sections.
- Settings controls for download folder, startup/tray UI flags, theme, language, concurrent downloads, speed limit, default quality, default video/audio formats, notifications, clipboard behavior, yt-dlp path, FFmpeg path, proxy, and file name template.
- Smart File Naming live preview using the configured quality and video format.
- Settings page tests plus Settings service/store tests for persistence, reset behavior, corrupt localStorage recovery, theme, language, RTL/LTR, and document dark-mode application.

Changed:
- Settings route now renders the real Settings page instead of a placeholder.
- Settings store now exposes reload support for recovered localStorage state.

Fixed:
- Confirmed `npm run test` passes with 20 test files and 79 tests.
- Confirmed `npm run build` passes, including `tsc -b`.

## 0.5.0

Added:
- Interactive Scheduler page with URL, date, time, and repeat form fields.
- `SchedulerService` interface with mock implementation for session-only Scheduler data.
- Zustand `schedulerStore` actions for load, create, update, cancel, remove, timed tick, mock errors, and test reset.
- In-app Scheduler simulation that triggers due schedules and adds new queued `DownloadItem` records without starting downloads.
- Once, Daily, and Weekly repeat behavior with next-run advancement for repeating schedules.
- Localized English/Arabic Scheduler copy for RTL/LTR layouts.
- Scheduler skeleton loading, empty state, accessible action buttons, and focused service/store/page tests.

Changed:
- Scheduler route now renders the real Scheduler page instead of a placeholder.

Fixed:
- Confirmed `npm run test` passes with 17 test files and 68 tests.
- Confirmed `npm run build` passes, including `tsc -b`.

## 0.4.0

Added:
- Interactive Favorites page with seeded mock favorite videos.
- `FavoritesService` interface with mock implementation for session-only Favorites data.
- Zustand `favoritesStore` actions for loading, add, remove, favorite lookup, download-to-queue, and mock errors.
- Favorite download flow that creates a new queued `DownloadItem` using selected quality and format defaults.
- Localized English/Arabic Favorites copy for RTL/LTR layouts.
- Favorites skeleton loading, empty state, accessible action buttons, and focused tests.

Changed:
- Favorites route now renders the real Favorites page instead of a placeholder.

Fixed:
- Confirmed `npm run test` passes with 14 test files and 55 tests.

## 0.3.0

Added:
- Interactive History page for completed, failed, and canceled downloads.
- `HistoryService` interface with mock implementation for session-only History data.
- Zustand `historyStore` actions for loading, add-from-download, remove, clear, re-download, Open Folder simulation, and mock errors.
- Queue-to-History bridge that records terminal Queue items without duplicating Queue state.
- Re-download flow that creates a new queued `DownloadItem` using the original source URL, title, thumbnail, quality, format, and file size.
- Localized English/Arabic History copy for RTL/LTR layouts.
- History skeleton loading, empty state, accessible icon buttons, and prototype Open Folder toast.
- Tests for History service, History store, Queue-to-History bridge, and History page interactions.

Changed:
- History route now renders the real History page instead of a placeholder.
- History actions now report failed item lookup errors through the existing store/toast error path.

Fixed:
- Removed a duplicate History icon button prop declaration that could break strict TypeScript builds.

## 0.2.0

Added:
- Interactive Download Queue page.
- dnd-kit mouse and keyboard reordering with persisted `order` values.
- Independent download state machine utility.
- Mock download lifecycle simulation: queued, analyzing, downloading, merging, converting, completed.
- Pause, resume, cancel, retry, remove, and mock failure controls.
- Concurrent download slot handling.
- Speed limiter affecting simulated speed, downloaded size, progress, and ETA.
- Progress bars with ARIA attributes.
- Tests for state machine transitions, download service lifecycle, queue store behavior, and queue UI interactions.

Changed:
- Queue route now renders the real Download Queue page instead of an empty placeholder.
- `DownloadService` now owns mock lifecycle transitions and simulation calculations.

Fixed:
- None.

## 0.1.0

Added:
- Initial React + TypeScript + Vite project scaffold.
- Tailwind CSS setup.
- React Router layout with seven required routes.
- i18next Arabic/English foundation with RTL/LTR document direction.
- Zustand stores for metadata, queue, settings, history, favorites, scheduler, and dev tools.
- Mock metadata, download, and settings services.
- Dashboard Quick Add URL feature.
- Mock video, shorts, playlist, playlist-video, and channel analysis.
- Add to Queue behavior for single videos, playlists, and channel selections.
- Vitest tests for URL validation, mock metadata service, metadata store, and queue store.
- Required documentation files.

Changed:
- None.

Fixed:
- None.



