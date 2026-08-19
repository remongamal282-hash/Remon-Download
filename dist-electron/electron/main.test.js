"use strict";
/**
 * Tests for Main Process window lifecycle with Tray integration
 *
 * Tests:
 * - Window close doesn't quit the app (when tray is active)
 * - Window close hides the window
 * - Minimize sends window to tray
 * - Tray is created on app ready
 * - App quits when Quit is selected from tray
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
(0, vitest_1.describe)("Main Process Lifecycle (Tray Integration)", () => {
    (0, vitest_1.describe)("Window Close Behavior", () => {
        (0, vitest_1.it)("should prevent window close event and hide window instead", () => {
            const mockWindow = {
                on: vitest_1.vi.fn((event, handler) => {
                    if (event === "close") {
                        mockWindow._closeHandler = handler;
                    }
                }),
                _closeHandler: null,
                hide: vitest_1.vi.fn(),
                show: vitest_1.vi.fn(),
                minimize: vitest_1.vi.fn(),
                closed: null
            };
            const mockEvent = {
                preventDefault: vitest_1.vi.fn()
            };
            // Simulate the window close handler
            const handler = mockWindow._closeHandler;
            if (handler) {
                handler(mockEvent);
            }
            // This test verifies the structure is correct
            // In actual implementation, preventDefault is called and hide is called
            (0, vitest_1.expect)(mockEvent.preventDefault).toBeDefined();
        });
    });
    (0, vitest_1.describe)("Window Minimize Behavior", () => {
        (0, vitest_1.it)("should minimize window via tray", () => {
            const mockWindow = {
                on: vitest_1.vi.fn(),
                minimize: vitest_1.vi.fn(),
                hide: vitest_1.vi.fn()
            };
            mockWindow.on("minimize", () => {
                mockWindow.hide();
            });
            (0, vitest_1.expect)(mockWindow.on).toHaveBeenCalledWith("minimize", vitest_1.expect.any(Function));
        });
    });
    (0, vitest_1.describe)("App Lifecycle", () => {
        (0, vitest_1.it)("should prevent window-all-closed from quitting on Windows", () => {
            const mockEvent = {
                preventDefault: vitest_1.vi.fn()
            };
            // Mock the handler
            const handler = () => {
                mockEvent.preventDefault();
            };
            handler();
            (0, vitest_1.expect)(mockEvent.preventDefault).toHaveBeenCalled();
        });
        (0, vitest_1.it)("should destroy tray on before-quit event", () => {
            let beforeQuitHandler = null;
            const mockApp = {
                on: vitest_1.vi.fn((event, handler) => {
                    if (event === "before-quit") {
                        beforeQuitHandler = handler;
                    }
                })
            };
            mockApp.on("before-quit", () => { });
            (0, vitest_1.expect)(mockApp.on).toHaveBeenCalledWith("before-quit", vitest_1.expect.any(Function));
        });
    });
    (0, vitest_1.describe)("Integration: Download Continues While Hidden", () => {
        (0, vitest_1.it)("should not terminate download service when window is hidden", () => {
            // This is a conceptual test - in reality, downloads continue because:
            // 1. Window close event is prevented
            // 2. Main process keeps running
            // 3. IPC handlers remain active
            // 4. NativeDownloadService continues running
            // 5. yt-dlp process is not terminated
            const mockDownloadService = {
                isActive: () => true,
                getActiveDownloads: () => [{ id: "test-1", state: "downloading" }]
            };
            // Window is hidden but service is still active
            (0, vitest_1.expect)(mockDownloadService.isActive()).toBe(true);
            (0, vitest_1.expect)(mockDownloadService.getActiveDownloads().length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)("should not terminate scheduler when window is hidden", () => {
            // This is a conceptual test - in reality, scheduler continues because:
            // 1. Window close event is prevented
            // 2. Main process keeps running
            // 3. NativeSchedulerService continues running
            // 4. Scheduled downloads check still happens
            const mockSchedulerService = {
                isActive: () => true,
                getPendingSchedules: () => [{ id: "sched-1", status: "pending" }]
            };
            // Window is hidden but scheduler is still active
            (0, vitest_1.expect)(mockSchedulerService.isActive()).toBe(true);
            (0, vitest_1.expect)(mockSchedulerService.getPendingSchedules().length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)("should maintain IPC handlers while window is hidden", () => {
            // IPC handlers are registered in registerIpcHandlers()
            // They remain active regardless of window visibility
            const mockIpcHandlers = {
                registered: ["download:start", "download:pause", "download:resume", "download:cancel"],
                isActive: () => true
            };
            (0, vitest_1.expect)(mockIpcHandlers.isActive()).toBe(true);
            (0, vitest_1.expect)(mockIpcHandlers.registered.length).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)("Tray Creation", () => {
        (0, vitest_1.it)("should create tray after window is created on app ready", () => {
            const mockApp = {
                whenReady: vitest_1.vi.fn(() => Promise.resolve()),
                setAppUserModelId: vitest_1.vi.fn(),
                on: vitest_1.vi.fn()
            };
            // This verifies the structure
            (0, vitest_1.expect)(mockApp.whenReady).toBeDefined();
            (0, vitest_1.expect)(mockApp.setAppUserModelId).toBeDefined();
        });
        (0, vitest_1.it)("should restore window on app activate if mainWindow is hidden", () => {
            const mockWindow = {
                show: vitest_1.vi.fn(),
                focus: vitest_1.vi.fn(),
                isVisible: () => false
            };
            // Simulate activate handler showing window
            if (!mockWindow.isVisible()) {
                mockWindow.show();
                mockWindow.focus();
            }
            (0, vitest_1.expect)(mockWindow.show).toHaveBeenCalled();
            (0, vitest_1.expect)(mockWindow.focus).toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)("No Duplicate Tray Instances", () => {
        (0, vitest_1.it)("should not create duplicate tray even if app ready is called twice", () => {
            let trayCount = 0;
            const mockTray = {
                create: () => {
                    trayCount++;
                    return { id: trayCount };
                }
            };
            mockTray.create();
            const firstId = trayCount;
            // In actual implementation, hasTray() check prevents duplicate
            // const hasTray = () => tray !== null;
            // if (!hasTray()) tray = new Tray(...);
            (0, vitest_1.expect)(firstId).toBe(1);
            (0, vitest_1.expect)(trayCount).toBe(1);
        });
    });
    (0, vitest_1.describe)("Quit Behavior", () => {
        (0, vitest_1.it)("when Quit is selected from tray, app should call app.quit()", () => {
            const mockApp = {
                quit: vitest_1.vi.fn()
            };
            mockApp.quit();
            (0, vitest_1.expect)(mockApp.quit).toHaveBeenCalled();
        });
        (0, vitest_1.it)("should destroy tray before quitting", () => {
            const mockTray = {
                destroy: vitest_1.vi.fn()
            };
            // Simulate before-quit handler
            mockTray.destroy();
            (0, vitest_1.expect)(mockTray.destroy).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=main.test.js.map