import { useState } from 'react'
import { Button } from '../ui/button'
import { ModalShell } from '../ModalProvider/ModalShell'
import { useModal } from '../ModalProvider/ModalProvider'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet
} from '../ui/field'
import { Input } from '../ui/input'

interface AddTorrentProps {
  resultFilePaths: string
}

const AddTorrentModal = ({ resultFilePaths }: AddTorrentProps) => {
  const [fileLocation, setFileLocation] = useState('')

  const { closeModal } = useModal()

  const selectDownloadLocation = async () => {
    const result = await window.api.openDirectory()
    if (!result.canceled && result.filePaths.length > 0) {
      setFileLocation(result.filePaths[0])
    }
  }

  const startDownload = async () => {
    if (!fileLocation) {
      console.error('No download location selected')
      return
    }

    try {
      await window.api.downloadFile(resultFilePaths, fileLocation)
      closeModal()
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  return (
    <ModalShell onClose={closeModal}>
      <div className="p-4 w-[400px] h-full">
        <div className="flex flex-col h-full">
          <FieldSet>
            <FieldLegend>Download new torrent</FieldLegend>
            <FieldDescription>Confirm your settings to download</FieldDescription>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="torrent">Torrent file</FieldLabel>
                <Input
                  id="torrent"
                  autoComplete="off"
                  className="text-white"
                  placeholder="test.torrent"
                  value={resultFilePaths}
                  readOnly
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="location">Save location</FieldLabel>
                <div className="flex gap-2">
                  <Input
                    id="location"
                    autoComplete="off"
                    className="text-white"
                    value={fileLocation}
                    placeholder="Choose a location..."
                    readOnly
                    onClick={selectDownloadLocation}
                  />
                  <Button type="button" onClick={selectDownloadLocation}>
                    Browse
                  </Button>
                </div>
                {!fileLocation && <FieldError>Choose a download location.</FieldError>}
              </Field>
            </FieldGroup>
          </FieldSet>

          <div className="flex gap-2 justify-end mt-auto">
            <Button variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={startDownload} disabled={!fileLocation}>
              Download
            </Button>
          </div>
        </div>
      </div>
    </ModalShell>
  )
}

export default AddTorrentModal
