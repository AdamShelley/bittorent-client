import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { OpenFileResult } from '../types/types'

interface TorrentOptions {
  downloadLocation?: string
  folderName?: string
}

interface TorrentInfo {
  name: string
  totalSize: number
  files: { path: string; size: number }[]
}

// Custom APIs for renderer
const api = {
  openFileDialog: (): Promise<OpenFileResult> => ipcRenderer.invoke('open-file'),
  openDirectoryDialog: (): Promise<{ canceled: boolean; path?: string }> =>
    ipcRenderer.invoke('open-directory'),
  getTorrentInfo: (torrentPath: string): Promise<TorrentInfo | null> =>
    ipcRenderer.invoke('get-torrent-info', torrentPath),
  startDownload: (torrentPath: string, options?: TorrentOptions) =>
    ipcRenderer.invoke('start-download', torrentPath, options),
  pauseDownload: (torrentId: string): Promise<void> =>
    ipcRenderer.invoke('pause-download', torrentId),
  resumeDownload: (torrentId: string): Promise<void> =>
    ipcRenderer.invoke('resume-download', torrentId),
  deleteTorrent: (torrentId: string, deleteData?: boolean): Promise<void> =>
    ipcRenderer.invoke('delete-torrent', torrentId, deleteData ?? false),
  getTorrentList: (): Promise<any[]> => ipcRenderer.invoke('list-torrents'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: Record<string, unknown>) =>
    ipcRenderer.invoke('save-settings', settings),
  onTorrentCompleted: (callback: (data: { id: string; name: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { id: string; name: string }) =>
      callback(data)
    ipcRenderer.on('torrent-completed', handler)
    return () => ipcRenderer.removeListener('torrent-completed', handler)
  }
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
