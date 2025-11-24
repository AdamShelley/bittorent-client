import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      openFile: () => void
      openFloatingWindow: () => void
      onFloatingData: () => void
    }
  }
}
