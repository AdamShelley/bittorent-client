import { app } from 'electron'
import fs from 'fs'
import path from 'path'

export type TorrentState = {
  id: string
  torrentPath: string
  downloadLocation: string
  downloadedBytes: number
  totalBytes: number
}

const STORE_PATH = path.join(app.getPath('userData'), 'torrents.json')

class TorrentRegistry {
  private torrents = new Map<string, TorrentState>()

  load() {
    if (!fs.existsSync(STORE_PATH)) return

    const data: TorrentState[] = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'))

    for (const torrent of data) {
      this.torrents.set(torrent.id, torrent)
    }
  }

  persist() {
    fs.writeFileSync(STORE_PATH, JSON.stringify([...this.torrents.values()], null, 2))
  }

  add(torrent: TorrentState) {
    this.torrents.set(torrent.id, torrent)
    this.persist()
  }

  update(id: string, patch: Partial<TorrentState>) {
    const existing = this.torrents.get(id)
    if (!existing) return

    this.torrents.set(id, { ...existing, ...patch })
  }

  remove(id: string) {
    this.torrents.delete(id)
    this.persist()
  }

  list() {
    return [...this.torrents.values()]
  }
}

export const torrentRegistry = new TorrentRegistry()
