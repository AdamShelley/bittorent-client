import { ipcMain, shell } from 'electron'
import { torrentManager } from '../torrent/Electron-entry/TorrentManager'

export function registerTorrentIpc(): void {
  ipcMain.handle('start-download', (_, path, options) => torrentManager.startTorrent(path, options))
  ipcMain.handle('get-torrent-info', (_, path) => torrentManager.getTorrentInfo(path))
  ipcMain.handle('pause-download', (_, id) => torrentManager.pauseTorrent(id))
  ipcMain.handle('resume-download', (_, id) => torrentManager.resumeTorrent(id))
  ipcMain.handle('delete-torrent', (_, id, deleteData) =>
    torrentManager.removeTorrent(id, deleteData)
  )
  ipcMain.handle('list-torrents', () => torrentManager.listTorrents())
  ipcMain.handle('open-torrent-folder', async (_, id: string) => {
    const folderPath = torrentManager.getTorrentFolder(id)
    if (folderPath) {
      await shell.openPath(folderPath)
      return true
    }
    return false
  })
}
