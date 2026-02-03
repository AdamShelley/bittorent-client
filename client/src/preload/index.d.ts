import { ElectronAPI } from '@electron-toolkit/preload'
import { Torrent } from '@renderer/components/Dashboard/Dashboard'
import { OpenFileResult } from 'src/types/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      openFileDialog: () => Promise<OpenFileResult>
      startDownload: (torrentPath: string) => Promise<{ id: string; name: string }>
      pauseDownload: (torrentId: string) => Promise<void>
      resumeDownload: (torrentId: string) => Promise<void>
      deleteTorrent: (torrentId: string, deleteData?: boolean) => Promise<void>
      getTorrentList: () => Promise<Torrent[]>
      openDirectoryDialog: () => Promise<{ canceled: boolean; path?: string }>
      getSettings: () => Promise<{ saveLocation: string }>
      saveSettings: (settings: Record<string, unknown>) => Promise<{ saveLocation: string }>
      onTorrentCompleted: (callback: (data: { id: string; name: string }) => void) => () => void
    }
  }
}
