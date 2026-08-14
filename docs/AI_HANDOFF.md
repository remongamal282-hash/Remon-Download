# AI Handoff

PROJECT:
Remon Download

CURRENT PHASE:
React Prototype

TECH STACK:
React, TypeScript, Vite, Tailwind CSS, Zustand, React Router, sonner, react-hook-form, zod, i18next, vitest

NOT USING:
Electron, yt-dlp, FFmpeg, SQLite, Backend, Authentication

CURRENT STATUS:
Dashboard, Download Queue, History, Favorites, Scheduler, Settings, and About are implemented. The project follows the required layered flow: Components to Zustand Stores to Service Interfaces to Mock Implementations.

LAST COMPLETED TASK:
About page completion polish with required app name, dynamic version, developer, contact status, localized English/Arabic labels, RTL/LTR-friendly layout, and tests.

CURRENT TASK:
None.

NEXT TASK:
Implement Dev Tools panel according to `docs/SPEC.md`.

IMPORTANT DECISIONS:
- No Login.
- React only during Prototype.
- Mock Services only.
- Settings persisted through localStorage.
- Queue/History/Favorites/Scheduler are session-only.
- Zustand only for global state.
- Electron-ready Service Architecture.
- No Git operations by AI.
- Empty routed placeholders are acceptable until each feature's implementation turn.
- Download Queue lifecycle state transitions are centralized in `src/utils/stateMachine.ts`.
- Queue simulation is mock-only and driven by `queueStore.tick()` from `QueuePage`.
- History is session-only and records Queue items when they reach `completed`, `failed`, or `canceled`.
- `Re-download` creates a new queued item from the History item and does not auto-start it.
- `Open Folder` is UI simulation only and must not call OS, shell, Electron, or filesystem APIs.
- Favorites are session-only and use seeded mock data in `src/services/favoritesService.ts`.
- Favorite `Download` creates a new queued item and does not auto-start it.
- Scheduler is session-only and uses `src/services/schedulerService.ts`.
- Scheduler `tick()` is in-app only; it does not use OS Scheduler, native notifications, Electron, filesystem, or background execution after app close.
- Scheduler triggers create queued items through `queueStore.addFromMetadata()` and do not auto-start downloads.
- Settings are persisted only through localStorage via `src/services/settingsService.ts`.
- Settings page controls are UI-only for startup, tray, clipboard, yt-dlp path, FFmpeg path, proxy, and download folder; no OS, filesystem, Electron, clipboard, yt-dlp, or FFmpeg integration is used.
- Queue reads concurrent downloads and speed limit from settings.
- Dashboard/Favorites/Scheduler queue creation reads default quality and default video format from settings.
- About version is injected dynamically through `__APP_VERSION__` from Vite config.
- About contact is displayed as localized "Not specified" because no concrete contact value is defined in project metadata or `docs/SPEC.md`.
- `npm run test` passes with 21 test files and 81 tests.
- `npm run build` passes, including `tsc -b`.

KNOWN ISSUES:
- npm reports 7 dependency audit vulnerabilities after install. Review separately before applying fixes.

DO NOT:
- Start Electron.
- Add Backend.
- Add Authentication.
- Replace React.
- Replace Zustand.
- Rewrite working Features without reason.
- Import services directly from components.
- Execute Git operations.

