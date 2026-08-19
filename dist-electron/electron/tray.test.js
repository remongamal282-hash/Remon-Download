"use strict";
/**
 * Tests for System Tray integration
 *
 * Tests:
 * - Tray creation
 * - Show/Hide/Quit operations
 * - Single instance guarantee
 * - Window lifecycle integration
 * - Downloads continue while hidden
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const tray_1 = require("./tray");
const electron_1 = require("electron");
// Mock Electron modules
vitest_1.vi.mock("electron", () => ({
    Tray: vitest_1.vi.fn(() => ({
        on: vitest_1.vi.fn(),
        setToolTip: vitest_1.vi.fn(),
        setContextMenu: vitest_1.vi.fn(),
        destroy: vitest_1.vi.fn()
    })),
    Menu: {
        buildFromTemplate: vitest_1.vi.fn(() => ({
            popup: vitest_1.vi.fn()
        }))
    },
    BrowserWindow: {
        getFocusedWindow: vitest_1.vi.fn()
    },
    nativeImage: {
        createFromPath: vitest_1.vi.fn(() => ({
            isEmpty: vitest_1.vi.fn(() => false),
            resize: vitest_1.vi.fn(() => ({ isEmpty: vitest_1.vi.fn(() => false) }))
        }))
    },
    app: {
        quit: vitest_1.vi.fn()
    }
}));
(0, vitest_1.describe)("Tray Module", () => {
    let mockWindow;
    (0, vitest_1.beforeEach)(() => {
        // Clear all mocks before each test
        vitest_1.vi.clearAllMocks();
        electron_1.Tray.mockImplementation(() => ({
            on: vitest_1.vi.fn(),
            setToolTip: vitest_1.vi.fn(),
            setContextMenu: vitest_1.vi.fn(),
            destroy: vitest_1.vi.fn()
        }));
        electron_1.Menu.buildFromTemplate.mockImplementation(() => ({
            popup: vitest_1.vi.fn()
        }));
        // Setup mock window
        mockWindow = {
            minimize: vitest_1.vi.fn(),
            restore: vitest_1.vi.fn(),
            show: vitest_1.vi.fn(),
            hide: vitest_1.vi.fn(),
            focus: vitest_1.vi.fn(),
            isMinimized: vitest_1.vi.fn(() => false),
            close: vitest_1.vi.fn()
        };
        // Cleanup tray before each test
        if ((0, tray_1.hasTray)()) {
            (0, tray_1.destroyTray)();
        }
    });
    (0, vitest_1.afterEach)(() => {
        // Cleanup after each test
        if ((0, tray_1.hasTray)()) {
            (0, tray_1.destroyTray)();
        }
    });
    (0, vitest_1.describe)("createTray", () => {
        (0, vitest_1.it)("should create a new tray instance", () => {
            (0, vitest_1.expect)((0, tray_1.hasTray)()).toBe(false);
            (0, tray_1.createTray)(mockWindow);
            (0, vitest_1.expect)((0, tray_1.hasTray)()).toBe(true);
            (0, vitest_1.expect)(electron_1.Tray).toHaveBeenCalled();
        });
        (0, vitest_1.it)("should not create duplicate tray instances", () => {
            (0, tray_1.createTray)(mockWindow);
            const firstInstance = (0, tray_1.getTray)();
            (0, tray_1.createTray)(mockWindow);
            const secondInstance = (0, tray_1.getTray)();
            (0, vitest_1.expect)(firstInstance).toBe(secondInstance);
            (0, vitest_1.expect)(electron_1.Tray).toHaveBeenCalledTimes(1);
        });
        (0, vitest_1.it)("should set up context menu with Show/Hide/Quit options", () => {
            (0, tray_1.createTray)(mockWindow);
            (0, vitest_1.expect)(electron_1.Menu.buildFromTemplate).toHaveBeenCalled();
            const menuTemplate = electron_1.Menu.buildFromTemplate.mock.calls[0][0];
            (0, vitest_1.expect)(menuTemplate).toHaveLength(4); // Show, Hide, Separator, Quit
            (0, vitest_1.expect)(menuTemplate[0].label).toBe("Show Remon Download");
            (0, vitest_1.expect)(menuTemplate[1].label).toBe("Hide Remon Download");
            (0, vitest_1.expect)(menuTemplate[2].type).toBe("separator");
            (0, vitest_1.expect)(menuTemplate[3].label).toBe("Quit Remon Download");
        });
        (0, vitest_1.it)("should set up click handler for tray icon", () => {
            const mockTray = { on: vitest_1.vi.fn(), setToolTip: vitest_1.vi.fn(), setContextMenu: vitest_1.vi.fn(), destroy: vitest_1.vi.fn() };
            electron_1.Tray.mockImplementation(() => mockTray);
            (0, tray_1.createTray)(mockWindow);
            (0, vitest_1.expect)(mockTray.on).toHaveBeenCalledWith("click", vitest_1.expect.any(Function));
        });
        (0, vitest_1.it)("should handle left click to show and focus window", () => {
            const mockTray = {
                on: vitest_1.vi.fn((event, handler) => {
                    if (event === "click") {
                        // Simulate clicking the tray
                        handler();
                    }
                }),
                setToolTip: vitest_1.vi.fn(),
                setContextMenu: vitest_1.vi.fn(),
                destroy: vitest_1.vi.fn()
            };
            electron_1.Tray.mockImplementation(() => mockTray);
            (0, tray_1.createTray)(mockWindow);
            (0, vitest_1.expect)(mockWindow.show).toHaveBeenCalled();
            (0, vitest_1.expect)(mockWindow.focus).toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)("showWindow", () => {
        (0, vitest_1.beforeEach)(() => {
            (0, tray_1.createTray)(mockWindow);
        });
        (0, vitest_1.it)("should show the window", () => {
            (0, tray_1.showWindow)(mockWindow);
            (0, vitest_1.expect)(mockWindow.show).toHaveBeenCalled();
        });
        (0, vitest_1.it)("should focus the window", () => {
            (0, tray_1.showWindow)(mockWindow);
            (0, vitest_1.expect)(mockWindow.focus).toHaveBeenCalled();
        });
        (0, vitest_1.it)("should restore window if minimized", () => {
            mockWindow.isMinimized.mockReturnValue(true);
            (0, tray_1.showWindow)(mockWindow);
            (0, vitest_1.expect)(mockWindow.restore).toHaveBeenCalled();
        });
        (0, vitest_1.it)("should not restore window if not minimized", () => {
            mockWindow.isMinimized.mockReturnValue(false);
            (0, tray_1.showWindow)(mockWindow);
            (0, vitest_1.expect)(mockWindow.restore).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)("should handle null window gracefully", () => {
            (0, vitest_1.expect)(() => (0, tray_1.showWindow)(null)).not.toThrow();
        });
    });
    (0, vitest_1.describe)("hideWindow", () => {
        (0, vitest_1.beforeEach)(() => {
            (0, tray_1.createTray)(mockWindow);
        });
        (0, vitest_1.it)("should hide the window", () => {
            (0, tray_1.hideWindow)(mockWindow);
            (0, vitest_1.expect)(mockWindow.hide).toHaveBeenCalled();
        });
        (0, vitest_1.it)("should handle null window gracefully", () => {
            (0, vitest_1.expect)(() => (0, tray_1.hideWindow)(null)).not.toThrow();
        });
    });
    (0, vitest_1.describe)("minimizeToTray", () => {
        (0, vitest_1.beforeEach)(() => {
            (0, tray_1.createTray)(mockWindow);
        });
        (0, vitest_1.it)("should hide the window (equivalent to minimizeToTray)", () => {
            (0, tray_1.minimizeToTray)(mockWindow);
            (0, vitest_1.expect)(mockWindow.hide).toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)("quitApplication", () => {
        (0, vitest_1.beforeEach)(() => {
            (0, tray_1.createTray)(mockWindow);
        });
        (0, vitest_1.it)("should call app.quit()", () => {
            (0, tray_1.quitApplication)();
            (0, vitest_1.expect)(electron_1.app.quit).toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)("destroyTray", () => {
        (0, vitest_1.beforeEach)(() => {
            (0, tray_1.createTray)(mockWindow);
        });
        (0, vitest_1.it)("should destroy the tray instance", () => {
            const trayInstance = (0, tray_1.getTray)();
            trayInstance.destroy = vitest_1.vi.fn();
            (0, tray_1.destroyTray)();
            (0, vitest_1.expect)(trayInstance.destroy).toHaveBeenCalled();
            (0, vitest_1.expect)((0, tray_1.hasTray)()).toBe(false);
        });
        (0, vitest_1.it)("should handle destroy when tray is null", () => {
            (0, tray_1.destroyTray)();
            (0, tray_1.destroyTray)(); // Should not throw
            (0, vitest_1.expect)((0, tray_1.hasTray)()).toBe(false);
        });
    });
    (0, vitest_1.describe)("hasTray", () => {
        (0, vitest_1.it)("should return false when tray doesn't exist", () => {
            (0, vitest_1.expect)((0, tray_1.hasTray)()).toBe(false);
        });
        (0, vitest_1.it)("should return true when tray exists", () => {
            (0, tray_1.createTray)(mockWindow);
            (0, vitest_1.expect)((0, tray_1.hasTray)()).toBe(true);
        });
    });
    (0, vitest_1.describe)("getTray", () => {
        (0, vitest_1.it)("should return null when tray doesn't exist", () => {
            (0, vitest_1.expect)((0, tray_1.getTray)()).toBeNull();
        });
        (0, vitest_1.it)("should return tray instance when tray exists", () => {
            (0, tray_1.createTray)(mockWindow);
            (0, vitest_1.expect)((0, tray_1.getTray)()).not.toBeNull();
        });
    });
    (0, vitest_1.describe)("Context Menu Callbacks", () => {
        (0, vitest_1.it)("Show button should call showWindow", () => {
            let showCallback = null;
            const mockTray = {
                on: vitest_1.vi.fn(),
                setToolTip: vitest_1.vi.fn(),
                setContextMenu: vitest_1.vi.fn(),
                destroy: vitest_1.vi.fn()
            };
            electron_1.Tray.mockImplementation(() => mockTray);
            electron_1.Menu.buildFromTemplate.mockImplementation((template) => {
                showCallback = template[0].click;
                return { popup: vitest_1.vi.fn() };
            });
            (0, tray_1.createTray)(mockWindow);
            if (showCallback) {
                showCallback();
            }
            (0, vitest_1.expect)(mockWindow.show).toHaveBeenCalled();
            (0, vitest_1.expect)(mockWindow.focus).toHaveBeenCalled();
        });
        (0, vitest_1.it)("Hide button should call hideWindow", () => {
            let hideCallback = null;
            const mockTray = {
                on: vitest_1.vi.fn(),
                setToolTip: vitest_1.vi.fn(),
                setContextMenu: vitest_1.vi.fn(),
                destroy: vitest_1.vi.fn()
            };
            electron_1.Tray.mockImplementation(() => mockTray);
            electron_1.Menu.buildFromTemplate.mockImplementation((template) => {
                hideCallback = template[1].click;
                return { popup: vitest_1.vi.fn() };
            });
            (0, tray_1.createTray)(mockWindow);
            mockWindow.hide.mockClear(); // Clear any calls from setup
            if (hideCallback) {
                hideCallback();
            }
            (0, vitest_1.expect)(mockWindow.hide).toHaveBeenCalled();
        });
        (0, vitest_1.it)("Quit button should call quitApplication", () => {
            let quitCallback = null;
            const mockTray = {
                on: vitest_1.vi.fn(),
                setToolTip: vitest_1.vi.fn(),
                setContextMenu: vitest_1.vi.fn(),
                destroy: vitest_1.vi.fn()
            };
            electron_1.Tray.mockImplementation(() => mockTray);
            electron_1.Menu.buildFromTemplate.mockImplementation((template) => {
                quitCallback = template[3].click;
                return { popup: vitest_1.vi.fn() };
            });
            (0, tray_1.createTray)(mockWindow);
            if (quitCallback) {
                quitCallback();
            }
            (0, vitest_1.expect)(electron_1.app.quit).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=tray.test.js.map