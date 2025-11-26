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
import { Switch } from '../ui/switch'

interface AddTorrentProps {
  resultFilePaths: string
}

const AddTorrentModal = ({ resultFilePaths }: AddTorrentProps) => {
  const [filePaths, setFilePaths] = useState('')
  const [fileLocation, setFileLocation] = useState('')

  const { closeModal } = useModal()

  console.log(resultFilePaths)

  return (
    <ModalShell onClose={closeModal}>
      <div className="p-4 w-[400px] h-full ">
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
                />
                {/* <FieldDescription>This is the name of the</FieldDescription> */}
              </Field>
              <Field>
                <FieldLabel htmlFor="location">Save location</FieldLabel>
                <Input id="location" autoComplete="off" aria-invalid className="text-white" />
                <FieldError>Choose another location.</FieldError>
              </Field>
            </FieldGroup>
          </FieldSet>

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
