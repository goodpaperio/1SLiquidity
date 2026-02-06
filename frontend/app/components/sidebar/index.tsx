'use client'

import { cn } from '@/lib/utils'
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type SidebarProps = {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  children,
  className,
}) => {
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="sidebar"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{
            type: 'tween',
            ease: 'easeInOut',
            duration: 0.3,
          }}
          className={cn(
            'fixed top-[4.5rem] right-4 sm:right-5 h-[90vh] w-[86vw] sm:w-96 z-50 shadow-lg',
            className
          )}
        >
          <div className="px-4 pt-0 rounded-[13px] border-[2px] border-white14 shadow-lg h-full overflow-hidden bg-black">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default Sidebar
