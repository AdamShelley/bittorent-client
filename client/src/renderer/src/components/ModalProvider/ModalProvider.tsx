import { createContext, useContext, useState, ReactNode, FC } from 'react'
import { createPortal } from 'react-dom'

type ModalEntry = {
  Component: FC<any>
  props: any
}

type ModalContextValue = {
  openModal: (Component: FC<any>, props?: any) => void
  closeModal: () => void
}

const ModalContext = createContext<ModalContextValue | null>(null)

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [modals, setModals] = useState<ModalEntry[]>([])

  const openModal = (Component: FC<any>, props: any = {}) => {
    setModals((prev) => [...prev, { Component, props }])
  }

  const closeModal = () => {
    setModals((prev) => prev.slice(0, -1))
  }

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}

      {createPortal(
        <>
          {modals.map(({ Component, props }, i) => (
            <Component key={i} {...props} />
          ))}
        </>,
        document.body
      )}
    </ModalContext.Provider>
  )
}

export const useModal = () => {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error('useModal must be inside <ModalProvider>')
  return ctx
}
