import { useState, useRef, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import { cn } from '@renderer/lib'

interface Torrent {
  id: string
  path: string | null
  name: string
  status: string | null
  speed: string
  percent: number
  downloaded: number
  totalSize: number
}

interface TorrentTableProps {
  torrents: Torrent[]
  currentTorrentId: string | null
  onTorrentClick: (id: string) => void
  onTorrentDoubleClick: (id: string) => void
}

interface ColumnWidths {
  name: number
  status: number
  percent: number
  size: number
  speed: number
  eta: number
}

export const TorrentTable = ({
  torrents,
  currentTorrentId,
  onTorrentClick,
  onTorrentDoubleClick
}: TorrentTableProps): React.JSX.Element => {
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>({
    name: 280,
    status: 100,
    percent: 100,
    size: 160,
    speed: 100,
    eta: 100
  })

  const resizingColumn = useRef<keyof ColumnWidths | null>(null)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, column: keyof ColumnWidths) => {
      e.preventDefault()
      resizingColumn.current = column
      startX.current = e.clientX
      startWidth.current = columnWidths[column]

      const handleMouseMove = (e: MouseEvent): void => {
        if (!resizingColumn.current) return
        const diff = e.clientX - startX.current
        const newWidth = Math.max(60, startWidth.current + diff)
        setColumnWidths((prev) => ({
          ...prev,
          [resizingColumn.current!]: newWidth
        }))
      }

      const handleMouseUp = (): void => {
        resizingColumn.current = null
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [columnWidths]
  )

  const getStatusColor = (status: string | null, percent: number): string => {
    if (percent >= 100) return 'text-emerald-400'
    switch (status) {
      case 'downloading':
        return 'text-blue-400'
      case 'paused':
        return 'text-[#8b8b8e]'
      case 'idle':
        return 'text-emerald-400'
      default:
        return 'text-[#5c5c5f]'
    }
  }

  const formatStatus = (status: string | null, percent: number): string => {
    if (percent >= 100) return 'Completed'
    if (!status) return 'Unknown'
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  const formatSize = (bytes: number): string => {
    if (bytes === undefined || bytes === null || isNaN(bytes) || bytes === 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
  }

  const formatETA = (torrent: Torrent): string => {
    // If completed or no speed, return appropriate message
    if (torrent.percent >= 100) return '—'
    if (torrent.status === 'paused') return 'Paused'

    const speedMBps = parseFloat(torrent.speed || '0')
    if (speedMBps <= 0) return '∞'

    const remaining = torrent.totalSize - torrent.downloaded
    if (remaining <= 0) return '—'

    // Convert MB/s to bytes/s
    const speedBps = speedMBps * 1024 * 1024
    const secondsRemaining = remaining / speedBps

    if (secondsRemaining < 60) {
      return `${Math.ceil(secondsRemaining)}s`
    } else if (secondsRemaining < 3600) {
      const minutes = Math.floor(secondsRemaining / 60)
      const seconds = Math.ceil(secondsRemaining % 60)
      return `${minutes}m ${seconds}s`
    } else if (secondsRemaining < 86400) {
      const hours = Math.floor(secondsRemaining / 3600)
      const minutes = Math.floor((secondsRemaining % 3600) / 60)
      return `${hours}h ${minutes}m`
    } else {
      const days = Math.floor(secondsRemaining / 86400)
      const hours = Math.floor((secondsRemaining % 86400) / 3600)
      return `${days}d ${hours}h`
    }
  }

  const ResizeHandle = ({ column }: { column: keyof ColumnWidths }): React.JSX.Element => (
    <div
      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-[#3f3f46] transition-colors group"
      onMouseDown={(e) => handleMouseDown(e, column)}
    >
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-4 bg-[#27272a] group-hover:bg-[#3f3f46]" />
    </div>
  )

  if (torrents.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-[#5c5c5f] text-[13px]">
        No torrents found
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b border-[#222225] hover:bg-transparent">
          <TableHead style={{ width: columnWidths.name }} className="relative pr-2">
            Name
            <ResizeHandle column="name" />
          </TableHead>
          <TableHead style={{ width: columnWidths.status }} className="relative pr-2">
            Status
            <ResizeHandle column="status" />
          </TableHead>
          <TableHead style={{ width: columnWidths.percent }} className="relative pr-2">
            Progress
            <ResizeHandle column="percent" />
          </TableHead>
          <TableHead style={{ width: columnWidths.size }} className="relative pr-2">
            Size
            <ResizeHandle column="size" />
          </TableHead>
          <TableHead style={{ width: columnWidths.speed }} className="relative pr-2">
            Speed
            <ResizeHandle column="speed" />
          </TableHead>
          <TableHead style={{ width: columnWidths.eta }} className="relative">
            ETA
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {torrents.map((torrent) => (
          <TableRow
            key={torrent.id}
            onClick={() => onTorrentClick(torrent.id)}
            onDoubleClick={() => onTorrentDoubleClick(torrent.id)}
            className={cn(
              'cursor-pointer border-b border-[#ffffff08] transition-colors',
              currentTorrentId === torrent.id
                ? 'bg-[#1d1d20] hover:bg-[#222225]'
                : 'hover:bg-[#18181b]'
            )}
          >
            <TableCell
              style={{ width: columnWidths.name, maxWidth: columnWidths.name }}
              className="font-medium text-[#ededef]"
            >
              <span className="block truncate">{torrent.name || 'Unknown'}</span>
            </TableCell>
            <TableCell style={{ width: columnWidths.status }}>
              <span className={cn('text-[13px]', getStatusColor(torrent.status, torrent.percent))}>
                {formatStatus(torrent.status, torrent.percent)}
              </span>
            </TableCell>
            <TableCell style={{ width: columnWidths.percent }} className="text-[#8b8b8e]">
              {torrent.percent ? `${torrent.percent.toFixed(1)}%` : '0.0%'}
            </TableCell>
            <TableCell style={{ width: columnWidths.size }} className="text-[#8b8b8e] text-[13px]">
              <span className="text-[#ededef]">{formatSize(torrent.downloaded)}</span>
              <span className="text-[#5c5c5f]"> / </span>
              <span>{formatSize(torrent.totalSize)}</span>
            </TableCell>
            <TableCell style={{ width: columnWidths.speed }} className="text-[#8b8b8e]">
              {torrent.speed ? `${torrent.speed} MB/s` : '—'}
            </TableCell>
            <TableCell style={{ width: columnWidths.eta }} className="text-[#8b8b8e]">
              {formatETA(torrent)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
