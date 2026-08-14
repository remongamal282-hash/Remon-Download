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
Initial project scaffold and Dashboard feature are implemented. The project follows the required layered flow: Components to Zustand Stores to Service Interfaces to Mock Implementations.

LAST COMPLETED TASK:
Dashboard Quick Add URL feature with mock metadata analysis and Add to Queue.

CURRENT TASK:
None.

NEXT TASK:
Implement Download Queue according to `docs/SPEC.md` Sections 10, 11, 20, and 21.

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
