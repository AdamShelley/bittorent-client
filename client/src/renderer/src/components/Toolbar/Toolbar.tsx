import { BookOpen, FolderOpen, Pause, Play, X, XCircle } from 'lucide-react'
import AddTorrentModal from '../Add-torrent/Add-torrent-modal'
import { useModal } from '../ModalProvider/ModalProvider'
import { Button } from '../ui/button'

const Toolbar = () => {
  const { openModal } = useModal()

  const openTorrentFile = async () => {
    const result = await window.api.openFile()

    console.log(result)

    if (result.filePaths?.length) {
      openModal(AddTorrentModal, { resultFilePaths: result.filePaths[0] })
    }
  }

  return (
    <div className="flex items-center justify-start">
      <ul className="flex gap-1 items-center justify-center">
        <li>
          <Button variant="ghost" onClick={openTorrentFile}>
            <FolderOpen />
          </Button>
        </li>
        <li>
          <Button variant="ghost">
            <XCircle />
          </Button>
        </li>
        <li>
          <Button variant="ghost">
            <Play />
          </Button>
        </li>
        <li>
          <Button variant="ghost">
            <Pause />
          </Button>
        </li>
      </ul>
    </div>
  )
}

export default Toolbar
