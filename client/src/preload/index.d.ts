import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      openFile: () => Promise<{ filePaths: string[]; canceled: boolean }>
      openDirectory: () => Promise<{ filePaths: string[]; canceled: boolean }>
      downloadFile: (torrentPath: string, downloadLocation: string) => Promise<unknown>
      onTorrentProgress: (cb: (data: { id: string; progress: number }) => void) => void
      removeTorrentProgressListener: () => void
    }
  }
}
