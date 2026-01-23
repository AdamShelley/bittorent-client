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

  listTorrents(): { id: string; path: string | null; status: string | null }[] {
    return [...this.torrents.entries()].map(([id, torrent]) => ({
      id,
      path: torrent.torrentPath,
      status: 'downloading'
    }))
  }

  async resumeTorrent(id: string): Promise<void> {
    console.log('Resuming ', id)
    await this.torrents.get(id)?.resumeTorrent()
  }
}

export const torrentManager = new TorrentManager()
