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
const appIconPath = path.resolve(__dirname, "../../icon.png");
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 600,
        minWidth: 900,
        minHeight: 500,
        title: "Remon Download",
        icon: appIconPath,
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
        }
    });
    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    if (devServerUrl) {
        void mainWindow.loadURL(devServerUrl);
    }
    else {
        void mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
    }
    // Handle close: hide to tray instead of closing
    // This prevents the entire application from closing when user clicks X
    mainWindow.on("close", (event) => {
        if (mainWindow) {
            event.preventDefault();
            (0, tray_1.hideWindow)(mainWindow);
            console.log("[Main] Window close intercepted, hiding to tray");
        }
    });
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}
electron_1.app.whenReady().then(() => {
    electron_1.app.setAppUserModelId("com.remon.download");
    createWindow();
    // Create system tray after window is created
    if (mainWindow) {
        (0, tray_1.createTray)(mainWindow);
    }
    electron_1.app.on("activate", () => {
        if (mainWindow === null) {
            createWindow();
            if (mainWindow) {
                (0, tray_1.createTray)(mainWindow);
            }
        }
        else {
            // If mainWindow exists but is hidden, show it
            (0, tray_1.showWindow)(mainWindow);
        }
    });
});
// Handle the event when user tries to close all windows
electron_1.app.on("window-all-closed", () => {
    // On Windows, don't quit the app when all windows are closed
    // because the tray is still active and the app is still working
    // Only quit when user explicitly selects Quit from the tray menu
    if (process.platform !== "darwin") {
        console.log("[Main] All windows closed, but app continues running (tray still active)");
    }
});
// Clean up tray before quitting
electron_1.app.on("before-quit", () => {
    console.log("[Main] App is quitting, destroying tray...");
    if (schedulerLoop) {
        schedulerLoop.stop();
        schedulerLoop = null;
    }
    (0, tray_1.destroyTray)();
});
//# sourceMappingURL=main.js.map