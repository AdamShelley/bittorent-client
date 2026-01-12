import { useState, useEffect } from 'react'
import { columns } from './columns'
import { DataTable } from './data-table'

export type TorrentRow = {
  id: string
  name: string
  size: number
  downloaded: number
  progress: number
  dl_speed: number
  ul_speed: number
}

export default function Table() {
  // const data = [
  //   {
  //     id: 'test',
  //     status: 'pending',
  //     name: 'Test Torrent',
  //     size: 15,
  //     downloaded: 5,
  //     dl_speed: 500,
  //     ul_speed: 200
  //   }
  // ]

  const [torrents, setTorrents] = useState<TorrentRow[]>([])

  useEffect(() => {
    window.api.onTorrentProgress(({ id, progress, name, size, downloaded, dl_speed, ul_speed }) => {
      setTorrents((prev) => {
        const index = prev.findIndex((t) => t.id === id)

        if (index === -1) {
          // New torrent
          return [
            ...prev,
            {
              id,
              name,
              size,
              downloaded,
              progress,
              dl_speed,
              ul_speed
            }
          ]
        }

        // Update existing torrent
        const next = [...prev]
        next[index] = {
          ...next[index],
          progress,
          downloaded,
          dl_speed,
          ul_speed
        }

        return next
      })
    })

    return () => {
      window.api.removeTorrentProgressListener()
    }
  }, [])

  return (
    <div className="h-full">
      <DataTable columns={columns} data={torrents} />
    </div>
  )
}
