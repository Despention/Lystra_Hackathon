"use strict";
const electron = require("electron");
const node_url = require("node:url");
const path = require("node:path");
const fs = require("node:fs");
var _documentCurrentScript = typeof document !== "undefined" ? document.currentScript : null;
const __dirname$1 = path.dirname(node_url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("main.js", document.baseURI).href));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const DIST = path.join(process.env.APP_ROOT, "dist");
const DIST_ELECTRON = path.join(process.env.APP_ROOT, "dist-electron");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : DIST;
let mainWindow = null;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    title: "TZ Analyzer",
    icon: path.join(process.env.VITE_PUBLIC, "icon.png"),
    webPreferences: {
      preload: path.join(DIST_ELECTRON, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  const menuTemplate = [
    {
      label: "File",
      submenu: [
        {
          label: "Open File...",
          accelerator: "CmdOrCtrl+O",
          click: async () => {
            const result = await electron.dialog.showOpenDialog(mainWindow, {
              properties: ["openFile"],
              filters: [
                { name: "Documents", extensions: ["pdf", "docx", "txt"] },
                { name: "PDF", extensions: ["pdf"] },
                { name: "Word", extensions: ["docx"] },
                { name: "Text", extensions: ["txt"] },
                { name: "All Files", extensions: ["*"] }
              ]
            });
            if (!result.canceled && result.filePaths.length > 0) {
              const filePath = result.filePaths[0];
              const content = fs.readFileSync(filePath);
              mainWindow == null ? void 0 : mainWindow.webContents.send("file-opened", {
                path: filePath,
                name: path.basename(filePath),
                content: content.toString("base64")
              });
            }
          }
        },
        { type: "separator" },
        {
          label: "Quit",
          accelerator: "CmdOrCtrl+Q",
          click: () => electron.app.quit()
        }
      ]
    },
    {
      label: "View",
      submenu: [
        {
          label: "Reload",
          accelerator: "CmdOrCtrl+R",
          click: () => mainWindow == null ? void 0 : mainWindow.webContents.reload()
        },
        {
          label: "Toggle Developer Tools",
          accelerator: "CmdOrCtrl+Shift+I",
          click: () => mainWindow == null ? void 0 : mainWindow.webContents.toggleDevTools()
        },
        { type: "separator" },
        {
          label: "Zoom In",
          accelerator: "CmdOrCtrl+=",
          click: () => {
            const currentZoom = (mainWindow == null ? void 0 : mainWindow.webContents.getZoomFactor()) ?? 1;
            mainWindow == null ? void 0 : mainWindow.webContents.setZoomFactor(currentZoom + 0.1);
          }
        },
        {
          label: "Zoom Out",
          accelerator: "CmdOrCtrl+-",
          click: () => {
            const currentZoom = (mainWindow == null ? void 0 : mainWindow.webContents.getZoomFactor()) ?? 1;
            mainWindow == null ? void 0 : mainWindow.webContents.setZoomFactor(Math.max(0.3, currentZoom - 0.1));
          }
        },
        {
          label: "Reset Zoom",
          accelerator: "CmdOrCtrl+0",
          click: () => mainWindow == null ? void 0 : mainWindow.webContents.setZoomFactor(1)
        }
      ]
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About TZ Analyzer",
          click: () => {
            electron.dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "About TZ Analyzer",
              message: "TZ Analyzer v0.1.0",
              detail: "AI-powered technical specification analyzer.\n\nBuilt with Electron + React."
            });
          }
        }
      ]
    }
  ];
  const menu = electron.Menu.buildFromTemplate(menuTemplate);
  electron.Menu.setApplicationMenu(menu);
  electron.ipcMain.handle("open-file-dialog", async () => {
    const result = await electron.dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [
        { name: "Documents", extensions: ["pdf", "docx", "txt"] },
        { name: "PDF", extensions: ["pdf"] },
        { name: "Word", extensions: ["docx"] },
        { name: "Text", extensions: ["txt"] },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath);
    return {
      path: filePath,
      name: path.basename(filePath),
      content
    };
  });
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(DIST, "index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
    mainWindow = null;
  }
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
electron.app.whenReady().then(createWindow);
