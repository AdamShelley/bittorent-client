import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { OpenFileResult } from '../types/types'

// Custom APIs for renderer
const api = {
  openFileDialog: (): Promise<OpenFileResult> => ipcRenderer.invoke('open-file'),
  openDirectoryDialog: (): Promise<{ canceled: boolean; path?: string }> =>
    ipcRenderer.invoke('open-directory'),
  startDownload: (torrentPath: string) => ipcRenderer.invoke('start-download', torrentPath),
  pauseDownload: (torrentId: string): Promise<void> =>
    ipcRenderer.invoke('pause-download', torrentId),
  resumeDownload: (torrentId: string): Promise<void> =>
    ipcRenderer.invoke('resume-download', torrentId),
  deleteTorrent: (torrentId: string): Promise<void> =>
    ipcRenderer.invoke('delete-torrent', torrentId),
  getTorrentList: (): Promise<any[]> => ipcRenderer.invoke('list-torrents'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: Record<string, unknown>) => ipcRenderer.invoke('save-settings', settings)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
