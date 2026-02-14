'use client'

import { NAV_LINKS } from '@/app/lib/constants'
import {
  DashboardIcon,
  DocsIcon,
  HomeIcon,
  InstasettleIcon,
  SwapsIcon,
  TypewriterIcon,
} from '@/app/lib/icons'
import { useSidebar } from '@/app/lib/context/sidebarContext'
import { useAppKit } from '@reown/appkit/react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useAccount } from 'wagmi'
import Button from '../button'
import Searchbar from '../searchbar'
import WalletButton from '../walletButton'
import MobileNavigation from './mobileNavigation'
import { cn } from '@/lib/utils'
import { FireIcon } from '../home/SELSection/HotPair/fire-icon'

type Props = {
  isBack?: boolean
  onBack?: () => void
}

const Navbar: React.FC<Props> = ({ isBack, onBack }) => {
  const { isConnected, address } = useAccount()
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const pathname = usePathname()
  const {
    showWalletDetailsSidebar,
    showGlobalStreamSidebar,
    isWalletDetailsSidebarOpen,
    isGlobalStreamSidebarOpen,
  } = useSidebar()

  const [searchValue, setSearchValue] = useState('')
  const { open } = useAppKit()
  const handleConnectWallet = () => {
    open()
  }

  return (
    <div className="px-4 sm:px-5 py-4 w-full flex gap-3 md:gap-0 justify-between relative z-[5555] overflow-visible">
      <div
        onClick={() => setIsMobileNavOpen(true)}
        className="md:hidden relative cursor-pointer top-0 left-0 w-6 h-6 rounded-[6px] flex items-center justify-center border-primary border-[2px]"
      >
        <Image
          src="/icons/arrow-down-white.svg"
          alt="menu"
          className="w-2 h-2 -rotate-90"
          width={20}
          height={20}
        />
      </div>

      <MobileNavigation
        isOpen={isMobileNavOpen}
        onClose={() => {
          setIsMobileNavOpen(false)
        }}
      />

      {/* logo section with nav links */}
      <div className="gap-[18px] w-fit h-fit md:flex hidden">
        <Link
          href="/"
          className="rounded-[12px] flex items-center bg-opacity-[12%] group text-white transition-all duration-300 justify-center px-2"
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

        {/* navlinks */}
        {isBack ? (
          <div
            className="flex gap-1 text-white cursor-pointer items-center"
            onClick={onBack}
          >
            <Image
              src={'/icons/right-arrow.svg'}
              alt="back"
              className="w-2.5 rotate-180"
              width={1000}
              height={1000}
            />
            <p>Back</p>
          </div>
        ) : (
          <div className="w-fit h-10 border-primary px-[6px] py-[3px] rounded-[12px] hidden md:flex gap-[6px]">
            {NAV_LINKS.map((link) =>
              link.title === '!' ? (
                <span
                  key={link.title}
                  className="flex gap-[6px] items-center py-[10px] px-[9px] rounded-[8px] text-gray-500 cursor-not-allowed opacity-60"
                  title="Coming soon"
                >
                  <Image
                    src={link.icon}
                    alt={link.title}
                    className="w-fit h-fit"
                    width={20}
                    height={20}
                  />
                  <span>{link.title}</span>
                </span>
              ) : (
                <Link
                  key={link.title}
                  href={link.href}
                  className={`flex gap-[6px] items-center py-[10px] transition-all duration-300 bg-opacity-[12%] px-[9px] rounded-[8px] ${
                    (
                      link.href === '/'
                        ? pathname === link.href
                        : pathname.startsWith(link.href) && pathname !== '/'
                    )
                      ? 'bg-secondary text-primary'
                      : 'hover:bg-[#2a2a2a]'
                  }`}
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
                  {link.title === 'Dashboard' && (
                    <DashboardIcon
                      className={cn(
                        'w-4.5 h-4.5 text-white',
                        pathname.startsWith(link.href) && 'text-primary'
                      )}
                    />
                  )}
                  {link.title === 'Docs' && (
                    <DocsIcon
                      className={cn(
                        'w-4.5 h-4.5 text-white',
                        pathname === link.href && 'text-primary'
                      )}
                    />
                  )}
                  <span>{link.title}</span>
                </Link>
              )
            )}
          </div>
        )}
      </div>

      {/* searchbar - centered for large screens */}
      {/* <div className="hidden lg:flex absolute left-1/2 transform -translate-x-1/2 z-0 items-center justify-center h-10 w-full max-w-[340px]">
        <Searchbar
          onChange={(e) => setSearchValue(e.target.value)}
          value={searchValue}
          setValue={(e: any) => setSearchValue(e)}
        />
      </div> */}

      {/* searchbar - for medium screens */}
      {/* <div className="hidden md:flex lg:hidden items-center h-10 w-full max-w-[200px]">
        <Searchbar
          onChange={(e) => setSearchValue(e.target.value)}
          value={searchValue}
          setValue={(e: any) => setSearchValue(e)}
        />
      </div> */}

      {/* live button and connect button */}
      <div className="flex gap-[10px] ">
        <div
          onClick={() => {
            showWalletDetailsSidebar(false)
            showGlobalStreamSidebar(!isGlobalStreamSidebarOpen)
          }}
          className={cn(
            'relative cursor-pointer h-10 rounded-[12px] flex items-center border-primary border-[2px] transition-all duration-300 w-auto px-3 justify-between gap-2',
            isGlobalStreamSidebarOpen
              ? 'border-success bg-successGradient'
              : 'hover:bg-[#2a2a2a]'
          )}
        >
          <span className="text-white text-sm whitespace-nowrap">
            Ongoing Trades
          </span>
          <TypewriterIcon className="w-6 h-6 text-primary flex-shrink-0" />
          {/* <div className="absolute w-[24px] h-[12px] bg-primaryRed -bottom-1.5 text-xs font-semibold uppercase flex items-center justify-center rounded-[2px]">
            LIVE
          </div> */}
        </div>

        {/* connect button */}
        {!isConnected ? (
          <>
            <Button text="Connect" onClick={handleConnectWallet} />
          </>
        ) : (
          <WalletButton
            address={address || ''}
            onClick={() => {
              showGlobalStreamSidebar(false)
              showWalletDetailsSidebar(!isWalletDetailsSidebarOpen)
            }}
            isWalletDetailsSidebarOpen={isWalletDetailsSidebarOpen}
          />
        )}
      </div>
    </div>
  )
}

export default Navbar
