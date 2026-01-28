import { Dispatch, JSX, SetStateAction } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Settings as SettingsComponent } from '@renderer/components/Settings/Settings'

interface SettingsModalProps {
  isOpen: boolean
  setIsOpen: Dispatch<SetStateAction<boolean>>
}

export const SettingsModal = ({ isOpen, setIsOpen }: SettingsModalProps): JSX.Element => {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="mt-6">
          <SettingsComponent />
        </div>
      </DialogContent>
    </Dialog>
  )
}
