'use client'
import { NAV_LINKS } from '@/app/lib/constants'
import { HomeIcon, InstasettleIcon, SwapsIcon } from '@/app/lib/icons'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'
import { FireIcon } from '../../home/SELSection/HotPair/fire-icon'

type MobileNavigationProps = {
  isOpen: boolean
  onClose: () => void
  children?: React.ReactNode
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  isOpen,
  onClose,
  children,
}) => {
  const pathname = usePathname()

  return (
    <div
      className={`fixed top-0 left-0 h-screen w-[85vw] md:w-96 bg-black z-[60] sidebar-shadow transition-transform transform ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="p-4 h-full flex flex-col">
        <div
          onClick={onClose}
          className={`bg-[#232624] cursor-pointer rounded-full p-2 absolute top-6 z-50 ${
            isOpen ? '-right-3' : 'left-3'
          }`}
        >
          <Image
            src={'/icons/close.svg'}
            alt="close"
            className="w-2"
            width={1000}
            height={1000}
            onClick={onClose}
          />
        </div>

        <div className="flex flex-col h-full">
          <div className="w-full h-14 border-b border-primary flex-shrink-0">
            {/* <Link
              href={''}
              className="w-10 h-10 bg-white rounded-[12px] flex items-center justify-center"
            >
              <Image
                src="/assets/logo.svg"
                alt="logo"
                className="w-fit h-fit"
                width={40}
                height={40}
              />
            </Link> */}

            <Link
              href="/"
              className="rounded-[12px] flex items-center hover:shadow-lg hover:shadow-blackGradient bg-opacity-[12%] group text-white transition-all duration-300 justify-center px-2"
            >
              <Image
                src="/assets/logo.svg"
                alt="logo"
                className="w-10 h-10"
                width={40}
                height={40}
              />
              <span className="self-center text-2xl font-bold text-white tracking-wide">
                DECAStream
              </span>
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto scroll-hidden mt-10">
            <div className="h-14 w-full px-[6px] py-[3px] flex flex-col rounded-[12px] gap-4">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.title}
                  href={link.href}
                  className={cn(
                    `flex gap-[6px] justify-center items-center border-primary py-[10px] px-[9px] rounded-[8px]`,
                    (
                      link.href === '/'
                        ? pathname === link.href
                        : pathname.startsWith(link.href) && pathname !== '/'
                    )
                      ? ' bg-secondary text-primary'
                      : '',
                    link.title === 'Hot Pairs' && 'gap-[8px]'
                  )}
                >
                  {/* <Image
                    src={
                      (
                        link.href === '/'
                          ? pathname === link.href
                          : pathname.startsWith(link.href) && pathname !== '/'
                      )
                        ? link.icon.replace('.svg', '-black.svg')
                        : link.icon
                    }
                    alt={link.title}
                    className="w-fit h-fit"
                    width={20}
                    height={20}
                  /> */}

                  {link.title === 'Home' && (
                    <HomeIcon
                      className={cn(
                        'w-4.5 h-4.5 text-white',
                        pathname === link.href && 'text-primary'
                      )}
                    />
                  )}
                  {link.title === 'Stream' && (
                    <SwapsIcon
                      className={cn(
                        'w-4.5 h-4.5 text-white',
                        pathname === link.href && 'text-primary'
                      )}
                    />
                  )}
                  {link.title === 'Instasettle' && (
                    <InstasettleIcon
                      className={cn(
                        'w-4.5 h-4.5 text-white',
                        pathname === link.href && 'text-primary'
                      )}
                    />
                  )}

                  {link.title === 'Hot Pairs' && (
                    <FireIcon
                      className={cn(
                        'w-4.5 h-4.5 text-white',
                        pathname === link.href && 'text-primary'
                      )}
                      isActive={pathname === link.href}
                    />
                  )}
                  <span>{link.title}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MobileNavigation
