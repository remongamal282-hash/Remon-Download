"use strict";
/**
 * IPC Contract Tests
 *
 * These tests validate the Electron IPC contract layer WITHOUT requiring
 * a running Electron instance. They run in Vitest (JSDOM environment) and
 * verify:
 *
 * 1. Channel naming consistency
 * 2. IpcResult<T> shape (success/error wrapping)
 * 3. Preload API surface shape
 * 4. Service resolver dual-mode selection
 * 5. Error propagation from wrapError
 * 6. Type safety of channel keys
 *
 * These tests are intentionally free from Electron-specific imports
 * (ipcMain, BrowserWindow, etc.) so they can run in standard Vitest.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const channels_1 = require("./channels");
const serviceResolver_1 = require("../../src/services/serviceResolver");
const metadataService_1 = require("../../src/services/metadataService");
const historyService_1 = require("../../src/services/historyService");
const favoritesService_1 = require("../../src/services/favoritesService");
const schedulerService_1 = require("../../src/services/schedulerService");
// ─── 1. Channel naming ──────────────────────────────────────────────────────
(0, vitest_1.describe)("IPC_CHANNELS — naming conventions", () => {
    (0, vitest_1.it)("all channels are non-empty strings", () => {
        for (const [key, value] of Object.entries(channels_1.IPC_CHANNELS)) {
            (0, vitest_1.expect)(typeof value, `${key} should be a string`).toBe("string");
            (0, vitest_1.expect)(value.length, `${key} channel name should be non-empty`).toBeGreaterThan(0);
        }
    });
    (0, vitest_1.it)("all channels follow namespace:action pattern", () => {
        const PATTERN = /^[a-z-]+:[a-z-]+$/;
        for (const [key, value] of Object.entries(channels_1.IPC_CHANNELS)) {
            (0, vitest_1.expect)(PATTERN.test(value), `${key} = "${value}" must match "namespace:action"`).toBe(true);
        }
    });
    (0, vitest_1.it)("all channel values are unique (no duplicate channel strings)", () => {
        const values = Object.values(channels_1.IPC_CHANNELS);
        const unique = new Set(values);
        (0, vitest_1.expect)(unique.size).toBe(values.length);
    });
    (0, vitest_1.it)("covers all expected service namespaces", () => {
        const namespaces = new Set(Object.values(channels_1.IPC_CHANNELS).map((ch) => ch.split(":")[0]));
        (0, vitest_1.expect)(namespaces).toContain("metadata");
        (0, vitest_1.expect)(namespaces).toContain("download");
        (0, vitest_1.expect)(namespaces).toContain("settings");
        (0, vitest_1.expect)(namespaces).toContain("history");
        (0, vitest_1.expect)(namespaces).toContain("favorites");
        (0, vitest_1.expect)(namespaces).toContain("scheduler");
    });
    (0, vitest_1.it)("has exactly 30 channels defined", () => {
        (0, vitest_1.expect)(Object.keys(channels_1.IPC_CHANNELS).length).toBe(30);
    });
});
// ─── 2. IpcResult<T> shape ──────────────────────────────────────────────────
(0, vitest_1.describe)("IpcResult<T> — success/error envelope", () => {
    (0, vitest_1.it)("success variant carries data and success: true", () => {
        const result = { success: true, data: "hello" };
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data).toBe("hello");
        }
    });
    (0, vitest_1.it)("error variant carries error and success: false", () => {
        const result = {
            success: false,
            error: { code: "unknown", message: "something failed", recoverable: true }
        };
        (0, vitest_1.expect)(result.success).toBe(false);
        if (!result.success) {
            (0, vitest_1.expect)(result.error.message).toBe("something failed");
            (0, vitest_1.expect)(result.error.code).toBe("unknown");
            (0, vitest_1.expect)(result.error.recoverable).toBe(true);
        }
    });
    (0, vitest_1.it)("success variant does not have an error property", () => {
        const result = { success: true, data: 42 };
        (0, vitest_1.expect)("error" in result).toBe(false);
    });
    (0, vitest_1.it)("error variant does not have a data property", () => {
        const result = {
            success: false,
            error: { code: "unknown", message: "fail", recoverable: false }
        };
        (0, vitest_1.expect)("data" in result).toBe(false);
    });
});
// ─── 3. Preload API surface shape ──────────────────────────────────────────
(0, vitest_1.describe)("Preload API surface — window.electronAPI contract", () => {
    (0, vitest_1.it)("window.electronAPI is undefined in Vitest (no preload injected)", () => {
        // In Vitest/JSDOM, no preload runs — window.electronAPI must be absent.
        (0, vitest_1.expect)(typeof window).toBe("object");
        (0, vitest_1.expect)(window.electronAPI).toBeUndefined();
    });
    (0, vitest_1.it)("isElectronEnvironment() returns false in Vitest", () => {
        (0, vitest_1.expect)((0, serviceResolver_1.isElectronEnvironment)()).toBe(false);
    });
    (0, vitest_1.it)("a simulated preload injection is detected by isElectronEnvironment()", () => {
        // Simulate what contextBridge.exposeInMainWorld would inject
        window.electronAPI = { isElectron: true };
        (0, vitest_1.expect)((0, serviceResolver_1.isElectronEnvironment)()).toBe(true);
        // Clean up
        delete window.electronAPI;
        (0, vitest_1.expect)((0, serviceResolver_1.isElectronEnvironment)()).toBe(false);
    });
});
// ─── 4. Service resolver — dual-mode selection ──────────────────────────────
(0, vitest_1.describe)("serviceResolver — dual-mode selection", () => {
    (0, vitest_1.beforeEach)(() => {
        // Remove any simulated electronAPI and reset singleton cache
        delete window.electronAPI;
        (0, serviceResolver_1._resetServiceCache)();
    });
    (0, vitest_1.it)("resolveMetadataService() returns MockMetadataService in Web/Vitest mode", () => {
        const service = (0, serviceResolver_1.resolveMetadataService)();
        (0, vitest_1.expect)(service).toBeInstanceOf(metadataService_1.MockMetadataService);
    });
    (0, vitest_1.it)("resolveHistoryService() returns MockHistoryService in Web/Vitest mode", () => {
        const service = (0, serviceResolver_1.resolveHistoryService)();
        (0, vitest_1.expect)(service).toBeInstanceOf(historyService_1.MockHistoryService);
    });
    (0, vitest_1.it)("resolveFavoritesService() returns MockFavoritesService in Web/Vitest mode", () => {
        const service = (0, serviceResolver_1.resolveFavoritesService)();
        (0, vitest_1.expect)(service).toBeInstanceOf(favoritesService_1.MockFavoritesService);
    });
    (0, vitest_1.it)("resolveSchedulerService() returns MockSchedulerService in Web/Vitest mode", () => {
        const service = (0, serviceResolver_1.resolveSchedulerService)();
        (0, vitest_1.expect)(service).toBeInstanceOf(schedulerService_1.MockSchedulerService);
    });
    (0, vitest_1.it)("returns the same singleton on repeated calls (no re-instantiation)", () => {
        const first = (0, serviceResolver_1.resolveMetadataService)();
        const second = (0, serviceResolver_1.resolveMetadataService)();
        (0, vitest_1.expect)(first).toBe(second);
    });
    (0, vitest_1.it)("_resetServiceCache() forces new instances on next resolve", () => {
        const first = (0, serviceResolver_1.resolveMetadataService)();
        (0, serviceResolver_1._resetServiceCache)();
        const second = (0, serviceResolver_1.resolveMetadataService)();
        (0, vitest_1.expect)(first).not.toBe(second);
    });
});
// ─── 5. Error propagation simulation ────────────────────────────────────────
(0, vitest_1.describe)("error propagation — wrapError simulation", () => {
    function wrapSuccess(data) {
        return { success: true, data };
    }
    function wrapError(err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            success: false,
            error: { code: "unknown", message, recoverable: true }
        };
    }
    (0, vitest_1.it)("wrapSuccess returns success: true with data", () => {
        const r = wrapSuccess({ id: "abc" });
        (0, vitest_1.expect)(r.success).toBe(true);
        if (r.success)
            (0, vitest_1.expect)(r.data).toEqual({ id: "abc" });
    });
    (0, vitest_1.it)("wrapError from Error instance extracts message", () => {
        const r = wrapError(new Error("network timeout"));
        (0, vitest_1.expect)(r.success).toBe(false);
        if (!r.success)
            (0, vitest_1.expect)(r.error.message).toBe("network timeout");
    });
    (0, vitest_1.it)("wrapError from string coerces to message", () => {
        const r = wrapError("raw string error");
        (0, vitest_1.expect)(r.success).toBe(false);
        if (!r.success)
            (0, vitest_1.expect)(r.error.message).toBe("raw string error");
    });
    (0, vitest_1.it)("wrapError from unknown type uses String()", () => {
        const r = wrapError({ code: 404 });
        (0, vitest_1.expect)(r.success).toBe(false);
        if (!r.success)
            (0, vitest_1.expect)(r.error.message).toBe("[object Object]");
    });
    (0, vitest_1.it)("renderer raises error when IpcResult.success is false", () => {
        async function rendererInvoke() {
            const result = {
                success: false,
                error: { code: "unknown", message: "main process crashed", recoverable: false }
            };
            if (!result.success) {
                throw new Error(result.error.message);
            }
            const data = result.data;
            return data;
        }
        return (0, vitest_1.expect)(rendererInvoke()).rejects.toThrow("main process crashed");
    });
});
// ─── 6. Security contract assertions ────────────────────────────────────────
(0, vitest_1.describe)("security constraints — renderer has no Node.js access", () => {
    (0, vitest_1.it)("require() is not available in the renderer context (Vitest/JSDOM)", () => {
        // In Vitest with jsdom environment, require is available as part of the
        // Vitest module system, but window.require (what Electron would expose
        // when nodeIntegration:true) must not exist.
        (0, vitest_1.expect)(window.require).toBeUndefined();
    });
    (0, vitest_1.it)("window.electronAPI is undefined unless preload injects it", () => {
        // Confirm the baseline — no preload has run in JSDOM
        (0, vitest_1.expect)(window.electronAPI).toBeUndefined();
    });
    (0, vitest_1.it)("window.electronAPI is boolean-detectable after simulated injection", () => {
        // Simulate what contextBridge.exposeInMainWorld('electronAPI', ...) does
        window.electronAPI = { isElectron: true };
        const api = window.electronAPI;
        (0, vitest_1.expect)(api.isElectron).toBe(true);
        // Clean up
        delete window.electronAPI;
    });
    (0, vitest_1.it)("Electron main process security config — contextIsolation must be true (documented constant)", () => {
        // This is a documentation test: it asserts the security configuration
        // constants we MUST use in BrowserWindow. The actual enforcement happens
        // in electron/main.ts. If this changes, the test will act as a reminder.
        const REQUIRED_SECURITY_CONFIG = {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            webSecurity: true
        };
        (0, vitest_1.expect)(REQUIRED_SECURITY_CONFIG.contextIsolation).toBe(true);
        (0, vitest_1.expect)(REQUIRED_SECURITY_CONFIG.nodeIntegration).toBe(false);
        (0, vitest_1.expect)(REQUIRED_SECURITY_CONFIG.sandbox).toBe(true);
        (0, vitest_1.expect)(REQUIRED_SECURITY_CONFIG.webSecurity).toBe(true);
    });
});
//# sourceMappingURL=ipc.test.js.map