import './assets/main.css'

import { createRoot } from 'react-dom/client'
import AddTorrentModal from './components/Add-torrent/Add-torrent-modal'

const root = createRoot(document.getElementById('root')!)
root.render(<AddTorrentModal />)
