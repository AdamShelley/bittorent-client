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
      <DialogContent className="bg-slate-900/40 ring-slate-800/50">
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
