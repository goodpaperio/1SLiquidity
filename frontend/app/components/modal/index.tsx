// Modal.tsx
import React, { useRef } from 'react'
import useOnClickOutside from '@/app/lib/hooks/useOnClickOutside'

type ModalProps = {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  const modalRef = useRef<HTMLDivElement>(null)
  useOnClickOutside(modalRef, onClose)

  if (!isOpen) return null

  return (
    <div className="fixed z-[9999] inset-0 overflow-y-auto w-screen min-h-screen flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-2xl">
      <div
        className="bg-black backdrop-blur-3xl bg-opacity-95 border-[2px] border-white14 rounded-[15px] w-[90%] max-w-[400px] max-h-[95vh]"
        ref={modalRef}
      >
        {children}
      </div>
    </div>
  )
}

export default Modal
