import { ElectronAPI } from '@electron-toolkit/preload'
import { OpenFileResult } from 'src/types/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      openFileDialog: () => Promise<OpenFileResult>
      startDownload: (torrentPath: string) => Promise<void>
    }
  }
}
