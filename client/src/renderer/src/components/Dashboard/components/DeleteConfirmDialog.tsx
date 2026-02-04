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
      <DialogContent className="bg-slate-900/95 ring-slate-800/50 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Delete Torrent</DialogTitle>
          <DialogDescription className="text-zinc-400">
            {torrentName ? (
              <>
                How would you like to delete{' '}
                <span className="font-medium text-zinc-300">{torrentName}</span>?
              </>
            ) : (
              'How would you like to delete this torrent?'
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3 bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 text-zinc-200"
            onClick={() => {
              onDeleteFromList()
              onClose()
            }}
          >
            <Trash2 className="size-5 text-zinc-400" />
            <div className="text-left">
              <div className="font-medium">Remove from list</div>
              <div className="text-xs text-zinc-500">Keep downloaded files on disk</div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3 bg-red-950/30 border-red-900/50 hover:bg-red-900/40 text-red-200"
            onClick={() => {
              onDeleteWithData()
              onClose()
            }}
          >
            <FolderX className="size-5 text-red-400" />
            <div className="text-left">
              <div className="font-medium">Delete with data</div>
              <div className="text-xs text-red-400/70">
                Remove torrent and delete all downloaded files
              </div>
            </div>
          </Button>
        </div>
        <DialogFooter className="bg-slate-800/30">
          <Button variant="ghost" onClick={onClose} className="text-zinc-400 hover:text-zinc-200">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
