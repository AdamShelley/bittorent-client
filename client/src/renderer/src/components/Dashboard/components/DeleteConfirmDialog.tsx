import { JSX } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { Trash2, FolderX } from 'lucide-react'

interface DeleteConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onDeleteFromList: () => void
  onDeleteWithData: () => void
  torrentName?: string
}

export const DeleteConfirmDialog = ({
  isOpen,
  onClose,
  onDeleteFromList,
  onDeleteWithData,
  torrentName
}: DeleteConfirmDialogProps): JSX.Element => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-[#111113] ring-[#222225]/50 sm:max-w-md p-0"
        aria-describedby={undefined}
      >
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="text-[13px] font-medium text-[#ededef]">Delete Torrent</DialogTitle>
          <DialogDescription className="sr-only">
            Confirm how you want to delete this torrent
          </DialogDescription>
        </DialogHeader>
        <div className="p-5 pt-4 space-y-4">
          <div className="text-[13px] text-[#ededef]">
            {torrentName ? (
              <>
                How would you like to delete{' '}
                <span className="font-medium text-[#ededef]">{torrentName}</span>?
              </>
            ) : (
              'How would you like to delete this torrent?'
            )}
          </div>
          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3 bg-[#18181b] border-[#27272a] hover:bg-[#222225] text-[#ededef]"
              onClick={() => {
                onDeleteFromList()
                onClose()
              }}
            >
              <Trash2 className="w-5 h-5 text-[#8b8b8e]" />
              <div className="text-left">
                <div className="font-medium">Remove from list</div>
                <div className="text-xs text-[#5c5c5f]">Keep downloaded files on disk</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3 bg-[#2a1517] border-[#3f1d1d] hover:bg-[#3f1d1d] text-[#f87171]"
              onClick={() => {
                onDeleteWithData()
                onClose()
              }}
            >
              <FolderX className="w-5 h-5 text-[#f87171]" />
              <div className="text-left">
                <div className="font-medium">Delete with data</div>
                <div className="text-xs text-[#fca5a5]">
                  Remove torrent and delete all downloaded files
                </div>
              </div>
            </Button>
          </div>
        </div>
        <DialogFooter className="px-5 py-4 border-t border-[#ffffff08] gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-8 px-4 text-[13px] text-[#8b8b8e] hover:text-[#ededef] transition-colors"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
