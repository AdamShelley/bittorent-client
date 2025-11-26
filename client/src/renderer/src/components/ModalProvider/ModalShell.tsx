import { X } from 'lucide-react'
import { ReactNode } from 'react'

export const ModalShell = ({ children, onClose }: { children: ReactNode; onClose: () => void }) => {
  return (
    <div
      className="fixed inset-0 bg-[rgba(0,0,0,5)] flex justify-center items-center z-999"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="border dark:bg-accent-foreground rounded-xs dark:text-black"
      >
        <div className="p-1">
          <X
            className="size-5 cursor-pointer justify-self-end hover:text-gray-500 transition"
            onClick={onClose}
          />
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
