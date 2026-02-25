'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const ExplorerNav = () => {
  const pathname = usePathname()
  const navRef = useRef<HTMLDivElement>(null)
  const [isFixed, setIsFixed] = useState(false)
  const [navTop, setNavTop] = useState(0)

  const navItems = [
    { label: 'Overview', href: '/dashboard' },
    { label: 'Transactions', href: '/transactions' },
  ]

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return

    // Store the initial top position
    const initialTop = nav.offsetTop
    setNavTop(initialTop)

    const handleScroll = () => {
      if (window.scrollY >= initialTop) {
        setIsFixed(true)
      } else {
        setIsFixed(false)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Check initial state

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      {/* Placeholder to prevent content jump when nav becomes fixed */}
      {isFixed && <div style={{ height: '48px' }} />}

      <div
        ref={navRef}
        className={cn(
          'w-full border-b border-[#373d3f] bg-black backdrop-blur-sm z-50',
          isFixed && 'fixed top-0 left-0 right-0'
        )}
      >
        <div className="mx-auto max-w-6xl px-4 flex items-center justify-between h-12">
          {/* Left side - Logo and title */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div
              className={cn(
                'overflow-hidden transition-all duration-300 ease-out',
                isFixed ? 'w-8 opacity-100' : 'w-0 opacity-0'
              )}
            >
              <Image
                src="/assets/logo.svg"
                alt="logo"
                className="w-8 h-8"
                width={32}
                height={32}
              />
            </div>
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
    </>
  )
}

export default ExplorerNav
