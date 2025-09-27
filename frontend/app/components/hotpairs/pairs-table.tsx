import Button from '../button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { useMemo, useState } from 'react'
import { useEnhancedTokenPairs } from '@/app/lib/hooks/hotpairs/useEnhancedTokens'
import { useTokenList } from '@/app/lib/hooks/useTokenList'
import { Skeleton } from '@/components/ui/skeleton'
import { useRouter } from 'next/navigation'
import ImageFallback from '@/app/shared/ImageFallback'

export default function PairsTable({
  selectedTokenAddress,
}: {
  selectedTokenAddress: string
}) {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const limit = 20

  // Fetch token pairs for the selected token address
  const {
    data: tokenPairsData,
    isLoading: isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useEnhancedTokenPairs({
    address: selectedTokenAddress,
    page,
    limit,
    enabled: !!selectedTokenAddress, // Only fetch when we have a selected token
  })

  const pairsData = tokenPairsData?.data || []
  const pagination = tokenPairsData?.pagination

  // const isLoading = true

  const handleMainStreamClick = (pair: any) => {
    // Navigate to swaps page with active token pair as query parameters
    const searchParams = new URLSearchParams({
      from: pair.tokenASymbol,
      to: pair.tokenBSymbol,
    })

    router.push(`/?${searchParams.toString()}`)
  }

  return (
    <div className="dark bg-gray-950 my-10">
      <div className="mx-auto max-w-6xl rounded-lg border border-neutral-800 p-8">
        <h1 className="text-3xl font-bold text-white mb-8">All Pairs</h1>

        <div className="rounded-lg border-neutral-900 bg-gray-900/50 backdrop-blur">
          <ScrollArea className="w-full whitespace-nowrap">
            <Table className="overflow-hidden">
              <TableHeader className="overflow-hidden hover:bg-transparent">
                <TableRow className="!border-neutral-900 overflow-hidden hover:bg-transparent">
                  <TableHead className="text-left">Token Pair</TableHead>
                  <TableHead className="text-center">
                    Total DEX Reserve Depth
                  </TableHead>
                  <TableHead className="text-center">
                    Max DECASlip Savings
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && !pairsData.length ? (
                  Array(5)
                    .fill(0)
                    .map((_, index) => (
                      <TableRow key={`skeleton-${index}`}>
                        <TableCell className="font-medium text-center group">
                          <div className="flex items-center gap-8 w-full justify-start">
                            <div className="flex items-center gap-4 justify-start">
                              <div
                                className={cn(
                                  'flex items-center transition-all duration-300'
                                )}
                              >
                                <Skeleton className="w-8 h-8 rounded-full flex items-center justify-center z-10" />
                                <Skeleton className="w-8 h-8 rounded-full flex items-center justify-center ml-1 z-10" />
                              </div>

                              <Skeleton className="w-16 h-4" />
                            </div>

                            <Skeleton className="w-16 h-4" />
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <Skeleton className="w-16 h-4" />
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <Skeleton className="w-16 h-4" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                ) : !isLoading && pairsData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <div className="text-white52 text-center py-8">
                        No pairs found
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pairsData.map((pair: any) => {
                    return (
                      <TableRow key={pair.id}>
                        <TableCell className="font-medium text-center group">
                          <div className="flex items-center gap-8 w-full justify-start">
                            <div className="flex items-center gap-4 justify-start">
                              <div
                                className={cn(
                                  'flex items-center transition-all duration-300'
                                )}
                              >
                                {/* Ethereum icon */}
                                <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#827a7a33] z-10 overflow-hidden">
                                  <ImageFallback
                                    src={pair.tokenAIcon}
                                    alt="eth"
                                    width={100}
                                    height={100}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div
                                  className={cn(
                                    'w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#827a7a33] -ml-3 transition-all duration-300 overflow-hidden'
                                  )}
                                >
                                  <ImageFallback
                                    src={pair.tokenBIcon}
                                    alt="dai"
                                    width={100}
                                    height={100}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              </div>
                              <h2 className="text-white text-xl font-semibold min-w-[8rem] text-left">
                                {pair.tokenASymbol.toUpperCase()} /{' '}
                                {pair.tokenBSymbol.toUpperCase()}
                              </h2>
                            </div>

                            <Button
                              text="STREAM NOW"
                              className="h-9 max-w-14 text-[#40f798]"
                              onClick={() => handleMainStreamClick(pair)}
                            />
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          {pair.reserveAtotaldepth.toFixed(2)}
                        </TableCell>

                        <TableCell className="text-center">
                          ${' '}
                          {(
                            pair.slippageSavings * (pair.tokenBUsdPrice || 1)
                          ).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
