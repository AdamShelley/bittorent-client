import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Add functions you want available to React
const customApi = {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  downloadFile: (torrentPath: string, downloadLocation: string) =>
    ipcRenderer.invoke('download:start', { torrentPath, downloadLocation }),
  onTorrentProgress: (callback: (data: { id: string; progress: number }) => void) => {
    ipcRenderer.on('torrent:progress', (_, data) => callback(data))
  },
  removeTorrentProgressListener: () => {
    ipcRenderer.removeAllListeners('torrent:progress')
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', customApi)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
