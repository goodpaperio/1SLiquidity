'use client'
import ImageFallback from '@/app/shared/ImageFallback'
import { cn, formatNumberAdvanced } from '@/lib/utils'
import Image from 'next/image'
import {
  calculatePriceAccuracy,
  formatAccuracy,
} from '@/app/lib/utils/priceAccuracy'
import { useMemo } from 'react'
import { InfoIcon } from '@/app/lib/icons'

export default function CryptoCard2({
  pair,
  isActive,
}: {
  pair: any
  isActive: boolean
}) {
  const priceAccuracy = useMemo(() => {
    return calculatePriceAccuracy(pair)
  }, [pair])

  return (
    <div className="group relative rounded-md p-[1px] transition-all duration-300 cursor-pointer">
      <div
        className={cn(
          'absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300',
          isActive && 'opacity-100'
        )}
        style={{
          background: 'linear-gradient(87.35deg, #3F4542 2.21%, #33F498 100%)',
        }}
      ></div>

      <div
        className={cn(
          'relative z-10 p-3 rounded-md bg-gradient-to-b from-[#2C2D2E] to-[#292B2C] border border-[#3F4542] group-hover:border-transparent transition-colors duration-300',
          isActive && 'border-transparent'
        )}
      >
        <div className="flex flex-col gap-2">
          {/* Top section: Icons and Pair Name */}
          <div className="flex items-center gap-3 w-full justify-center">
            <div
              className={cn(
                'flex items-center transition-all duration-300',
                isActive ? 'translate-x-0' : 'group-hover:-translate-x-1'
              )}
            >
              {/* Ethereum icon */}
              <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#827a7a33] z-10 overflow-hidden">
                <ImageFallback
                  src={pair.tokenAIcon}
                  alt="TokenA Icon"
                  width={100}
                  height={100}
                  className="w-full h-full"
                />
              </div>

              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#827a7a33] -ml-3 transition-all duration-300 overflow-hidden',
                  isActive
                    ? 'translate-x-0 ml-0'
                    : 'group-hover:translate-x-0 group-hover:ml-0'
                )}
              >
                <ImageFallback
                  src={pair.tokenBIcon}
                  alt="TokenB Icon"
                  width={100}
                  height={100}
                  className="w-full h-full"
                />
              </div>
            </div>
            <h2 className="text-white text-xl font-semibold">
              {pair.tokenASymbol.toUpperCase()} /{' '}
              {pair.tokenBSymbol.toUpperCase()}
            </h2>
          </div>

          {/* Data Grid */}
          <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-x-2 w-full text-center items-center">
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
            <p className="text-zinc-400 text-lg font-bold">
              {formatNumberAdvanced(pair.reserveAtotaldepth)}
            </p>
            <div className="col-span-1"></div>{' '}
            {/* Empty div to align values under labels */}
            <p className="text-zinc-400 text-lg font-bold">
              {pair.percentageSavings?.toFixed(2) || 0} %
            </p>
            <div className="col-span-1"></div>{' '}
            {/* Empty div to align values under labels */}
            <p className="text-[#40FAAC] text-lg font-bold">
              $
              {formatNumberAdvanced(
                pair.slippageSavings * (pair.tokenBUsdPrice || 1)
              )}
            </p>
          </div>

          {/* Price Accuracy Section */}
          {priceAccuracy && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-center">
                <div className="w-3/4 h-[1px] bg-zinc-700" />
              </div>
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-1.5">
                  <p className="text-white text-xs uppercase tracking-wide">
                    Price Accuracy
                  </p>
                  <div className="relative group/tooltip" role="tooltip">
                    <InfoIcon className="h-3 w-3 cursor-help" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/tooltip:block w-56 p-2 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-300 z-50">
                      <div className="space-y-1">
                        <div>
                          <span className="text-[#40f798] font-semibold">
                            Green
                          </span>
                          : With DECASTREAM
                        </div>
                        <div>
                          <span className="text-[#ff6b6b] font-semibold">
                            Red
                          </span>
                          : Without DECASTREAM
                        </div>
                        <div className="text-zinc-400 mt-1 pt-1 border-t border-zinc-700">
                          Lorem ipsum, dolor sit amet consectetur
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[#40f798] font-bold text-sm">
                    {formatAccuracy(priceAccuracy.aToB)}
                  </span>
                  <span className="text-white">/</span>
                  <span className="text-[#ff6b6b] font-bold text-sm">
                    {formatAccuracy(priceAccuracy.bToA)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
