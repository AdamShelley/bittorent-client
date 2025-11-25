import { ReactNode } from 'react'

export const ModalShell = ({ children, onClose }: { children: ReactNode; onClose: () => void }) => {
  return (
    <div
      className="fixed inset-0 bg-[rgba(0,0,0,5)] flex justify-center items-center z-999"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="p-4 rounded-none bg-accent-foreground">
        {children}
      </div>
    </div>
  )
}
