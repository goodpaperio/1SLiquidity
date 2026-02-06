'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import Image from 'next/image'

export default function CryptoCardSkeleton({
  className,
}: {
  className?: string
}) {
  return (
    <div
      className={cn(
        'group relative rounded-md p-[1px] transition-all duration-300 cursor-pointer',
        className
      )}
    >
      <div
        className={cn(
          'absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300'
        )}
        style={{
          background: 'linear-gradient(87.35deg, #3F4542 2.21%, #33F498 100%)',
        }}
      ></div>

      <div
        className={cn(
          'relative z-10 p-3 rounded-md bg-gradient-to-b from-[#2C2D2E] to-[#292B2C] border border-[#3F4542] group-hover:border-transparent transition-colors duration-300'
        )}
      >
        <div className="flex flex-col gap-2">
          {/* Top section: Icons and Pair Name */}
          <div className="flex items-center gap-3 w-full justify-center">
            <div className={cn('flex items-center')}>
              {/* Ethereum icon */}
              <Skeleton className="w-8 h-8 rounded-full flex items-center justify-center" />
              <Skeleton className="w-8 h-8 rounded-full flex items-center -ml-3 justify-center" />
            </div>
            <Skeleton className="w-16 h-6" />
          </div>

          {/* Data Grid */}
          <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-x-2 w-full text-center items-center place-items-center">
            {/* Labels */}
            <p className="text-white text-sm uppercase">VOL</p>
            <div className="flex justify-center items-center">
              <div className="w-4 h-[1px] bg-zinc-400" />{' '}
            </div>
            <p className="text-white text-sm uppercase">WIN</p>
            <div className="flex justify-center items-center">
              <div className="w-4 h-[1px] bg-zinc-400" />{' '}
            </div>
            <p className="text-white text-sm uppercase">SAVE</p>
            <Skeleton className="w-12 h-4 rounded-sm mt-2" />
            <div className="col-span-1" />
            <Skeleton className="w-12 h-4 rounded-sm mt-2" />
            <div className="col-span-1" />
            <Skeleton className="w-12 h-4 rounded-sm mt-2" />
          </div>
        </div>
      </div>
    </div>
  )
}
