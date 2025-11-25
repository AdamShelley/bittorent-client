import { useState } from 'react'
import { Button } from '../ui/button'
import { ModalShell } from '../ModalProvider/ModalShell'
import { useModal } from '../ModalProvider/ModalProvider'
import { X } from 'lucide-react'

const AddTorrentModal = () => {
  const [filePaths, setFilePaths] = useState('')
  const [fileLocation, setFileLocation] = useState('')
  const { closeModal } = useModal()

  return (
    <ModalShell onClose={closeModal}>
      <div className="p-4 w-full h-full text-black">
        <X className="size-4 " onClick={closeModal} />
        <div className="flex flex-col h-full">
          <div className="">The torrent selected was: {filePaths}</div>

          <div>
            <Button variant="ghost">Cancel</Button>
            <Button>Download</Button>
          </div>
        </div>
      </div>
    </ModalShell>
  )
}

export default AddTorrentModal
