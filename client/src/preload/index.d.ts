import { ElectronAPI } from '@electron-toolkit/preload'
import { Torrent } from '@renderer/components/Dashboard/Dashboard'
import { OpenFileResult } from 'src/types/types'

interface TorrentOptions {
  downloadLocation?: string
  folderName?: string
  selectedFiles?: string[]
}

interface TorrentInfo {
  name: string
  totalSize: number
  files: { path: string; size: number }[]
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      openFileDialog: () => Promise<OpenFileResult>
      openDirectoryDialog: () => Promise<{ canceled: boolean; path?: string }>
      getTorrentInfo: (torrentPath: string) => Promise<TorrentInfo | null>
      startDownload: (
        torrentPath: string,
        options?: TorrentOptions
      ) => Promise<{ id: string; name: string }>
      pauseDownload: (torrentId: string) => Promise<void>
      resumeDownload: (torrentId: string) => Promise<void>
      deleteTorrent: (torrentId: string, deleteData?: boolean) => Promise<void>
      getTorrentList: () => Promise<Torrent[]>
      getSettings: () => Promise<{ saveLocation: string; sidebarWidth: number }>
      saveSettings: (settings: Record<string, unknown>) => Promise<{ saveLocation: string; sidebarWidth: number }>
      onTorrentCompleted: (callback: (data: { id: string; name: string }) => void) => () => void
    }
  }
}
