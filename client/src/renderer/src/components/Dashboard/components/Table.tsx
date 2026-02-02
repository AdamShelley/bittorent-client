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
}

export const TorrentTable = ({
  torrents,
  currentTorrentId,
  onTorrentClick
}: TorrentTableProps): React.JSX.Element => {
  const getStatusColor = (status: string | null): string => {
    switch (status) {
      case 'downloading':
        return 'text-blue-400'
      case 'paused':
        return 'text-yellow-400'
      case 'idle':
        return 'text-green-400'
      default:
        return 'text-muted-foreground'
    }
  }

  const formatStatus = (status: string | null): string => {
    if (!status) return 'Unknown'
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  const formatSize = (bytes: number): string => {
    if (bytes === undefined || bytes === null || isNaN(bytes) || bytes === 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
  }

  if (torrents.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        No torrents found
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[25%]">Name</TableHead>
          <TableHead className="w-[12%]">Status</TableHead>
          <TableHead className="w-[12%]">% Complete</TableHead>
          <TableHead className="w-[20%]">Size</TableHead>
          <TableHead className="w-[12%]">Speed</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {torrents.map((torrent) => (
          <TableRow
            key={torrent.id}
            onClick={() => onTorrentClick(torrent.id)}
            className={cn(
              'cursor-pointer transition-colors',
              currentTorrentId === torrent.id && 'bg-amber-950/50 '
            )}
          >
            <TableCell className="font-medium">{torrent.name || 'Unknown'}</TableCell>
            <TableCell>
              <span className={cn('font-medium', getStatusColor(torrent.status))}>
                {formatStatus(torrent.status)}
              </span>
            </TableCell>
            <TableCell>{torrent.percent ? `${torrent.percent.toFixed(2)} %` : '0.00 %'}</TableCell>
            <TableCell>
              {formatSize(torrent.downloaded)} / {formatSize(torrent.totalSize)}
            </TableCell>
            <TableCell>{torrent.speed ? `${torrent.speed} MB/s` : '0.00 MB/s'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
