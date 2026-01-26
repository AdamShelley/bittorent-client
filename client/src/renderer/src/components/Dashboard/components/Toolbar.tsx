import { CirclePause, CirclePlay, DeleteIcon, FolderOpen } from 'lucide-react'
import { Dispatch, JSX, SetStateAction } from 'react'

interface ToolbarProps {
  currentTorrentId: string | null
  setCurrentTorrentId: Dispatch<SetStateAction<string | null>>
  getTorrentList: () => Promise<void>
}

export const Toolbar = ({
  currentTorrentId,
  setCurrentTorrentId,
  getTorrentList
}: ToolbarProps): JSX.Element => {
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

  return (
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
        onClick={() => currentTorrentId && deleteTorrent(currentTorrentId)}
        className="no-drag"
      >
        <DeleteIcon className="size-6 text-zinc-400/90 hover:text-slate-400 cursor-pointer transition " />
      </button>
    </div>
  )
}
