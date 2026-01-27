import crypto from 'crypto'
import { StartTorrent } from './StartTorrent'
import { torrentStateManager } from './TorrentState'

class TorrentManager {
  private torrents = new Map<string, StartTorrent>()

  async startTorrent(
    torrentPath: string
  ): Promise<{ id: string; torrentPath: string; downloadLocation: string; name: string }> {
    const torrent = new StartTorrent(torrentPath, '/downloads')
    await torrent.start()

    const id = crypto.randomUUID()
    this.torrents.set(id, torrent)

    const name = torrent.getTorrentName()

    // Persist torrent state
    torrentStateManager.addTorrent(id, torrentPath, torrent.downloadLocation ?? './', name)
    torrentStateManager.updateTorrentStatus(id, 'downloading')

    return {
      id,
      torrentPath,
      downloadLocation: torrent.downloadLocation ?? './',
      name
    }
  }

  pauseTorrent(id: string): void {
    this.torrents.get(id)?.pause()
    torrentStateManager.updateTorrentStatus(id, 'paused')
  }

  listTorrents(): {
    id: string
    path: string | null
    name: string
    status: string | null
    speed: string
    percent: number
  }[] {
    const result = [...this.torrents.entries()].map(([id, torrent]) => ({
      id,
      path: torrent.torrentPath,
      name: torrent.getTorrentName(),
      status: torrent.getStatus(),
      speed: torrent.getDownloadSpeed(),
      percent: torrent.getTorrentPercent()
    }))

    console.log('Listing torrents:', result)
    return result
  }

  async resumeTorrent(id: string): Promise<void> {
    console.log('Resuming ', id)
    await this.torrents.get(id)?.resumeTorrent()
    torrentStateManager.updateTorrentStatus(id, 'downloading')
  }

  removeTorrent(id: string): void {
    const torrent = this.torrents.get(id)
    if (torrent) {
      torrent.pause()
    }
    this.torrents.delete(id)
    torrentStateManager.removeTorrent(id)
    console.log(`Deleted torrent: ${id}`)
  }

  // Restore torrents from saved state
  async restorePersistedTorrents(): Promise<void> {
    const savedTorrents = torrentStateManager.getAllTorrents()

    for (const savedTorrent of savedTorrents) {
      try {
        console.log(
          `Restoring torrent: ${savedTorrent.torrentPath} (Status: ${savedTorrent.status})`
        )

        const torrent = new StartTorrent(savedTorrent.torrentPath, savedTorrent.downloadLocation)
        await torrent.start()

        this.torrents.set(savedTorrent.id, torrent)

        // Restore pause state
        if (savedTorrent.status === 'paused') {
          torrent.pause()
        }
      } catch (err) {
        console.error(`Failed to restore torrent ${savedTorrent.id}:`, err)
      }
    }
  }

  // Call this when app is about to quit
  pauseAllTorrents(): void {
    this.torrents.forEach((torrent, id) => {
      torrent.pause()
      torrentStateManager.updateTorrentStatus(id, 'paused')
    })
  }
}

export const torrentManager = new TorrentManager()
