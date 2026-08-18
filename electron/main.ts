import { app, BrowserWindow, Menu } from "electron";
import * as path from "path";
import { registerIpcHandlers } from "./ipc/handlers";
import { createTray, destroyTray, showWindow, hideWindow, minimizeToTray } from "./tray";

let mainWindow: BrowserWindow | null = null;

const appIconPath = path.resolve(__dirname, "../../icon.png");

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

  mainWindow.setMenuBarVisibility(false);
  mainWindow.setAutoHideMenuBar(true);

  mainWindow.webContents.on("context-menu", (_event, params) => {
    if (!mainWindow) {
      return;
    }

    const template = [
      ...(params.isEditable
        ? [
          { label: "Cut", role: "cut" as const, enabled: params.editFlags.canCut },
          { label: "Copy", role: "copy" as const, enabled: params.editFlags.canCopy },
          { label: "Paste", role: "paste" as const, enabled: params.editFlags.canPaste },
          { label: "Select All", role: "selectAll" as const }
        ]
        : []),
      ...(!params.isEditable && params.selectionText
        ? [{ label: "Copy", role: "copy" as const }]
        : []),
      ...(!params.isEditable && !params.selectionText
        ? [{ label: "Paste", role: "paste" as const, enabled: params.isEditable }]
        : [])
    ];

    if (template.length === 0) {
      return;
    }

    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: mainWindow });
  });

  registerIpcHandlers();

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl);
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // Handle minimize: minimize to tray
  mainWindow.on("minimize", () => {
    if (mainWindow) {
      minimizeToTray(mainWindow);
    }
  });

  // Handle close: hide to tray instead of closing
  // This prevents the entire application from closing when user clicks X
  mainWindow.on("close", (event) => {
    if (mainWindow) {
      event.preventDefault();
      hideWindow(mainWindow);
      console.log("[Main] Window close intercepted, hiding to tray");
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  app.setAppUserModelId("com.remon.download");
  createWindow();

  // Create system tray after window is created
  if (mainWindow) {
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
  // On Windows, don't quit the app when all windows are closed
  // because the tray is still active and the app is still working
  // Only quit when user explicitly selects Quit from the tray menu
  if (process.platform !== "darwin") {
    console.log("[Main] All windows closed, but app continues running (tray still active)");
  }
});

// Clean up tray before quitting
app.on("before-quit", () => {
  console.log("[Main] App is quitting, destroying tray...");
  destroyTray();
});
