'use client'

import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import Button from '../button'

export default function LoadingPairCard() {
  return (
    <div className="group relative rounded-md p-[2px] max-w-[18rem]">
      <div
        className={cn('relative z-10 p-3 rounded-md border border-[#012B32]')}
        style={{
          background:
            'linear-gradient(96.29deg, rgba(2, 11, 16, 0.18) 4.96%, rgba(0, 94, 78, 0.18) 96.89%)',
        }}
      >
        <div className="flex flex-col gap-3">
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
              {/* The longer dashbar */}
            </div>
            <p className="text-white text-sm uppercase">WIN</p>
            <div className="flex justify-center items-center">
              <div className="w-4 h-[1px] bg-zinc-400" />{' '}
              {/* The longer dashbar */}
            </div>
            <p className="text-white text-sm uppercase">SAVE</p>
            {/* Values */}
            <Skeleton className="w-12 h-4 rounded-sm mt-2" />
            <div className="col-span-1"></div>{' '}
            <Skeleton className="w-12 h-4 rounded-sm mt-2" />
            <div className="col-span-1"></div>{' '}
            <Skeleton className="w-12 h-4 rounded-sm mt-2" />
          </div>

          <div className="mt-2">
            <Button
              text="STREAM NOW"
              className="h-9 w-full text-[#0c3526] !border-none"
              disabled
            />
          </div>
        </div>
      </div>
    </div>
  )
}
