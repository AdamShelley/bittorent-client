import crypto from 'crypto'
import { StartTorrent } from './StartTorrent'

class TorrentManager {
  private torrents = new Map<string, StartTorrent>()

  async startTorrent(
    torrentPath: string
  ): Promise<{ id: string; torrentPath: string; downloadLocation: string }> {
    const torrent = new StartTorrent(torrentPath, '/downloads')
    await torrent.start()

    const id = crypto.randomUUID()
    this.torrents.set(id, torrent)

    return {
      id,
      torrentPath,
      downloadLocation: torrent.downloadLocation ?? './'
    }
  }

  pauseTorrent(id: string): void {
    this.torrents.get(id)?.pause()
  }

  listTorrents() {
    return [...this.torrents.entries()].map(([id, torrent]) => ({
      id,
      path: torrent.torrentPath,
      status: 'downloading' // or real state
    }))
  }
}

export const torrentManager = new TorrentManager()
