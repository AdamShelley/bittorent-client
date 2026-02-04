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
        // Handle empty or whitespace-only files
        if (!data || data.trim() === '') {
          console.warn('Torrent state file is empty, using defaults')
          return { version: 1, torrents: [] }
        }
        const parsed = JSON.parse(data)
        // Validate the parsed data has the expected structure
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.torrents)) {
          return parsed
        }
        console.warn('Torrent state file has invalid structure, using defaults')
      }
    } catch (err) {
      console.error('Failed to load torrent state:', err)
      // Backup corrupted file for debugging
      try {
        if (fs.existsSync(this.stateFilePath)) {
          const backupPath = this.stateFilePath + '.corrupted.' + Date.now()
          fs.renameSync(this.stateFilePath, backupPath)
          console.log('Backed up corrupted state file to:', backupPath)
        }
      } catch {
        // Ignore backup errors
      }
    }
    return { version: 1, torrents: [] }
  }

  private saveState(): void {
    try {
      const userDataPath = app.getPath('userData')
      fs.mkdirSync(userDataPath, { recursive: true })

      // Write to temp file first, then rename (atomic operation)
      const tempPath = this.stateFilePath + '.tmp'
      const data = JSON.stringify(this.state, null, 2)
      fs.writeFileSync(tempPath, data)
      fs.renameSync(tempPath, this.stateFilePath)
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
