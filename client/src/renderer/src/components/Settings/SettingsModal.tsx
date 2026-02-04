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
      <DialogContent className="bg-[#111113] ring-[#222225]/50 sm:max-w-sm p-0">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="text-[13px] font-medium text-[#ededef]">Settings</DialogTitle>
        </DialogHeader>
        <div className="p-5 pt-4">
          <SettingsComponent />
        </div>
      </DialogContent>
    </Dialog>
  )
}
