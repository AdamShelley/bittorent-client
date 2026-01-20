import { StartTorrent } from '../Electron-entry/StartTorrent'

export const downloadFile = async (torrentPath: string): Promise<StartTorrent> => {
  console.log('Torrent Path: ', torrentPath)
  const newTorrent = new StartTorrent(torrentPath, './')
  newTorrent.start()

  return newTorrent
}
