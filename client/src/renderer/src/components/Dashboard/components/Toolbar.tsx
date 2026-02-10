import { CirclePause, CirclePlay, DeleteIcon, FolderOpen } from 'lucide-react'
import { Dispatch, JSX, SetStateAction, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { AddTorrentModal } from './AddTorrentModal'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@renderer/components/ui/tooltip'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'

interface ToolbarProps {
  currentTorrentId: string | null
  currentTorrentName: string | null
  setCurrentTorrentId: Dispatch<SetStateAction<string | null>>
  getTorrentList: () => Promise<void>
}

export const Toolbar = ({
  currentTorrentId,
  currentTorrentName,
  setCurrentTorrentId,
  getTorrentList
}: ToolbarProps): JSX.Element => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isAddTorrentOpen, setIsAddTorrentOpen] = useState(false)
  const [pendingTorrentPath, setPendingTorrentPath] = useState<string | null>(null)
  const [defaultDownloadLocation, setDefaultDownloadLocation] = useState('')

  const [magnetLink, setMagnetLink] = useState<string>(
    'magnet:?xt=urn:btih:dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c&dn=Big+Buck+Bunny&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fbig-buck-bunny.torrent'
  )

  const showDialog = async (): Promise<void> => {
    const result = await window.api.openFileDialog()

    if (result.canceled) return
    if (!result.filePath) return

    setPendingTorrentPath(result.filePath)
    setIsAddTorrentOpen(true)
  }

  const startDownload = async (
    torrentPath: string,
    options: { downloadLocation: string; folderName: string; selectedFiles?: string[] }
  ): Promise<void> => {
    const download = await window.api.startDownload(torrentPath, {
      downloadLocation: options.downloadLocation,
      folderName: options.folderName,
      selectedFiles: options.selectedFiles
    })
    console.log(download)
    setCurrentTorrentId(download.id)
    toast.success('Torrent added', {
      description: download.name
    })
    await getTorrentList()
  }

  const handleAddTorrentConfirm = async (options: {
    downloadLocation: string
    folderName: string
    selectedFiles?: string[]
  }): Promise<void> => {
    if (pendingTorrentPath) {
      await startDownload(pendingTorrentPath, options)
      setPendingTorrentPath(null)
    }
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

  const deleteTorrent = async (torrentId: string, deleteData: boolean = false): Promise<void> => {
    console.log('Deleting', deleteData ? 'with data' : 'from list only')
    const torrentName = currentTorrentName
    await window.api.deleteTorrent(torrentId, deleteData)
    if (currentTorrentId === torrentId) {
      setCurrentTorrentId(null)
    }
    toast.success(deleteData ? 'Torrent and data deleted' : 'Torrent removed', {
      description: torrentName ?? undefined
    })
    await getTorrentList()
  }

  const handleDeleteClick = (): void => {
    if (currentTorrentId) {
      setIsDeleteDialogOpen(true)
    }
  }

  const useMagnetLink = (): void => {
    startDownload(magnetLink, {
      downloadLocation: defaultDownloadLocation,
      folderName: 'test'
    })
  }

  useEffect(() => {
    // Load default download location from settings on mount
    const loadSettings = async (): Promise<void> => {
      const settings = await window.api.getSettings()
      if (settings?.saveLocation) {
        setDefaultDownloadLocation(settings.saveLocation)
      }
    }
    loadSettings()
  }, [])

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex gap-4 items-center w-full px-3 py-2 text-[#5c5c5f] drag-region">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={showDialog}
              className="no-drag p-1.5 rounded-md hover:bg-[#18181b] transition-colors"
            >
              <FolderOpen className="w-4 h-4 hover:text-[#8b8b8e] transition-colors" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Open Torrent</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => currentTorrentId && resumeTorrent(currentTorrentId)}
              className="no-drag p-1.5 rounded-md hover:bg-[#18181b] transition-colors"
            >
              <CirclePlay className="w-4 h-4 hover:text-[#8b8b8e] transition-colors" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Resume</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => currentTorrentId && pauseTorrent(currentTorrentId)}
              className="no-drag p-1.5 rounded-md hover:bg-[#18181b] transition-colors"
            >
              <CirclePause className="w-4 h-4 hover:text-[#8b8b8e] transition-colors" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Pause</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleDeleteClick}
              className="no-drag p-1.5 rounded-md hover:bg-[#18181b] transition-colors"
            >
              <DeleteIcon className="w-4 h-4 hover:text-[#8b8b8e] transition-colors" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Delete</TooltipContent>
        </Tooltip>
        <Input
          className="no-drag"
          value={magnetLink}
          onChange={(e) => setMagnetLink(e.target.value)}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button className="no-drag" onClick={useMagnetLink}>
              Use Magnet
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Magnet link</TooltipContent>
        </Tooltip>
      </div>

      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDeleteFromList={() => currentTorrentId && deleteTorrent(currentTorrentId, false)}
        onDeleteWithData={() => currentTorrentId && deleteTorrent(currentTorrentId, true)}
        torrentName={currentTorrentName ?? undefined}
      />

      <AddTorrentModal
        isOpen={isAddTorrentOpen}
        onClose={() => {
          setIsAddTorrentOpen(false)
          setPendingTorrentPath(null)
        }}
        onConfirm={handleAddTorrentConfirm}
        torrentPath={pendingTorrentPath}
      />
    </TooltipProvider>
  )
}
