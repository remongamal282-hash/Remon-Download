# AI Handoff

## Current Phase
Phase 2 — Electron Foundation (IPC Layer Complete + Stores Wired to serviceResolver)

## Status Summary

| Layer | Status |
|---|---|
| React UI (all pages) | ✅ Complete |
| Zustand Stores | ✅ Complete — wired to serviceResolver |
| Mock Services | ✅ Complete |
| Service Interfaces | ✅ Complete |
| serviceResolver | ✅ All 6 namespaces, singleton cache, test helpers |
| Vitest Test Suite | ✅ 26 files, 147 tests, 0 failed |
| Vite Production Build | ✅ 1668 modules, zero errors |
| Electron IPC Layer | ✅ Complete (channels, handlers, preload, main) |
| Electron Security | ✅ contextIsolation, no nodeIntegration, sandbox |
| Native Services | ✅ Stubbed (in-memory, Node.js-compatible) |
| electron:build | ✅ esbuild → dist-electron/ in ~155ms |
| yt-dlp integration | ❌ Pending |
| Persistent storage | ❌ Pending |
| Electron packaging / installer | ❌ Pending |

---

## What Was Done

### Phase 1 (Complete)
- React + TypeScript + Vite scaffold with all 7 core pages: Dashboard, Queue, History, Favorites, Scheduler, Settings, About.
- All pages have Zustand stores, Service interfaces, Mock implementations, and Vitest test files.
- Dev Tools panel (Ctrl+Shift+D) for development-only mock control.
- Full localization (Arabic/English, RTL/LTR).

### Phase 2 Foundation (Complete)
1. **IPC Channel Registry** (`electron/ipc/channels.ts`):
   - 25 typed channels across 6 namespaces.
   - `IpcResult<T>` envelope: `{ success: true, data: T }` | `{ success: false, error: ErrorModel }`.
   - `IpcContractPayloads` and `IpcContractResponses` mapped types for full type-safety.

2. **IPC Handlers** (`electron/ipc/handlers.ts`):
   - `registerIpcHandlers(services)` wires all `ipcMain.handle()` calls.
   - Uses `wrapSuccess`/`wrapError` helpers — no unhandled exceptions escape to Renderer.

3. **Preload** (`electron/preload.ts`):
   - `contextBridge.exposeInMainWorld('electronAPI', ...)`.
   - Typed `invoke<T>(channel, payload)` helper (throws if `success: false`).
   - Zero raw Node.js APIs or `ipcRenderer` exposed to Renderer.

4. **Main Process** (`electron/main.ts`):
   - `BrowserWindow` with `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`.
   - Loads Vite dev server (`http://localhost:5173`) in development, `dist/index.html` in production.
   - Calls `registerIpcHandlers(nativeServices)` on app ready.

5. **Native Services** (`electron/services/native*.ts`):
   - All 6 services are self-contained — no browser APIs, no `window.*`, no DOM.
   - Currently in-memory stubs. Ready for Phase 2.x real implementations.

6. **Renderer Adapters** (`src/services/electronIpcAdapters.ts`):
   - One adapter per service interface, delegating every call to `window.electronAPI`.

7. **Service Resolver** (`src/services/serviceResolver.ts`):
   - `resolveMetadataService()`, `resolveDownloadService()`, `resolveHistoryService()`, `resolveFavoritesService()`, `resolveSchedulerService()`, `resolveSettingsService()`.
   - Detects `window.electronAPI` at runtime → picks Electron adapters or Mock services.
   - `_resetServiceCache()` + per-service `_inject*Service()` helpers for test isolation.

8. **Types** (`src/types/electron.d.ts`):
   - `ElectronAPI` interface (self-contained, no import from `electron/preload.ts`).
   - `Window.electronAPI?: ElectronAPI` global augmentation.

9. **IPC Tests** (`electron/ipc/ipc.test.ts`):
   - 27 tests: channel naming, IpcResult envelope, preload surface, resolver dual-mode, error propagation, security constraints.
   - Runs under Vitest — no live Electron instance needed.

10. **Build Config**:
    - `tsconfig.electron.json`: CommonJS, Node target, strict.
    - `electron:build`: esbuild → `dist-electron/electron/{main,preload}.js`.
    - `electron:start`: `node dist-electron/electron/main.js` (via electron runner).

### Phase 2 — Store Wiring (Complete)
All 6 Zustand stores updated to route through `serviceResolver` — no store imports a Mock or Native service class directly:

| Store | Resolver call |
|---|---|
| `metadataStore.ts` | `resolveMetadataService()` |
| `queueStore.ts` | `resolveDownloadService()` |
| `historyStore.ts` | `resolveHistoryService()` |
| `favoritesStore.ts` | `resolveFavoritesService()` |
| `schedulerStore.ts` | `resolveSchedulerService()` |
| `settingsStore.ts` | `resolveSettingsService()` |

New: `src/services/serviceResolver.test.ts` — 26 tests for the resolver's dual-mode selection, singleton caching, and test injection surface.

---

## Known Architectural Decision Pending

**SettingsService sync/async mismatch:**

- `SettingsService.get()` is synchronous (for `localStorage` compatibility).
- Electron IPC is inherently async (`ipcRenderer.invoke` returns `Promise`).
- `ElectronSettingsService` adapter throws on sync `.get()` / `.update()` / `.reset()`.
- `resolveSettingsService()` therefore always returns `LocalStorageSettingsService` regardless of environment.
- `settingsStore` consumes settings synchronously at module load.

**Options (require user approval before implementing):**
1. Make `SettingsService` interface fully async and update all consumers (settingsStore, tests).
2. Initialize settingsStore with `getAsync()` on app start, cache the result, keep sync reads after init.

**This decision must not be made without user approval.**

---

## What the Next Agent Must Do

### Next Phase (Phase 2 Remaining):

1. **`electron:dev` script**: concurrent Vite dev server + Electron launch (e.g., `concurrently "vite" "wait-on http://localhost:5173 && electron ."`).

2. **Replace NativeMetadataService stub** with real `yt-dlp` child_process invocation.

3. **Replace in-memory Native Services** with persistent storage (`electron-store` JSON or SQLite).

4. **Push IPC events Main → Renderer**: download progress requires `ipcRenderer.on` / `webContents.send` pattern — not `invoke`. Design the event channel before implementation.

5. **System tray, OS notifications, auto-start** per SPEC Phase 2.

6. **Resolve SettingsService sync/async mismatch** (requires user decision — see above).

7. **Packaging**: electron-builder or electron-forge for Windows installer.

---

## Test Commands

```bash
npm run test              # Vitest — 26 files, 147 tests (must stay green)
npm run build             # Vite production build (must stay green)
npm run electron:build    # esbuild main + preload (must stay green)
npm run electron:start    # launch Electron window (manual visual check)
```

---

## Files Created / Modified in Phase 2

| File | Status |
|---|---|
| `electron/ipc/channels.ts` | ✅ Created |
| `electron/ipc/handlers.ts` | ✅ Created |
| `electron/ipc/ipc.test.ts` | ✅ Created |
| `electron/preload.ts` | ✅ Created |
| `electron/main.ts` | ✅ Created |
| `electron/services/nativeMetadataService.ts` | ✅ Created (Node.js-only) |
| `electron/services/nativeDownloadService.ts` | ✅ Created |
| `electron/services/nativeSettingsService.ts` | ✅ Created |
| `electron/services/nativeHistoryService.ts` | ✅ Created |
| `electron/services/nativeFavoritesService.ts` | ✅ Created |
| `electron/services/nativeSchedulerService.ts` | ✅ Created |
| `src/types/electron.d.ts` | ✅ Created (self-contained) |
| `src/services/electronIpcAdapters.ts` | ✅ Created |
| `src/services/serviceResolver.ts` | ✅ Extended (all 6 resolvers + inject helpers) |
| `src/services/serviceResolver.test.ts` | ✅ Created (26 tests) |
| `src/stores/metadataStore.ts` | ✅ Wired to resolveMetadataService() |
| `src/stores/queueStore.ts` | ✅ Wired to resolveDownloadService() |
| `src/stores/historyStore.ts` | ✅ Wired to resolveHistoryService() |
| `src/stores/favoritesStore.ts` | ✅ Wired to resolveFavoritesService() |
| `src/stores/schedulerStore.ts` | ✅ Wired to resolveSchedulerService() |
| `src/stores/settingsStore.ts` | ✅ Wired to resolveSettingsService() |
| `tsconfig.electron.json` | ✅ Created |
| `package.json` | ✅ Modified (electron:build, electron:start, main) |
| `docs/ARCHITECTURE.md` | ✅ Updated (Phase 2 layers, IPC table) |
| `docs/DEVELOPMENT_STATUS.md` | ✅ Updated (Phase 2 + Store Wiring sections) |
| `docs/CHANGELOG.md` | ✅ Updated (v1.1.1-store-wiring) |

---

## Invariants (Never Violate)

- `npm run test` must always pass 100% before any commit.
- `npm run build` must always pass before any commit.
- `npm run electron:build` must always pass before any commit.
- Never expose raw `ipcRenderer` to the Renderer process.
- Never import browser-only APIs (`window.*`, `localStorage`, DOM) inside `electron/`.
- Never delete Mock services — they are the Web/Vitest fallback.
- Never rewrite React components or Zustand store shapes.
- No store may import a service class directly — always use `serviceResolver`.
- Never use `npm audit fix` automatically.
- Never use Git / make commits.
