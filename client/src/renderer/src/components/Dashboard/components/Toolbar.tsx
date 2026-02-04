import { CirclePause, CirclePlay, DeleteIcon, FolderOpen } from 'lucide-react'
import { Dispatch, JSX, SetStateAction, useState } from 'react'
import { toast } from 'sonner'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { AddTorrentModal } from './AddTorrentModal'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@renderer/components/ui/tooltip'

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

  const showDialog = async (): Promise<void> => {
    const result = await window.api.openFileDialog()

    if (result.canceled) return
    if (!result.filePath) return

    console.log(result)
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
