import React from 'react'

type InstasettlePillProps = {
  isSettled?: boolean
  variant?: 'instasettled' | 'only-instasettlable'
  showTextOnMobile?: boolean
}

const InstasettlePill: React.FC<InstasettlePillProps> = ({
  isSettled = false,
  variant = 'instasettled',
  showTextOnMobile = false,
}) => {
  const isOnlyInstasettlable = variant === 'only-instasettlable'
  const color = isOnlyInstasettlable ? '#FAEE40' : '#40f798'
  const fillOpacity = isOnlyInstasettlable ? '1' : '0.72'

  const getText = () => {
    if (isOnlyInstasettlable) {
      return isSettled ? 'Instasettled' : 'Only Instasettlable'
    }
    return isSettled ? 'Instasettled' : 'Instasettle'
  }

  return (
    <div
      className="flex items-center text-sm gap-1 bg-zinc-900 pl-1 pr-1.5 rounded-full leading-none whitespace-nowrap ml-auto"
      style={{ color }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 sm:w-5 sm:h-5"
      >
        <path
          d="M13 2L6 14H11V22L18 10H13V2Z"
          fill={color}
          fillOpacity={fillOpacity}
        />
      </svg>
      <span
        className={`text-xs ${
          showTextOnMobile ? 'inline-block' : 'sm:inline-block hidden'
        }`}
      >
        {getText()}
      </span>
    </div>
  )
}

export default InstasettlePill
