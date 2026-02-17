import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import React from 'react'

export const HomeIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M3.3335 14.8337V7.33366C3.3335 7.06977 3.39252 6.81977 3.51058 6.58366C3.62863 6.34755 3.79183 6.1531 4.00016 6.00033L9.00016 2.25033C9.29183 2.0281 9.62516 1.91699 10.0002 1.91699C10.3752 1.91699 10.7085 2.0281 11.0002 2.25033L16.0002 6.00033C16.2085 6.1531 16.3717 6.34755 16.4897 6.58366C16.6078 6.81977 16.6668 7.06977 16.6668 7.33366V14.8337C16.6668 15.292 16.5036 15.6844 16.1772 16.0107C15.8509 16.3371 15.4585 16.5003 15.0002 16.5003H12.5002C12.2641 16.5003 12.0661 16.4205 11.9064 16.2607C11.7467 16.101 11.6668 15.9031 11.6668 15.667V11.5003C11.6668 11.2642 11.587 11.0663 11.4272 10.9066C11.2675 10.7469 11.0696 10.667 10.8335 10.667H9.16683C8.93072 10.667 8.7328 10.7469 8.57308 10.9066C8.41336 11.0663 8.3335 11.2642 8.3335 11.5003V15.667C8.3335 15.9031 8.25363 16.101 8.09391 16.2607C7.93419 16.4205 7.73627 16.5003 7.50016 16.5003H5.00016C4.54183 16.5003 4.14947 16.3371 3.82308 16.0107C3.49669 15.6844 3.3335 15.292 3.3335 14.8337Z" />
    </svg>
  )
}

export const SwapsIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M4.16668 12.6247V6.66634C4.16668 5.74967 4.49307 4.96495 5.14584 4.31217C5.79862 3.6594 6.58334 3.33301 7.50001 3.33301C8.41668 3.33301 9.2014 3.6594 9.85418 4.31217C10.507 4.96495 10.8333 5.74967 10.8333 6.66634V12.4997C10.8333 12.958 10.9965 13.3504 11.3229 13.6768C11.6493 14.0031 12.0417 14.1663 12.5 14.1663C12.9583 14.1663 13.3507 14.0031 13.6771 13.6768C14.0035 13.3504 14.1667 12.958 14.1667 12.4997V6.54134L13.4375 7.27051C13.2708 7.43717 13.0729 7.51704 12.8438 7.51009C12.6146 7.50315 12.4167 7.41634 12.25 7.24967C12.0972 7.08301 12.0174 6.88856 12.0104 6.66634C12.0035 6.44412 12.0833 6.24967 12.25 6.08301L14.4167 3.91634C14.5 3.83301 14.5903 3.77398 14.6875 3.73926C14.7847 3.70454 14.8889 3.68717 15 3.68717C15.1111 3.68717 15.2153 3.70454 15.3125 3.73926C15.4097 3.77398 15.5 3.83301 15.5833 3.91634L17.75 6.08301C17.9167 6.24967 17.9965 6.44412 17.9896 6.66634C17.9826 6.88856 17.9028 7.08301 17.75 7.24967C17.5833 7.41634 17.3854 7.50315 17.1563 7.51009C16.9271 7.51704 16.7292 7.43717 16.5625 7.27051L15.8333 6.54134V12.4997C15.8333 13.4163 15.507 14.2011 14.8542 14.8538C14.2014 15.5066 13.4167 15.833 12.5 15.833C11.5833 15.833 10.7986 15.5066 10.1458 14.8538C9.49307 14.2011 9.16668 13.4163 9.16668 12.4997V6.66634C9.16668 6.20801 9.00348 5.81565 8.67709 5.48926C8.3507 5.16287 7.95834 4.99967 7.50001 4.99967C7.04168 4.99967 6.64932 5.16287 6.32293 5.48926C5.99654 5.81565 5.83334 6.20801 5.83334 6.66634V12.6247L6.56251 11.8955C6.72918 11.7288 6.92709 11.649 7.15626 11.6559C7.38543 11.6629 7.58334 11.7497 7.75001 11.9163C7.90279 12.083 7.98265 12.2775 7.98959 12.4997C7.99654 12.7219 7.91668 12.9163 7.75001 13.083L5.58334 15.2497C5.50001 15.333 5.40973 15.392 5.31251 15.4268C5.21529 15.4615 5.11112 15.4788 5.00001 15.4788C4.8889 15.4788 4.78473 15.4615 4.68751 15.4268C4.59029 15.392 4.50001 15.333 4.41668 15.2497L2.25001 13.083C2.08334 12.9163 2.00348 12.7219 2.01043 12.4997C2.01737 12.2775 2.09723 12.083 2.25001 11.9163C2.41668 11.7497 2.61459 11.6629 2.84376 11.6559C3.07293 11.649 3.27084 11.7288 3.43751 11.8955L4.16668 12.6247Z" />
    </svg>
  )
}

export const InstasettleIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M13 2L6 14H11V22L18 10H13V2Z" />
    </svg>
  )
}

export const InstasettleIconGradient = ({
  className,
}: {
  className?: string
}) => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="url(#instasettle-gradient)"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="instasettle-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#29e6ad" />
          <stop offset="100%" stopColor="#15cfcb" />
        </linearGradient>
      </defs>
      <path d="M13 2L6 14H11V22L18 10H13V2Z" />
    </svg>
  )
}

export const LiveStatisticsIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect
        x="10"
        y="2"
        width="4"
        height="2"
        rx="1"
        fill="currentColor"
        fill-opacity="0.72"
      />
      <rect
        x="3"
        y="14"
        width="18"
        height="2"
        rx="1"
        fill="currentColor"
        fill-opacity="0.72"
      />
      <rect
        x="6"
        y="5"
        width="12"
        height="2"
        rx="1"
        fill="currentColor"
        fill-opacity="0.72"
      />
      <rect
        x="6"
        y="17"
        width="12"
        height="2"
        rx="1"
        fill="currentColor"
        fill-opacity="0.72"
      />
      <rect
        x="3"
        y="8"
        width="18"
        height="2"
        rx="1"
        fill="currentColor"
        fill-opacity="0.72"
      />
      <rect
        x="10"
        y="20"
        width="4"
        height="2"
        rx="1"
        fill="currentColor"
        fill-opacity="0.72"
      />
      <rect
        x="2"
        y="11"
        width="20"
        height="2"
        rx="1"
        fill="currentColor"
        fill-opacity="0.72"
      />
    </svg>
  )
}

// Animation 2: Typewriter Effect
export const TypewriterIcon = ({ className }: { className?: string }) => {
  const bars = [
    { x: '10', y: '2', width: '4', height: '2' },
    { x: '6', y: '5', width: '12', height: '2' },
    { x: '3', y: '8', width: '18', height: '2' },
    { x: '2', y: '11', width: '20', height: '2' },
    { x: '3', y: '14', width: '18', height: '2' },
    { x: '6', y: '17', width: '12', height: '2' },
    { x: '10', y: '20', width: '4', height: '2' },
  ]

  return (
    <motion.svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {bars.map((bar, index) => (
        <motion.rect
          key={index}
          x={bar.x}
          y={bar.y}
          width={bar.width}
          height={bar.height}
          rx="1"
          fill="currentColor"
          animate={{
            scaleX: [0, 1, 1, 1, 0],
            opacity: [0, 0.72, 0.72, 0.72, 0],
          }}
          transition={{
            duration: 3.5,
            delay: index * 0.2,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'easeInOut',
            times: [0, 0.2, 0.6, 0.8, 1],
          }}
          style={{ originX: 0 }}
        />
      ))}
    </motion.svg>
  )
}

export const TypewriterIconWithoutAnimation = ({
  className,
}: {
  className?: string
}) => {
  const bars = [
    { x: '10', y: '2', width: '4', height: '2' },
    { x: '6', y: '5', width: '12', height: '2' },
    { x: '3', y: '8', width: '18', height: '2' },
    { x: '2', y: '11', width: '20', height: '2' },
    { x: '3', y: '14', width: '18', height: '2' },
    { x: '6', y: '17', width: '12', height: '2' },
    { x: '10', y: '20', width: '4', height: '2' },
  ]

  return (
    <motion.svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* SVG Gradient Definition */}
      <defs>
        <linearGradient id="typewriter-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#29e6ad" />
          <stop offset="100%" stopColor="#15cfcb" />
        </linearGradient>
      </defs>

      {/* Animated bars with gradient fill */}
      {bars.map((bar, index) => (
        <motion.rect
          key={index}
          x={bar.x}
          y={bar.y}
          width={bar.width}
          height={bar.height}
          rx="1"
          fill="url(#typewriter-gradient)"
          transition={{
            duration: 3.5,
            delay: index * 0.2,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'easeInOut',
            times: [0, 0.2, 0.6, 0.8, 1],
          }}
          style={{ originX: 0 }}
        />
      ))}
    </motion.svg>
  )
}

export const SwitchOffIcon = ({
  className,
  onClick,
}: {
  className?: string
  onClick?: () => void
}) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      onClick={onClick}
    >
      <path
        d="M8 7.3335C7.63133 7.3335 7.33333 7.03483 7.33333 6.66683V2.00016C7.33333 1.63216 7.63133 1.3335 8 1.3335C8.36867 1.3335 8.66667 1.63216 8.66667 2.00016V6.66683C8.66667 7.03483 8.36867 7.3335 8 7.3335ZM14 8.66683C14 6.5375 12.8506 4.5462 11.002 3.47087C10.6833 3.28553 10.2753 3.39343 10.0907 3.71143C9.90532 4.03009 10.0134 4.43822 10.3314 4.62288C11.772 5.46088 12.6667 7.01083 12.6667 8.66683C12.6667 11.2402 10.5727 13.3335 8 13.3335C5.42733 13.3335 3.33333 11.2402 3.33333 8.66683C3.33333 7.01083 4.22795 5.46088 5.66862 4.62288C5.98729 4.43822 6.09534 4.02943 5.90934 3.71143C5.72334 3.39343 5.31538 3.2842 4.99805 3.47087C3.14938 4.54687 2 6.5375 2 8.66683C2 11.9748 4.69133 14.6668 8 14.6668C11.3087 14.6668 14 11.9748 14 8.66683Z"
        fill="currentColor"
      ></path>
    </svg>
  )
}

export const FlameIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      // fill="currentColor"
      fill="url(#flame-gradient)"
      stroke="url(#flame-gradient)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <defs>
        <linearGradient id="flame-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#29e6ad" />
          <stop offset="100%" stopColor="#15cfcb" />
        </linearGradient>
      </defs>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  )
}

export const RefreshIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 2v6h-6"></path>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
      <path d="M3 22v-6h6"></path>
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
    </svg>
  )
}

export const HeadsetIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="url(#headset-gradient)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <defs>
        <linearGradient id="headset-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#29e6ad" />
          <stop offset="100%" stopColor="#15cfcb" />
        </linearGradient>
      </defs>
      <path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z" />
      <path d="M21 16v2a4 4 0 0 1-4 4h-5" />
    </svg>
  )
}

// export const InfoIcon = ({ className }: { className?: string }) => {
//   return (
//     <svg
//       width="14"
//       height="15"
//       viewBox="0 0 14 15"
//       fill="none"
//       xmlns="http://www.w3.org/2000/svg"
//       className={className}
//     >
//       <path
//         d="M6.99992 10.834C7.18881 10.834 7.34714 10.7701 7.47492 10.6423C7.6027 10.5145 7.66658 10.3562 7.66658 10.1673V7.50065C7.66658 7.31176 7.6027 7.15343 7.47492 7.02565C7.34714 6.89787 7.18881 6.83398 6.99992 6.83398C6.81103 6.83398 6.6527 6.89787 6.52492 7.02565C6.39714 7.15343 6.33325 7.31176 6.33325 7.50065V10.1673C6.33325 10.3562 6.39714 10.5145 6.52492 10.6423C6.6527 10.7701 6.81103 10.834 6.99992 10.834ZM6.99992 5.50065C7.18881 5.50065 7.34714 5.43676 7.47492 5.30898C7.6027 5.18121 7.66658 5.02287 7.66658 4.83398C7.66658 4.6451 7.6027 4.48676 7.47492 4.35898C7.34714 4.23121 7.18881 4.16732 6.99992 4.16732C6.81103 4.16732 6.6527 4.23121 6.52492 4.35898C6.39714 4.48676 6.33325 4.6451 6.33325 4.83398C6.33325 5.02287 6.39714 5.18121 6.52492 5.30898C6.6527 5.43676 6.81103 5.50065 6.99992 5.50065ZM6.99992 14.1673C6.0777 14.1673 5.21103 13.9923 4.39992 13.6423C3.58881 13.2923 2.88325 12.8173 2.28325 12.2173C1.68325 11.6173 1.20825 10.9118 0.858252 10.1007C0.508252 9.28954 0.333252 8.42287 0.333252 7.50065C0.333252 6.57843 0.508252 5.71176 0.858252 4.90065C1.20825 4.08954 1.68325 3.38398 2.28325 2.78398C2.88325 2.18398 3.58881 1.70898 4.39992 1.35898C5.21103 1.00898 6.0777 0.833984 6.99992 0.833984C7.92214 0.833984 8.78881 1.00898 9.59992 1.35898C10.411 1.70898 11.1166 2.18398 11.7166 2.78398C12.3166 3.38398 12.7916 4.08954 13.1416 4.90065C13.4916 5.71176 13.6666 6.57843 13.6666 7.50065C13.6666 8.42287 13.4916 9.28954 13.1416 10.1007C12.7916 10.9118 12.3166 11.6173 11.7166 12.2173C11.1166 12.8173 10.411 13.2923 9.59992 13.6423C8.78881 13.9923 7.92214 14.1673 6.99992 14.1673Z"
//         fill="#767676"
//       />
//     </svg>
//   )
// }

// Update the InfoIcon component to accept and forward ref and other props
export const InfoIcon = React.forwardRef<
  SVGSVGElement,
  React.SVGProps<SVGSVGElement>
>(({ className, ...props }, ref) => {
  return (
    <svg
      width="14"
      height="15"
      viewBox="0 0 14 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      ref={ref} // Forward the ref
      {...props} // Spread any other props (like onClick, onMouseEnter, etc.)
    >
      <path
        d="M6.99992 10.834C7.18881 10.834 7.34714 10.7701 7.47492 10.6423C7.6027 10.5145 7.66658 10.3562 7.66658 10.1673V7.50065C7.66658 7.31176 7.6027 7.15343 7.47492 7.02565C7.34714 6.89787 7.18881 6.83398 6.99992 6.83398C6.81103 6.83398 6.6527 6.89787 6.52492 7.02565C6.39714 7.15343 6.33325 7.31176 6.33325 7.50065V10.1673C6.33325 10.3562 6.39714 10.5145 6.52492 10.6423C6.6527 10.7701 6.81103 10.834 6.99992 10.834ZM6.99992 5.50065C7.18881 5.50065 7.34714 5.43676 7.47492 5.30898C7.6027 5.18121 7.66658 5.02287 7.66658 4.83398C7.66658 4.6451 7.6027 4.48676 7.47492 4.35898C7.34714 4.23121 7.18881 4.16732 6.99992 4.16732C6.81103 4.16732 6.6527 4.23121 6.52492 4.35898C6.39714 4.48676 6.33325 4.6451 6.33325 4.83398C6.33325 5.02287 6.39714 5.18121 6.52492 5.30898C6.6527 5.43676 6.81103 5.50065 6.99992 5.50065ZM6.99992 14.1673C6.0777 14.1673 5.21103 13.9923 4.39992 13.6423C3.58881 13.2923 2.88325 12.8173 2.28325 12.2173C1.68325 11.6173 1.20825 10.9118 0.858252 10.1007C0.508252 9.28954 0.333252 8.42287 0.333252 7.50065C0.333252 6.57843 0.508252 5.71176 0.858252 4.90065C1.20825 4.08954 1.68325 3.38398 2.28325 2.78398C2.88325 2.18398 3.58881 1.70898 4.39992 1.35898C5.21103 1.00898 6.0777 0.833984 6.99992 0.833984C7.92214 0.833984 8.78881 1.00898 9.59992 1.35898C10.411 1.70898 11.1166 2.18398 11.7166 2.78398C12.3166 3.38398 12.7916 4.08954 13.1416 4.90065C13.4916 5.71176 13.6666 6.57843 13.6666 7.50065C13.6666 8.42287 13.4916 9.28954 13.1416 10.1007C12.7916 10.9118 12.3166 11.6173 11.7166 12.2173C11.1166 12.8173 10.411 13.2923 9.59992 13.6423C8.78881 13.9923 7.92214 14.1673 6.99992 14.1673Z"
        fill="#767676"
      />
    </svg>
  )
})

InfoIcon.displayName = 'InfoIcon' // Good practice for debugging

export const DocsIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M11.667 1.667H5c-0.92 0-1.667 0.747-1.667 1.667v13.333c0 0.92 0.747 1.667 1.667 1.667h10c0.92 0 1.667-0.747 1.667-1.667V6.667L11.667 1.667z" />
    </svg>
  )
}

export const DashboardIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M3.333 11.667h5V3.333h-5v8.334zm0 5h5v-3.334h-5v3.334zm6.667 0h5v-8.334h-5v8.334zm0-13.334v3.334h5V3.333h-5z" />
    </svg>
  )
}
