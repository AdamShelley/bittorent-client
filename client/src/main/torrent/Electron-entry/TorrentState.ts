import fs from 'fs'
import path from 'path'
import { app } from 'electron'

export interface TorrentState {
  id: string
  torrentPath: string
  downloadLocation: string
  name: string
  status: 'downloading' | 'paused' | 'completed'
  addedAt: number
}

interface TorrentStateFile {
  version: number
  torrents: TorrentState[]
}

export class TorrentStateManager {
  private stateFilePath: string
  private state: TorrentStateFile

  constructor() {
    // Store in app user data directory
    const userDataPath = app.getPath('userData')
    this.stateFilePath = path.join(userDataPath, 'torrent-state.json')
    this.state = this.loadState()
  }

  private loadState(): TorrentStateFile {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const data = fs.readFileSync(this.stateFilePath, 'utf-8')
        return JSON.parse(data)
      }
    } catch (err) {
      console.error('Failed to load torrent state:', err)
    }
    return { version: 1, torrents: [] }
  }

  private saveState(): void {
    try {
      const userDataPath = app.getPath('userData')
      fs.mkdirSync(userDataPath, { recursive: true })
      fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2))
    } catch (err) {
      console.error('Failed to save torrent state:', err)
    }
  }

  addTorrent(id: string, torrentPath: string, downloadLocation: string, name: string): void {
    const existing = this.state.torrents.find((t) => t.id === id)
    if (!existing) {
      this.state.torrents.push({
        id,
        torrentPath,
        downloadLocation,
        name,
        status: 'downloading',
        addedAt: Date.now()
      })
      this.saveState()
    }
  }

  updateTorrentStatus(id: string, status: 'downloading' | 'paused' | 'completed'): void {
    const torrent = this.state.torrents.find((t) => t.id === id)
    if (torrent) {
      torrent.status = status
      this.saveState()
    }
  }

  removeTorrent(id: string): void {
    this.state.torrents = this.state.torrents.filter((t) => t.id !== id)
    this.saveState()
  }

  getAllTorrents(): TorrentState[] {
    return this.state.torrents
  }

  getTorrent(id: string): TorrentState | undefined {
    return this.state.torrents.find((t) => t.id === id)
  }

  clearAll(): void {
    this.state.torrents = []
    this.saveState()
  }
}

export const torrentStateManager = new TorrentStateManager()
