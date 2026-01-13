import { BrowserWindow } from 'electron'
import { Coordinator } from '../coordinator/Coordinator'
import { torrentRegistry } from '../../../main/torrent-store'

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

    const id = this.activeCoordinator.infoHash.toString('hex')

    torrentRegistry.update(id, {
      downloadedBytes: this.activeCoordinator.bytesDownloaded
    })

    this.win.webContents.send('torrent:progress', {
      id,
      progress: this.activeCoordinator.progress
    })
  }
}
