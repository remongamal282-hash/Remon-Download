"use strict";
/**
 * System Tray integration for Remon Download
 *
 * Manages:
 * - Tray icon creation
 * - Context menu (Show/Hide/Quit)
 * - Window visibility management
 * - Single Tray instance lifecycle
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTray = createTray;
exports.showWindow = showWindow;
exports.hideWindow = hideWindow;
exports.minimizeToTray = minimizeToTray;
exports.quitApplication = quitApplication;
exports.destroyTray = destroyTray;
exports.hasTray = hasTray;
exports.getTray = getTray;
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let tray = null;
function setSkipTaskbar(mainWindow, skip) {
    if (typeof mainWindow.setSkipTaskbar === "function") {
        mainWindow.setSkipTaskbar(skip);
    }
}
const getIconPath = () => {
    const appPath = typeof electron_1.app.getAppPath === "function"
        ? electron_1.app.getAppPath()
        : path.resolve(__dirname, "../..");
    const candidates = [
        path.join(appPath, "icon.ico"),
        path.join(appPath, "icon.png"),
        path.join(process.cwd(), "icon.ico"),
        path.join(process.cwd(), "icon.png")
    ];
    if (process.resourcesPath && process.defaultApp !== true) {
        candidates.push(path.join(process.resourcesPath, "app.asar", "icon.ico"), path.join(process.resourcesPath, "app.asar", "icon.png"), path.join(process.resourcesPath, "icon.ico"), path.join(process.resourcesPath, "icon.png"));
    }
    const iconPath = candidates.find((candidate) => fs.existsSync(candidate));
    return iconPath ?? candidates[0];
};
/**
 * Create the System Tray icon and context menu
 * Must be called after app.whenReady()
 */
function createTray(mainWindow) {
    if (tray) {
        console.warn("[Tray] Tray already exists, returning existing instance");
        return tray;
    }
    try {
        const iconPath = getIconPath();
        console.log(`[Tray] Loading icon from: ${iconPath}`);
        if (!fs.existsSync(iconPath)) {
            throw new Error(`Tray icon file does not exist: ${iconPath}`);
        }
        const sourceIcon = electron_1.nativeImage.createFromPath(iconPath);
        if (sourceIcon.isEmpty()) {
            throw new Error(`Tray icon could not be decoded: ${iconPath}`);
        }
        const icon = sourceIcon.resize({ width: 16, height: 16 });
        if (icon.isEmpty()) {
            throw new Error(`Tray icon could not be loaded: ${iconPath}`);
        }
        tray = new electron_1.Tray(icon);
        if (typeof tray.setImage === "function") {
            tray.setImage(icon);
        }
        console.log("[Tray] Icon ready");
        // Set the tooltip
        tray.setToolTip("Remon Download");
        // Create context menu
        const contextMenu = electron_1.Menu.buildFromTemplate([
            {
                label: "Show Remon Download",
                click: () => {
                    showWindow(mainWindow);
                }
            },
            {
                label: "Hide Remon Download",
                click: () => {
                    hideWindow(mainWindow);
                }
            },
            {
                type: "separator"
            },
            {
                label: "Quit Remon Download",
                click: () => {
                    quitApplication();
                }
            }
        ]);
        tray.setContextMenu(contextMenu);
        // Left click on tray icon: show and focus
        tray.on("click", () => {
            showWindow(mainWindow);
        });
        // Right click is handled by context menu automatically
        console.log("[Tray] System Tray created successfully");
        return tray;
    }
    catch (error) {
        console.error("[Tray] Failed to create tray:", error);
        throw error;
    }
}
/**
 * Show the main window and focus it
 */
function showWindow(mainWindow) {
    if (!mainWindow) {
        console.warn("[Tray] mainWindow is null, cannot show");
        return;
    }
    if (mainWindow.isMinimized()) {
        mainWindow.restore();
    }
    setSkipTaskbar(mainWindow, false);
    mainWindow.show();
    mainWindow.focus();
    console.log("[Tray] Window shown and focused");
}
/**
 * Hide the main window (without closing it)
 * Window remains in memory and processes continue
 */
function hideWindow(mainWindow) {
    if (!mainWindow) {
        console.warn("[Tray] mainWindow is null, cannot hide");
        return;
    }
    setSkipTaskbar(mainWindow, true);
    mainWindow.hide();
    console.log("[Tray] Window hidden");
}
/**
 * Minimize the window to tray (hide)
 * This is called when the minimize button is clicked
 */
function minimizeToTray(mainWindow) {
    hideWindow(mainWindow);
}
/**
 * Perform a complete application quit
 * This will close the window and exit the Electron app
 */
function quitApplication() {
    console.log("[Tray] Quitting application...");
    electron_1.app.quit();
}
/**
 * Destroy the Tray instance
 * Call this during app quit to clean up resources
 */
function destroyTray() {
    if (tray) {
        tray.destroy();
        tray = null;
        console.log("[Tray] Tray destroyed");
    }
}
/**
 * Check if Tray exists
 */
function hasTray() {
    return tray !== null;
}
/**
 * Get the current Tray instance (for testing purposes)
 */
function getTray() {
    return tray;
}
//# sourceMappingURL=tray.js.map