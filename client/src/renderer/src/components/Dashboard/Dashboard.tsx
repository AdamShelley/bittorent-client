import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Toolbar } from './components/Toolbar'
import { ResizableSidebar } from './components/ResizableSidebar'
import { TorrentTable } from './components/Table'

export interface Torrent {
  id: string
  path: string | null
  name: string
  status: string | null
  speed: string
  percent: number
  downloaded: number
  totalSize: number
}

type FilterType = 'all' | 'downloading' | 'seeding' | 'downloaded'

const Dashboard = (): React.JSX.Element => {
  const [currentTorrentId, setCurrentTorrentId] = useState<string | null>(null)
  const [torrents, setTorrents] = useState<Torrent[]>([])
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  const getTorrentList = async (): Promise<void> => {
    const torrentList = await window.api.getTorrentList()
    console.log('Torrent List:', torrentList)
    setTorrents(torrentList)
  }

  useEffect(() => {
    const start = async (): Promise<void> => {
      await getTorrentList()
    }

    start()

    // Auto-refresh torrent list every 2 seconds
    const interval = setInterval(() => {
      getTorrentList()
    }, 2000)

    // Listen for torrent completion events
    const unsubscribe = window.api.onTorrentCompleted((data) => {
      toast.success('Download complete!', {
        description: data.name
      })
      getTorrentList()
    })

    return () => {
      clearInterval(interval)
      unsubscribe()
    }
  }, [])

  // Calculate counts for each filter
  const counts = useMemo(() => {
    return {
      downloading: torrents.filter((t) => t.status === 'downloading').length,
      // Seeding: idle status with speed > 0 (completed and still active)
      seeding: torrents.filter((t) => t.status === 'idle' && parseFloat(t.speed || '0') > 0).length,
      // Downloaded: idle or paused (completed downloads)
      downloaded: torrents.filter((t) => t.status === 'idle' || t.status === 'paused').length
    }
  }, [torrents])

  // Filter torrents based on active filter
  const filteredTorrents = useMemo(() => {
    if (activeFilter === 'all') return torrents
    if (activeFilter === 'downloading') {
      return torrents.filter((t) => t.status === 'downloading')
    }
    if (activeFilter === 'seeding') {
      // Seeding: idle status with speed > 0
      return torrents.filter((t) => t.status === 'idle' && parseFloat(t.speed || '0') > 0)
    }
    if (activeFilter === 'downloaded') {
      // Downloaded: idle or paused (completed)
      return torrents.filter((t) => t.status === 'idle' || t.status === 'paused')
    }
    return torrents
  }, [torrents, activeFilter])

  // Get current torrent name for delete dialog
  const currentTorrentName = useMemo(() => {
    if (!currentTorrentId) return null
    const torrent = torrents.find((t) => t.id === currentTorrentId)
    return torrent?.name ?? null
  }, [currentTorrentId, torrents])

  const handleTorrentDoubleClick = async (id: string): Promise<void> => {
    await window.api.openTorrentFolder(id)
  }

  return (
    <div className="flex h-full w-full">
      <ResizableSidebar
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        counts={counts}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-2 border-b border-slate-200/10 ">
          <Toolbar
            currentTorrentId={currentTorrentId}
            currentTorrentName={currentTorrentName}
            setCurrentTorrentId={setCurrentTorrentId}
            getTorrentList={getTorrentList}
          />
        </div>
        <div className="flex-1 overflow-auto">
          <TorrentTable
            torrents={filteredTorrents}
            currentTorrentId={currentTorrentId}
            onTorrentClick={setCurrentTorrentId}
            onTorrentDoubleClick={handleTorrentDoubleClick}
          />
        </div>
      </div>
    </div>
  )
}

export default Dashboard
