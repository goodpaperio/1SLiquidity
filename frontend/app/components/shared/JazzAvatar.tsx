import jazzicon from '@metamask/jazzicon'
import { useEffect, useRef } from 'react'

interface JazzAvatarProps {
  address: string
  diameter?: number
}

const JazzAvatar = ({ address, diameter = 40 }: JazzAvatarProps) => {
  const avatarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (address && avatarRef.current) {
      const seed = parseInt(address.slice(2, 10), 16)
      const icon = jazzicon(diameter, seed)
      avatarRef.current.innerHTML = ''
      avatarRef.current.appendChild(icon)
    }
  }, [address, diameter])

  return (
    <div
      ref={avatarRef}
      style={{ width: diameter, height: diameter }}
      className="rounded-full"
    />
  )
}

export default JazzAvatar
