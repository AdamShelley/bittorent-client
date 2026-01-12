import { BrowserWindow } from 'electron'
import { Coordinator } from '../coordinator/Coordinator'

export class ProgressManager {
  activeCoordinator
  win: BrowserWindow | null = null

  constructor(coordinator: Coordinator) {
    this.activeCoordinator = coordinator

    setInterval(() => {
      this.emitCompletedPercent()
    }, 1000)
  }

  attachWindow(win: BrowserWindow) {
    this.win = win
  }

  emitCompletedPercent() {
    if (!this.win || this.win.isDestroyed()) return
    const infoHashHex = this.activeCoordinator.infoHash?.toString('hex')

    this.win.webContents.send('torrent:progress', {
      id: infoHashHex,
      name: this.activeCoordinator.torrent.name.toString(),
      size: this.activeCoordinator.totalFileSize,
      downloaded: this.activeCoordinator.bytesDownloaded,
      progress: this.activeCoordinator.progress
      //   dl_speed: this.activeCoordinator.downloadSpeed,
      //   ul_speed: this.activeCoordinator.uploadSpeed
    })
  }
}
