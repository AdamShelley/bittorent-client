import { CirclePause, CirclePlay, DeleteIcon, FolderOpen, Settings } from 'lucide-react'
import { Dispatch, JSX, SetStateAction, useState } from 'react'
import { toast } from 'sonner'
import { SettingsModal } from '../../Settings/SettingsModal'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

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
    toast.success('Torrent added', {
      description: download.name
    })
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

  const openSettings = (): void => {
    setIsSettingsOpen(true)
  }

  return (
    <>
      <div className="flex gap-5 items-center w-full p-2 text-zinc-400/90 drag-region ">
        <button onClick={showDialog} className="no-drag pl-2">
          <FolderOpen className="size-6 text-zinc-400/90 hover:text-slate-400 cursor-pointer transition" />
        </button>
        <button
          onClick={() => currentTorrentId && resumeTorrent(currentTorrentId)}
          className="no-drag"
        >
          <CirclePlay className="size-6 text-zinc-400/90 hover:text-slate-400 cursor-pointer transition " />
        </button>
        <button
          onClick={() => currentTorrentId && pauseTorrent(currentTorrentId)}
          className="no-drag"
        >
          <CirclePause className="size-6 text-zinc-400/90 hover:text-slate-400 cursor-pointer transition " />
        </button>

        <button
          onClick={handleDeleteClick}
          className="no-drag"
        >
          <DeleteIcon className="size-6 text-zinc-400/90 hover:text-slate-400 cursor-pointer transition " />
        </button>
        <button onClick={openSettings} className="no-drag">
          <Settings className="size-6 text-zinc-400/90 hover:text-slate-400 cursor-pointer transition " />
        </button>
      </div>
      
      <SettingsModal isOpen={isSettingsOpen} setIsOpen={setIsSettingsOpen} />
      
      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDeleteFromList={() => currentTorrentId && deleteTorrent(currentTorrentId, false)}
        onDeleteWithData={() => currentTorrentId && deleteTorrent(currentTorrentId, true)}
        torrentName={currentTorrentName ?? undefined}
      />
    </>
  )
}
