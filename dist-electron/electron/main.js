"use strict";
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
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const handlers_1 = require("./ipc/handlers");
const tray_1 = require("./tray");
const schedulerBackground_1 = require("./schedulerBackground");
const nativeSchedulerService_1 = require("./services/nativeSchedulerService");
const nativeSettingsService_1 = require("./services/nativeSettingsService");
let mainWindow = null;
const sharedSchedulerService = new nativeSchedulerService_1.NativeSchedulerService();
let nativeDownloadService = null;
let nativeNotificationService = null;
let schedulerLoop = null;
let minimizeToTrayEnabled = false;
let isQuitting = false;
const settingsService = new nativeSettingsService_1.NativeSettingsService();
function ensureTray(window) {
    if (!window) {
        return false;
    }
    if ((0, tray_1.hasTray)()) {
        return true;
    }
    try {
        (0, tray_1.createTray)(window);
        return true;
    }
    catch (error) {
        console.error("[Main] Could not create system tray:", error);
        return false;
    }
}
function hideToTray(window, event) {
    if (!window || !ensureTray(window)) {
        console.error("[Main] Tray is unavailable; keeping the window visible");
        return false;
    }
    event?.preventDefault?.();
    (0, tray_1.hideWindow)(window);
    return true;
}
function minimizeWindow(window) {
    if (!window) {
        return;
    }
    if (minimizeToTrayEnabled) {
        hideToTray(window);
        return;
    }
    window.minimize();
}
function getAppIcon() {
    const appPath = typeof electron_1.app.getAppPath === "function" ? electron_1.app.getAppPath() : process.cwd();
    const candidates = [
        path.join(appPath, "icon.ico"),
        path.join(appPath, "icon.png"),
        path.join(process.cwd(), "icon.ico"),
        path.join(process.cwd(), "icon.png")
    ];
    if (process.resourcesPath && process.defaultApp !== true) {
        candidates.push(path.join(process.resourcesPath, "app.asar", "icon.ico"), path.join(process.resourcesPath, "app.asar", "icon.png"), path.join(process.resourcesPath, "icon.ico"), path.join(process.resourcesPath, "icon.png"));
    }
    for (const candidate of candidates) {
        try {
            if (fs.existsSync(candidate)) {
                const img = electron_1.nativeImage.createFromPath(candidate);
                if (!img.isEmpty()) {
                    return img;
                }
            }
        }
        catch {
            // try next
        }
    }
    return path.join(appPath, "icon.png");
}
// Set the Windows toast identity before any window or notification service is created.
if (typeof electron_1.app.setName === "function") {
    electron_1.app.setName("Remon Download");
}
if (process.platform === "win32" && typeof electron_1.app.setAppUserModelId === "function") {
    electron_1.app.setAppUserModelId("com.remon.download");
}
function createWindow() {
    const windowIcon = getAppIcon();
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 600,
        minWidth: 900,
        minHeight: 500,
        title: "Remon Download",
        icon: windowIcon,
        autoHideMenuBar: true,
        titleBarStyle: "default",
        webPreferences: {
            preload: path.join(__dirname, "preload.cjs"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            webSecurity: true
        }
    });
    if (!schedulerLoop) {
        const settingsService = new nativeSettingsService_1.NativeSettingsService();
        void settingsService.initialize();
        void sharedSchedulerService.initialize();
        schedulerLoop = new schedulerBackground_1.SchedulerBackgroundLoop({
            schedulerService: sharedSchedulerService,
            getDownloadService: () => nativeDownloadService,
            getNotificationService: () => nativeNotificationService,
            logger: console
        });
        schedulerLoop.start();
    }
    mainWindow.setMenuBarVisibility(false);
    mainWindow.setAutoHideMenuBar(true);
    mainWindow.webContents.on("context-menu", (_event, params) => {
        if (!mainWindow) {
            return;
        }
        const template = [
            ...(params.isEditable
                ? [
                    {
                        label: "Cut",
                        role: "cut",
                        enabled: params.editFlags.canCut
                    },
                    {
                        label: "Copy",
                        role: "copy",
                        enabled: params.editFlags.canCopy
                    },
                    {
                        label: "Paste",
                        role: "paste",
                        enabled: params.editFlags.canPaste
                    },
                    {
                        label: "Select All",
                        role: "selectAll"
                    }
                ]
                : []),
            ...(!params.isEditable && params.selectionText
                ? [{ label: "Copy", role: "copy" }]
                : []),
            ...(!params.isEditable && !params.selectionText
                ? [
                    {
                        label: "Paste",
                        role: "paste",
                        enabled: params.isEditable
                    }
                ]
                : [])
        ];
        if (template.length === 0) {
            return;
        }
        const menu = electron_1.Menu.buildFromTemplate(template);
        menu.popup({ window: mainWindow });
    });
    (0, handlers_1.registerIpcHandlers)({
        schedulerService: sharedSchedulerService,
        onDownloadServiceReady: (service) => {
            nativeDownloadService = service;
        },
        onNotificationServiceReady: (service) => {
            nativeNotificationService = service;
        },
        onMinimizeToTrayChanged: (enabled, window) => {
            minimizeToTrayEnabled = enabled;
            const targetWindow = window ?? mainWindow ?? electron_1.BrowserWindow.getAllWindows()[0] ?? null;
            if (enabled) {
                ensureTray(targetWindow);
            }
            else {
                (0, tray_1.destroyTray)();
                targetWindow.setSkipTaskbar(false);
            }
        },
        onWindowMinimize: (window) => {
            minimizeWindow(window);
        }
    });
    electron_1.app.on("browser-window-created", (_, createdWindow) => {
        createdWindow.on("minimize", (event) => {
            if (minimizeToTrayEnabled) {
                if (hideToTray(createdWindow, event)) {
                    console.log("[Main] Window minimize intercepted, hiding to tray");
                }
            }
        });
        createdWindow.on("restore", () => {
            createdWindow.setSkipTaskbar(false);
        });
    });
    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    if (devServerUrl) {
        void mainWindow.loadURL(devServerUrl);
    }
    else {
        void mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
    }
    mainWindow.on("minimize", (event) => {
        if (mainWindow && minimizeToTrayEnabled) {
            if (hideToTray(mainWindow, event)) {
                console.log("[Main] Window minimize intercepted, hiding to tray");
            }
        }
    });
    mainWindow.on("restore", () => {
        if (mainWindow) {
            mainWindow.setSkipTaskbar(false);
        }
    });
    mainWindow.on("show", () => {
        if (mainWindow) {
            mainWindow.setSkipTaskbar(false);
        }
    });
    // Handle close: hide to tray instead of closing
    // This prevents the entire application from closing when user clicks X
    mainWindow.on("close", (event) => {
        if (mainWindow && minimizeToTrayEnabled && !isQuitting) {
            if (hideToTray(mainWindow, event)) {
                console.log("[Main] Window close intercepted, hiding to tray");
            }
        }
    });
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}
electron_1.app.whenReady().then(async () => {
    electron_1.app.setAppUserModelId("com.remon.download");
    electron_1.app.setName("Remon Download");
    await settingsService.initialize();
    const settings = await settingsService.get();
    minimizeToTrayEnabled = settings.minimizeToTray;
    createWindow();
    // Create a tray entry only when the user enabled minimize-to-tray.
    if (mainWindow && minimizeToTrayEnabled) {
        ensureTray(mainWindow);
    }
    electron_1.app.on("activate", () => {
        if (mainWindow === null) {
            createWindow();
            if (mainWindow && minimizeToTrayEnabled) {
                ensureTray(mainWindow);
            }
        }
        else {
            // If mainWindow exists but is hidden, show it
            (0, tray_1.showWindow)(mainWindow);
        }
    });
    electron_1.globalShortcut.register("CommandOrControl+Shift+R", () => {
        if (mainWindow) {
            (0, tray_1.showWindow)(mainWindow);
        }
    });
});
// Handle the event when user tries to close all windows
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin" && !minimizeToTrayEnabled) {
        electron_1.app.quit();
    }
    else if (process.platform !== "darwin") {
        console.log("[Main] All windows closed, but app continues running (tray still active)");
    }
});
// Clean up tray before quitting
electron_1.app.on("before-quit", () => {
    isQuitting = true;
    console.log("[Main] App is quitting, destroying tray...");
    if (schedulerLoop) {
        schedulerLoop.stop();
        schedulerLoop = null;
    }
    (0, tray_1.destroyTray)();
    electron_1.globalShortcut.unregister("CommandOrControl+Shift+R");
});
//# sourceMappingURL=main.js.map