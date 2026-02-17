'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TOKENS_TYPE } from '@/app/lib/hooks/useWalletTokens'
import { useTokenList } from '@/app/lib/hooks/useTokenList'
import ImageFallback from '@/app/shared/ImageFallback'
import Modal from '../modal'
import SearchbarWithIcon from '../searchbarWithIcon'
import useDebounce from '@/app/lib/hooks/useDebounce'

interface TransactionsTokenFilterProps {
  onTokenFromChange: (token: TOKENS_TYPE | null) => void
  onTokenToChange: (token: TOKENS_TYPE | null) => void
  selectedTokenFrom: TOKENS_TYPE | null
  selectedTokenTo: TOKENS_TYPE | null
}

const TransactionsTokenFilter: React.FC<TransactionsTokenFilterProps> = ({
  onTokenFromChange,
  onTokenToChange,
  selectedTokenFrom,
  selectedTokenTo,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentField, setCurrentField] = useState<'from' | 'to'>('from')
  const [searchValue, setSearchValue] = useState('')
  const debouncedSearchValue = useDebounce(searchValue, 300)

  const { tokens } = useTokenList()

  const openModal = (field: 'from' | 'to') => {
    setCurrentField(field)
    setSearchValue('')
    setIsModalOpen(true)
  }

  const handleTokenSelect = (token: TOKENS_TYPE | null) => {
    if (currentField === 'from') {
      onTokenFromChange(token)
    } else {
      onTokenToChange(token)
    }
    setIsModalOpen(false)
  }

  const clearFilter = (field: 'from' | 'to') => {
    if (field === 'from') {
      onTokenFromChange(null)
    } else {
      onTokenToChange(null)
    }
  }

  const filteredTokens = tokens.filter((token) => {
    const query = debouncedSearchValue.toLowerCase()
    if (!query) return true
    return (
      token.symbol.toLowerCase().includes(query) ||
      token.name.toLowerCase().includes(query) ||
      token.token_address.toLowerCase().includes(query)
    )
  })

  // Handle image loading errors
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = '/icons/default-token.svg'
  }

  const TokenButton = ({
    token,
    field,
    label,
  }: {
    token: TOKENS_TYPE | null
    field: 'from' | 'to'
    label: string
  }) => (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-white/50 uppercase">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => openModal(field)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
            token
              ? 'bg-[#1a1a1a] border-primary/50 hover:border-primary'
              : 'bg-[#1a1a1a] border-[#373d3f] hover:border-white/30'
          )}
        >
          {token ? (
            <>
              <ImageFallback
                src={
                  token.symbol.toLowerCase() === 'usdt'
                    ? '/tokens/usdt.svg'
                    : token.icon || '/icons/default-token.svg'
                }
                width={20}
                height={20}
                alt={token.symbol}
                className="w-5 h-5 rounded-full"
              />
              <span className="text-white font-medium">{token.symbol}</span>
            </>
          ) : (
            <span className="text-white/50">All Tokens</span>
          )}
          <ChevronDown className="w-4 h-4 text-white/50" />
        </button>
        {token && (
          <button
            onClick={() => clearFilter(field)}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
            title="Clear filter"
          >
            <X className="w-4 h-4 text-white/50 hover:text-white" />
          </button>
        )}
      </div>
    </div>
  )

  return (
    <>
      <div className="flex flex-wrap items-end gap-6 p-4 rounded-xl bg-black border border-[#373d3f]">
        <TokenButton token={selectedTokenFrom} field="from" label="From Token" />

        <div className="flex items-center pb-2">
          <Image
            src="/icons/right-arrow.svg"
            width={16}
            height={16}
            alt="arrow"
            className="opacity-50"
          />
        </div>

        <TokenButton token={selectedTokenTo} field="to" label="To Token" />

        {(selectedTokenFrom || selectedTokenTo) && (
          <button
            onClick={() => {
              onTokenFromChange(null)
              onTokenToChange(null)
            }}
            className="text-sm text-white/50 hover:text-primary transition-colors pb-2"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Token Select Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="p-6 pb-0 h-full">
          <div className="flex justify-between gap-2">
            <div className="text-xl font-medium">
              Select {currentField === 'from' ? 'From' : 'To'} Token
            </div>
            <Image
              src="/icons/close.svg"
              alt="close"
              className="w-3 cursor-pointer"
              width={12}
              height={12}
              onClick={() => setIsModalOpen(false)}
            />
          </div>

          {/* Search bar */}
          <div className="my-4">
            <SearchbarWithIcon
              onChange={(e) => setSearchValue(e.target.value)}
              value={searchValue}
              setValue={(e: any) => setSearchValue(e)}
              placeholder="Search by name, symbol, or address"
            />
          </div>

          {/* Token list */}
          <div className="h-[55vh] overflow-y-auto scrollbar-hide pb-5">
            {/* All Tokens option */}
            <div
              onClick={() => handleTokenSelect(null)}
              className="w-full flex items-center min-h-[62px] hover:bg-neutral-800 cursor-pointer px-[10px] gap-[12px] rounded-[15px] transition-colors"
            >
              <div className="w-[40px] h-[40px] rounded-full bg-[#373d3f] flex items-center justify-center">
                <span className="text-xs text-white/70">ALL</span>
              </div>
              <div className="flex-1">
                <p className="text-[18px] p-0 leading-tight">All Tokens</p>
                <p className="text-[14px] text-[#adadad] p-0 leading-tight">
                  Show all transactions
                </p>
              </div>
            </div>

            {/* Token list */}
            <div className="flex flex-col gap-1 mt-2">
              {filteredTokens.length === 0 ? (
                <div className="text-center p-4 text-white/50">
                  No tokens found matching "{debouncedSearchValue}"
                </div>
              ) : (
                filteredTokens.map((token: TOKENS_TYPE) => {
                  const isSelected =
                    (currentField === 'from' &&
                      selectedTokenFrom?.token_address === token.token_address) ||
                    (currentField === 'to' &&
                      selectedTokenTo?.token_address === token.token_address)

                  return (
                    <div
                      key={token.token_address}
                      onClick={() => handleTokenSelect(token)}
                      className={cn(
                        'w-full flex items-center min-h-[62px] px-[10px] gap-[12px] rounded-[15px] transition-colors cursor-pointer',
                        isSelected
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-neutral-800'
                      )}
                    >
                      <div className="relative h-fit">
                        <Image
                          src={
                            token.symbol.toLowerCase() === 'usdt'
                              ? '/tokens/usdt.svg'
                              : token.icon || '/icons/default-token.svg'
                          }
                          alt={token.name}
                          className="w-[40px] h-[40px] rounded-full"
                          width={40}
                          height={40}
                          onError={handleImageError}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-[18px] p-0 leading-tight">{token.name}</p>
                        <p className="text-[14px] uppercase text-[#adadad] p-0 leading-tight">
                          {token.symbol}
                        </p>
                      </div>
                      {token.usd_price > 0 && (
                        <div className="text-right">
                          <p className="text-[14px] text-white/70">
                            ${token.usd_price.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default TransactionsTokenFilter
