'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const ExplorerNav = () => {
  const pathname = usePathname()

  const navItems = [
    { label: 'Overview', href: '/dashboard' },
    { label: 'Transactions', href: '/transactions' },
  ]

  return (
    <div className="w-full border-b border-[#373d3f] bg-black/80 backdrop-blur-sm relative z-20">
      <div className="mx-auto max-w-6xl px-4 flex items-center justify-between h-12">
        {/* Left side - Logo and title */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src="/assets/logo.svg"
            alt="logo"
            className="w-10 h-10"
            width={40}
            height={40}
          />
          <span className="text-white font-semibold">DECAStream</span>
          <span className="text-white/50">Explorer</span>
        </Link>

        {/* Right side - Navigation */}
        <nav className="flex items-center gap-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'text-sm font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-white/70 hover:text-white'
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

export default ExplorerNav
