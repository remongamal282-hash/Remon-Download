import { app, BrowserWindow, Menu } from "electron";
import * as path from "path";
import { registerIpcHandlers } from "./ipc/handlers";

let mainWindow: BrowserWindow | null = null;

const appIconPath = path.resolve(__dirname, "../../icon.png");

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1024,
    minHeight: 600,
    title: "Remon Download",
    icon: appIconPath,
    autoHideMenuBar: true,
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 18, y: 18 },
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

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  app.setAppUserModelId("com.remon.download");
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
