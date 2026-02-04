import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { BrowserWindow, Notification } from 'electron'
import { StartTorrent } from './StartTorrent'
import { torrentStateManager } from './TorrentState'
import { store } from '../../store/Store'
import { decode } from '../bencode/bencode'

interface TorrentOptions {
  downloadLocation?: string
  folderName?: string
  selectedFiles?: string[]
}

class TorrentManager {
  private torrents = new Map<string, StartTorrent>()

  getTorrentInfo(
    torrentPath: string
  ): { name: string; totalSize: number; files: { path: string; size: number }[] } | null {
    try {
      console.log('getTorrentInfo called with path:', torrentPath)
      if (!fs.existsSync(torrentPath)) {
        console.log('File does not exist:', torrentPath)
        return null
      }

      const buffer = fs.readFileSync(torrentPath)
      const searchString = '4:info'
      const position = buffer.indexOf(searchString)
      if (position === -1) {
        console.log('Could not find info section in torrent file')
        return null
      }

      const infoStart = position + searchString.length
      const infoSection = decode(buffer, infoStart)

      if (!infoSection) {
        console.log('Failed to decode info section')
        return null
      }

      const info = infoSection.decodedValue
      // Handle name as Buffer or string
      let name = 'Unknown'
      if (info.name) {
        name = Buffer.isBuffer(info.name) ? info.name.toString('utf8') : String(info.name)
      }

      let totalSize = 0
      const files: { path: string; size: number }[] = []

      if (info.files) {
        // Multi-file torrent
        for (const file of info.files) {
          const filePath = file.path
            .map((p: Buffer | string) => (Buffer.isBuffer(p) ? p.toString('utf8') : String(p)))
            .join('/')
          const fileSize = file.length
          totalSize += fileSize
          files.push({ path: filePath, size: fileSize })
        }
      } else {
        // Single file torrent
        totalSize = info.length ?? 0
        files.push({ path: name, size: totalSize })
      }

      console.log('Torrent info parsed:', { name, totalSize, filesCount: files.length })
      return { name, totalSize, files }
    } catch (e) {
      console.error('Error getting torrent info:', e)
      return null
    }
  }

  async startTorrent(
    torrentPath: string,
    options?: TorrentOptions
  ): Promise<{ id: string; torrentPath: string; downloadLocation: string; name: string }> {
    const saveLocation = options?.downloadLocation ?? store.get('saveLocation')
    console.log('Starting torrent with saveLocation:', saveLocation)
    const torrent = new StartTorrent(torrentPath, saveLocation, options?.folderName)
    await torrent.start()

    const id = crypto.randomUUID()
    this.torrents.set(id, torrent)

    const name = torrent.getTorrentName()

    // Register completion callback
    torrent.onComplete((torrentName) => {
      console.log(`Torrent completed: ${torrentName}`)
      torrentStateManager.updateTorrentStatus(id, 'completed')

      // Show native system notification
      if (Notification.isSupported()) {
        const notification = new Notification({
          title: 'Download Complete',
          body: torrentName,
          silent: false
        })
        notification.show()
      }

      // Send to all renderer windows
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('torrent-completed', { id, name: torrentName })
      })
    })

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
    downloaded: number
    totalSize: number
  }[] {
    const result = [...this.torrents.entries()].map(([id, torrent]) => ({
      id,
      path: torrent.torrentPath,
      name: torrent.getTorrentName(),
      status: torrent.getStatus(),
      speed: torrent.getDownloadSpeed(),
      percent: torrent.getTorrentPercent(),
      downloaded: torrent.getBytesDownloaded(),
      totalSize: torrent.getTotalFileSize()
    }))

    console.log('Listing torrents:', result)
    return result
  }

  async resumeTorrent(id: string): Promise<void> {
    console.log('Resuming ', id)
    await this.torrents.get(id)?.resumeTorrent()
    torrentStateManager.updateTorrentStatus(id, 'downloading')
  }

  removeTorrent(id: string, deleteData: boolean = false): void {
    const torrent = this.torrents.get(id)
    if (torrent) {
      // Get the actual output folder path from the FileManager
      const downloadPath = torrent.getOutputFolder()

      torrent.pause()

      console.log(`Delete torrent - downloadPath: ${downloadPath}, deleteData: ${deleteData}`)

      if (deleteData && downloadPath) {
        // Delete the entire download folder/file
        try {
          if (fs.existsSync(downloadPath)) {
            const stat = fs.statSync(downloadPath)
            if (stat.isDirectory()) {
              fs.rmSync(downloadPath, { recursive: true, force: true })
            } else {
              fs.unlinkSync(downloadPath)
            }
            console.log(`Deleted torrent data at: ${downloadPath}`)
          }
        } catch (err) {
          console.error(`Failed to delete torrent data: ${(err as Error).message}`)
        }
      } else if (downloadPath) {
        // Just delete the resume file so the torrent doesn't continue where it left off
        try {
          const resumeFilePath = path.join(downloadPath, '.resume.json')
          if (fs.existsSync(resumeFilePath)) {
            fs.unlinkSync(resumeFilePath)
            console.log(`Deleted resume file at: ${resumeFilePath}`)
          }
        } catch (err) {
          console.error(`Failed to delete resume file: ${(err as Error).message}`)
        }
      }
    }
    this.torrents.delete(id)
    torrentStateManager.removeTorrent(id)
    console.log(`Deleted torrent: ${id}${deleteData ? ' (with data)' : ''}`)
  }

  // Restore torrents from saved state
  async restorePersistedTorrents(): Promise<void> {
    const savedTorrents = torrentStateManager.getAllTorrents()

    // Restore all torrents in parallel for faster startup
    await Promise.all(
      savedTorrents.map(async (savedTorrent) => {
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
          // Remove the torrent from persistence if it fails to restore
          torrentStateManager.removeTorrent(savedTorrent.id)
        }
      })
    )
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
