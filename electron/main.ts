import { app, BrowserWindow, Menu } from "electron";
import * as path from "path";
import { registerIpcHandlers } from "./ipc/handlers";
import { createTray, destroyTray, showWindow, hideWindow, hasTray } from "./tray";
import { SchedulerBackgroundLoop } from "./schedulerBackground";
import { NativeSchedulerService } from "./services/nativeSchedulerService";
import { NativeSettingsService } from "./services/nativeSettingsService";
import { NativeDownloadService } from "./services/nativeDownloadService";
import { NativeNotificationService } from "./services/nativeNotificationService";

let mainWindow: BrowserWindow | null = null;
const sharedSchedulerService = new NativeSchedulerService();
let nativeDownloadService: NativeDownloadService | null = null;
let nativeNotificationService: NativeNotificationService | null = null;
let schedulerLoop: SchedulerBackgroundLoop | null = null;
let minimizeToTrayEnabled = false;
const settingsService = new NativeSettingsService();

const appIconPath = process.resourcesPath && process.defaultApp !== true
  ? path.join(process.resourcesPath, "app.asar", "icon.png")
  : path.resolve(__dirname, "../../icon.png");

// Set the Windows toast identity before any window or notification service is created.
app.setName("Remon Download");
if (process.platform === "win32") {
  app.setAppUserModelId("com.remon.download");
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
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
    const settingsService = new NativeSettingsService();

    void settingsService.initialize();
    void sharedSchedulerService.initialize();

    schedulerLoop = new SchedulerBackgroundLoop({
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
            role: "cut" as const,
            enabled: params.editFlags.canCut
          },
          {
            label: "Copy",
            role: "copy" as const,
            enabled: params.editFlags.canCopy
          },
          {
            label: "Paste",
            role: "paste" as const,
            enabled: params.editFlags.canPaste
          },
          {
            label: "Select All",
            role: "selectAll" as const
          }
        ]
        : []),

      ...(!params.isEditable && params.selectionText
        ? [{ label: "Copy", role: "copy" as const }]
        : []),

      ...(!params.isEditable && !params.selectionText
        ? [
          {
            label: "Paste",
            role: "paste" as const,
            enabled: params.isEditable
          }
        ]
        : [])
    ];

    if (template.length === 0) {
      return;
    }

    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: mainWindow });
  });

  registerIpcHandlers({
    schedulerService: sharedSchedulerService,
    onDownloadServiceReady: (service) => {
      nativeDownloadService = service;
    },
    onNotificationServiceReady: (service) => {
      nativeNotificationService = service;
    },
    onMinimizeToTrayChanged: (enabled, window) => {
      minimizeToTrayEnabled = enabled;
      if (enabled && !hasTray()) {
        createTray(window);
      } else if (!enabled && hasTray()) {
        destroyTray();
      }
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl);
  } else {
    void mainWindow.loadFile(
      path.join(__dirname, "../../dist/index.html")
    );
  }

  mainWindow.on("minimize", (event) => {
    if (mainWindow && minimizeToTrayEnabled) {
      if (typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      hideWindow(mainWindow);
      console.log("[Main] Window minimize intercepted, hiding to tray");
    }
  });

  // Handle close: hide to tray instead of closing
  // This prevents the entire application from closing when user clicks X
  mainWindow.on("close", (event) => {
    if (mainWindow && minimizeToTrayEnabled) {
      event.preventDefault();
      hideWindow(mainWindow);
      console.log("[Main] Window close intercepted, hiding to tray");
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  app.setAppUserModelId("com.remon.download");
  const settings = await settingsService.get();
  minimizeToTrayEnabled = settings.minimizeToTray;

  createWindow();

  // Create system tray after window is created
  if (mainWindow && minimizeToTrayEnabled) {
    createTray(mainWindow);
  }

  app.on("activate", () => {
    if (mainWindow === null) {
      createWindow();

      if (mainWindow) {
        createTray(mainWindow);
      }
    } else {
      // If mainWindow exists but is hidden, show it
      showWindow(mainWindow);
    }
  });
});

// Handle the event when user tries to close all windows
app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && !minimizeToTrayEnabled) {
    app.quit();
  } else if (process.platform !== "darwin") {
    console.log(
      "[Main] All windows closed, but app continues running (tray still active)"
    );
  }
});

// Clean up tray before quitting
app.on("before-quit", () => {
  console.log("[Main] App is quitting, destroying tray...");

  if (schedulerLoop) {
    schedulerLoop.stop();
    schedulerLoop = null;
  }

  destroyTray();
});