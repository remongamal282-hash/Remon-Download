# Changelog

## 1.1.1-store-wiring

Added:
- `src/services/serviceResolver.ts` extended with `resolveDownloadService()` and `resolveSettingsService()` — all 6 service namespaces now covered.
- `src/services/serviceResolver.ts` extended with per-service `_inject*Service()` test helpers (`_injectMetadataService`, `_injectDownloadService`, `_injectHistoryService`, `_injectFavoritesService`, `_injectSchedulerService`, `_injectSettingsService`).
- `src/services/serviceResolver.test.ts`: 26 new tests covering Web/Mock mode, Electron mode, singleton caching, test injection helpers, and adapter surface validation for all 4 Electron adapters.

Changed:
- `src/stores/metadataStore.ts`: Replaced direct `metadataService` singleton import with `resolveMetadataService()`.
- `src/stores/queueStore.ts`: Replaced direct `downloadService` singleton import with `resolveDownloadService()`.
- `src/stores/historyStore.ts`: Replaced direct `historyService` singleton import with `resolveHistoryService()`.
- `src/stores/favoritesStore.ts`: Replaced direct `favoritesService` singleton import with `resolveFavoritesService()`.
- `src/stores/schedulerStore.ts`: Replaced direct `schedulerService` singleton import with `resolveSchedulerService()`.
- `src/stores/settingsStore.ts`: Replaced direct `settingsService` singleton import with `resolveSettingsService()`.
- Architecture rule now enforced: No Zustand store imports a Mock or Native service class directly. All service access routes through `serviceResolver`.

Fixed:
- `resolveSettingsService()` is documented to always return `LocalStorageSettingsService` (sync interface, IPC is async). See `AI_HANDOFF.md` "Known Architectural Decision Pending".

Test Results:
- `npm run test`: **26 test files, 147 tests, 0 failed** ✅
- `npm run build`: ✅ zero errors (tsc -b + vite build, 1668 modules)
- `npm run electron:build`: ✅ esbuild compiles `main.ts` + `preload.ts` → `dist-electron/` in ~155ms

## 1.1.0-electron-foundation

Added:
- `electron/` directory with full IPC foundation for Phase 2 Electron integration.
- `electron/ipc/channels.ts`: Typed `IPC_CHANNELS` registry — 25 channels across 6 namespaces (metadata, download, settings, history, favorites, scheduler). `IpcResult<T>` envelope, `IpcContractPayloads`, and `IpcContractResponses` contracts.
- `electron/ipc/handlers.ts`: `registerIpcHandlers()` wiring all `ipcMain.handle` calls with safe `wrapSuccess`/`wrapError` error propagation.
- `electron/preload.ts`: Secure preload using `contextBridge.exposeInMainWorld('electronAPI', ...)` with typed invoke helper. No raw `ipcRenderer` or Node.js APIs exposed to Renderer.
- `electron/main.ts`: `BrowserWindow` with `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`. Loads Vite dev server in development or `dist/index.html` in production.
- `electron/services/nativeMetadataService.ts`: Node.js-compatible stub (no browser APIs, no `window.setTimeout`).
- `electron/services/nativeDownloadService.ts`: In-memory download queue boundary for Main Process.
- `electron/services/nativeSettingsService.ts`: In-memory settings boundary for Main Process.
- `electron/services/nativeHistoryService.ts`: In-memory history boundary for Main Process.
- `electron/services/nativeFavoritesService.ts`: In-memory favorites boundary for Main Process.
- `electron/services/nativeSchedulerService.ts`: In-memory scheduler boundary for Main Process.
- `src/types/electron.d.ts`: Self-contained `ElectronAPI` interface + `Window.electronAPI` optional global type augmentation.
- `src/services/electronIpcAdapters.ts`: Renderer-side IPC adapter implementations of all service interfaces using `window.electronAPI`.
- `src/services/serviceResolver.ts`: Dual-mode factory — selects Electron IPC adapters when `window.electronAPI` is defined; Mock services otherwise. Includes `_resetServiceCache()` and `_injectServices()` test helpers.
- `tsconfig.electron.json`: TypeScript config for compiling Main Process (CommonJS, Node target, strict).
- `electron/ipc/ipc.test.ts`: 27 IPC contract tests covering channel naming, `IpcResult` envelope, preload surface detection, dual-mode resolver selection, error propagation, and security constraints — runnable under Vitest without a live Electron instance.
- `package.json` updated: `electron:build` (esbuild → `dist-electron/`), `electron:start` (Electron launcher), `"main"` entry for Electron.

Fixed:
- `nativeMetadataService.ts` now uses only Node.js-compatible APIs (no `window.setTimeout`, no DOM APIs).
- `electron.d.ts` now self-contained (no circular import from `electron/preload.ts`).

Test Results:
- `npm run test`: **25 test files, 121 tests, 0 failed** ✅
- `npm run build`: ✅ zero errors (tsc -b + vite build, 1666 modules, 14.78s)
- `npm run electron:build`: ✅ esbuild compiles `main.ts` + `preload.ts` → `dist-electron/` in 55ms

## 1.0.0

Added:
- Full Acceptance Testing & Final Prototype Verification suite (`DashboardPage.test.tsx`).
- Verified acceptance checklist across all 7 core pages, Dev Tools, state machine transitions, persistence rules, localization, accessibility, and mock error handling.

Fixed:
- Confirmed `npm run test` passes with 24 test files and 94 tests.
- Confirmed `npm run build` passes with zero errors (`tsc -b && vite build`).

## 0.8.0

Added:
- Development-only Dev Tools panel toggled with `Ctrl + Shift + D`.
- SPEC-defined Mock Scenario selector for Success, Network Error, Video Unavailable, Disk Full, Permission Denied, yt-dlp Error, and FFmpeg Error.
- Simulation Speed selector that drives the existing Queue mock simulation interval in development only.
- Dev Tools controls for Seed Demo Data, Clear Mock Data, Reset Settings, Simulate Download, and Simulate Error.
- Focused Dev Tools store and component tests.

Changed:
- About contact now displays concrete phone and email links instead of localized placeholder text.
- Favorites and Scheduler stores expose `clearMockData` actions for development-only mock clearing through stores.

Fixed:
- Confirmed `npm run test` passes with 23 test files and 91 tests.
- Confirmed `npm run build` passes, including `tsc -b`.

## 0.7.0

Added:
- Focused About page tests for required application information and Arabic localization.

Changed:
- Polished About page layout, spacing, typography, and responsive details grid.
- About page now removes placeholder contact text and displays concrete phone/email contact links.

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



