'use client'
import { title } from 'process'
import { useState } from 'react'

type Props = {
  theme: 'primary' | 'secondary'
  children?: React.ReactNode
  value?: string
  setValue?: (selected: string) => void
  title?: string
  onClick?: () => void
}

const Tag: React.FC<Props> = ({
  theme,
  children,
  value,
  setValue,
  title,
  onClick,
}) => {
  return (
    <span
      className={`cursor-pointer hover:bg-tabsGradient hover:text-primary px-3 rounded-[10px] flex justify-center items-center text-[15px] h-[32px] border-[2px] border-primary ${
        theme === 'primary' ||
        value?.toLocaleLowerCase() === title?.toLocaleLowerCase()
          ? 'bg-neutral-800 text-white'
          : 'text-white'
      }`}
      onClick={() => {
        if (title && value && setValue) {
          setValue(title)
        } else {
          onClick && onClick()
        }
      }}
    >
      {children && children}
      {title && title}
    </span>
  )
}

export default Tag
