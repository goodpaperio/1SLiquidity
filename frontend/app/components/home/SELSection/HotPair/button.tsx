'use client'

import { FireIcon } from './fire-icon'

export default function HotPairButton({
  ref,
  onClick,
  onMouseEnter,
  onMouseLeave,
  isOpen,
  isHovered,
  className,
}: {
  ref: React.RefObject<HTMLDivElement>
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
  isOpen: boolean
  isHovered: boolean
  className: string
}) {
  return (
    <div
      ref={ref}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="group cursor-pointer relative"
    >
      {/* Background gradient container */}
      <div
        className={`
        absolute inset-0 rounded-[12px] p-[1px] transition-all duration-300 ease-out
        ${isHovered || isOpen ? 'opacity-100' : 'opacity-0'}
      `}
        style={{
          background:
            isHovered || isOpen
              ? 'linear-gradient(90deg, #33F498 0%, #00CCFF 100%)'
              : 'transparent',
          transitionProperty: 'opacity, background',
        }}
      >
        {/* Inner background with gradient */}
        <div
          className="w-full h-full rounded-[11px] transition-all duration-300 ease-out"
          style={{
            background:
              isHovered || isOpen
                ? 'linear-gradient(90deg, #071310 0%, #042418 100%)'
                : 'transparent',
          }}
        />
      </div>

      {/* Content */}
      <div
        className={`relative flex items-center gap-2 w-fit h-8 px-3 rounded-[12px] transition-all duration-300 ease-out ${
          isOpen || isHovered ? 'bg-transparent' : 'bg-white bg-opacity-[12%]'
        }`}
      >
        <div
          className={`relative transition-all duration-300 ease-in-out transform ${
            isOpen || isHovered ? 'scale-110' : 'scale-100'
          }`}
          style={{
            filter:
              isHovered || isOpen
                ? 'drop-shadow(0 0 6px #33F498) drop-shadow(0 0 12px #33F498)'
                : 'none',
          }}
        >
          <FireIcon
            isActive={isHovered || isOpen}
            className="transition-all duration-300"
          />
        </div>
        <span
          className={`text-sm transition-colors duration-300 ${
            isOpen || isHovered ? 'text-white' : 'text-zinc-400'
          }`}
        >
          HOT PAIRS
        </span>
      </div>
    </div>
  )
}
