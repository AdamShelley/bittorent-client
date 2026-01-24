import { useEffect, useState } from 'react'

interface Torrent {
  id: string
  path: string | null
  name: string
  status: string | null
  speed: string
}

const Dashboard = (): React.JSX.Element => {
  const [currentTorrentId, setCurrentTorrentId] = useState<string | null>(null)
  const [torrents, setTorrents] = useState<Torrent[]>([])

  const showDialog = async (): Promise<void> => {
    const result = await window.api.openFileDialog()

    if (result.canceled) return
    if (!result.filePath) return

    console.log(result)
    await startDownload(result.filePath)
  }

  const startDownload = async (torrentPath: string): Promise<void> => {
    const download = await window.api.startDownload(torrentPath)
    console.log(download)
    setCurrentTorrentId(download.id)

    await getTorrentList()
  }

  const pauseTorrent = async (torrentId: string): Promise<void> => {
    console.log('Pausing')
    await window.api.pauseDownload(torrentId)
    await getTorrentList()
  }

  const resumeTorrent = async (torrentId: string): Promise<void> => {
    console.log('Resuming')
    await window.api.resumeDownload(torrentId)
    await getTorrentList()
  }

  const deleteTorrent = async (torrentId: string): Promise<void> => {
    console.log('Deleting')
    await window.api.deleteTorrent(torrentId)
    if (currentTorrentId === torrentId) {
      setCurrentTorrentId(null)
    }
    await getTorrentList()
  }

  const getTorrentList = async () => {
    const torrentList = await window.api.getTorrentList()
    console.log('Torrent List:', torrentList)
    setTorrents(torrentList)
  }

  useEffect(() => {
    getTorrentList()

    // Auto-refresh torrent list every 2 seconds
    const interval = setInterval(() => {
      getTorrentList()
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      {currentTorrentId}
      <div className="flex gap-4">
        <button onClick={showDialog}>Open Torrent</button>
        <button onClick={() => currentTorrentId && pauseTorrent(currentTorrentId)}>
          Pause Torrent
        </button>
        <button onClick={() => currentTorrentId && resumeTorrent(currentTorrentId)}>
          Resume Torrent
        </button>
        <button
          onClick={() => currentTorrentId && deleteTorrent(currentTorrentId)}
          style={{ backgroundColor: '#dc2626', color: 'white' }}
        >
          Delete Torrent
        </button>
      </div>
      <div>
        <p>Torrent Info</p>
        <ul>
          {torrents &&
            torrents.map((torrent) => (
              <li
                className="cursor-pointer"
                onClick={() => setCurrentTorrentId(torrent.id)}
                key={torrent.id}
              >
                <strong>{torrent.name}</strong> - {torrent.status} - {torrent.speed} MB/s
              </li>
            ))}
        </ul>
      </div>
    </div>
  )
}

export default Dashboard
