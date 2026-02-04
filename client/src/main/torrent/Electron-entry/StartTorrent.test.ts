import { StartTorrent } from './StartTorrent'

const torrentStart = new StartTorrent('./test/.torrent/gimp.torrent', './test/.torrent/downloads')
torrentStart.start()
