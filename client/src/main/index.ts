import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import fs from 'fs'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { OpenFileResult } from '../types/types'
import { registerTorrentIpc } from './ipc/torrent.ipc'
import { torrentManager } from './torrent/Electron-entry/TorrentManager'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    transparent: true,
    // macOS vibrancy effect for blur
    ...(process.platform === 'darwin' ? { vibrancy: 'under-window' } : {}),
    // expose window controls in Windows/Linux
    ...(process.platform !== 'darwin' ? { titleBarOverlay: true } : {}),
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      devTools: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()
  registerTorrentIpc()

  // Restore persisted torrents on app startup
  await torrentManager.restorePersistedTorrents()

  ipcMain.handle('open-file', async (): Promise<OpenFileResult> => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile']
    })

    if (canceled || filePaths.length === 0) {
      return { canceled: true }
    }

    const filePath = filePaths[0]

    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      return { canceled: false, filePath, content }
    } catch (err) {
      return { canceled: false, filePath, content: `Error reading file: ${err}` }
    }
  })

  ipcMain.handle('open-directory', async (): Promise<{ canceled: boolean; path?: string }> => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })

    if (canceled || filePaths.length === 0) {
      return { canceled: true }
    }

    return { canceled: false, path: filePaths[0] }
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Pause all torrents before quitting
app.on('before-quit', () => {
  console.log('App closing: pausing all active torrents...')
  torrentManager.pauseAllTorrents()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
