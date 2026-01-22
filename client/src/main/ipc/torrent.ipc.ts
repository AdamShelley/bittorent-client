import { ipcMain } from 'electron'
import { torrentManager } from '../torrent/Electron-entry/TorrentManager'

export function registerTorrentIpc(): void {
  ipcMain.handle('start-download', (_, path) => torrentManager.startTorrent(path))

  ipcMain.handle('pause-download', (_, id) => torrentManager.pauseTorrent(id))
  ipcMain.handle('resume-download', (_, id) => torrentManager.resumeTorrent(id))

  ipcMain.handle('list-torrents', () => torrentManager.listTorrents())
}
