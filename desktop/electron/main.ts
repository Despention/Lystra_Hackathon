import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
const DIST = path.join(process.env.APP_ROOT, 'dist')
const DIST_ELECTRON = path.join(process.env.APP_ROOT, 'dist-electron')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : DIST

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'TZ Analyzer',
    icon: path.join(process.env.VITE_PUBLIC!, 'icon.png'),
    webPreferences: {
      preload: path.join(DIST_ELECTRON, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Build the application menu
  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open File...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow!, {
              properties: ['openFile'],
              filters: [
                { name: 'Documents', extensions: ['pdf', 'docx', 'txt'] },
                { name: 'PDF', extensions: ['pdf'] },
                { name: 'Word', extensions: ['docx'] },
                { name: 'Text', extensions: ['txt'] },
                { name: 'All Files', extensions: ['*'] },
              ],
            })
            if (!result.canceled && result.filePaths.length > 0) {
              const filePath = result.filePaths[0]
              const content = fs.readFileSync(filePath)
              mainWindow?.webContents.send('file-opened', {
                path: filePath,
                name: path.basename(filePath),
                content: content.toString('base64'),
              })
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow?.webContents.reload(),
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => mainWindow?.webContents.toggleDevTools(),
        },
        { type: 'separator' },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: () => {
            const currentZoom = mainWindow?.webContents.getZoomFactor() ?? 1
            mainWindow?.webContents.setZoomFactor(currentZoom + 0.1)
          },
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            const currentZoom = mainWindow?.webContents.getZoomFactor() ?? 1
            mainWindow?.webContents.setZoomFactor(Math.max(0.3, currentZoom - 0.1))
          },
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => mainWindow?.webContents.setZoomFactor(1),
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About TZ Analyzer',
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'About TZ Analyzer',
              message: 'TZ Analyzer v0.1.0',
              detail: 'AI-powered technical specification analyzer.\n\nBuilt with Electron + React.',
            })
          },
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(menuTemplate)
  Menu.setApplicationMenu(menu)

  // IPC handler for opening file dialog from renderer
  ipcMain.handle('open-file-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: [
        { name: 'Documents', extensions: ['pdf', 'docx', 'txt'] },
        { name: 'PDF', extensions: ['pdf'] },
        { name: 'Word', extensions: ['docx'] },
        { name: 'Text', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const filePath = result.filePaths[0]
    const content = fs.readFileSync(filePath)

    return {
      path: filePath,
      name: path.basename(filePath),
      content: content,
    }
  })

  // Load the app
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(DIST, 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    mainWindow = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)
