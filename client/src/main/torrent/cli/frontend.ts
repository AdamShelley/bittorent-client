import { StartTorrent } from '../Electron-entry/StartTorrent'

export const downloadFile = async (torrentPath: string): Promise<StartTorrent> => {
  const newTorrent = new StartTorrent(torrentPath, './')
  newTorrent.start()

  return newTorrent
}
