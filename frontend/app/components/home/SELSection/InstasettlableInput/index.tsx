'use client'

import { useState, useEffect } from 'react'
import { Check, X, Info } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { InfoIcon } from '@/app/lib/icons'

interface InstasettlableInputProps {
  defaultValue?: string
  onValueChange?: (value: string | null, confirmed: boolean) => void
  className?: string
}

export default function InstasettlableInput({
  defaultValue = '100',
  onValueChange,
  className,
}: InstasettlableInputProps) {
  const [enabled, setEnabled] = useState(false)
  const [value, setValue] = useState(defaultValue)
  const [confirmed, setConfirmed] = useState(false)
  const [tempValue, setTempValue] = useState(defaultValue)
  const [shouldAnimate, setshouldAnimate] = useState(false)

  useEffect(() => {
    if (onValueChange) {
      if (!enabled) {
        onValueChange(null, false)
      } else {
        onValueChange(tempValue, confirmed && tempValue === value)
      }
    }
  }, [enabled, value, tempValue, confirmed, onValueChange])

  const handleEnable = () => {
    setEnabled(true)
    setshouldAnimate(true)
    setTimeout(() => setshouldAnimate(false), 6000)
  }

  const handleConfirm = () => {
    setConfirmed(true)
    setValue(tempValue)
  }

  const handleInputChange = (newValue: string) => {
    setTempValue(newValue)
    setConfirmed(false)
  }

  const handleReset = () => {
    setEnabled(false)
    setValue(defaultValue)
    setTempValue(defaultValue)
    setConfirmed(false)
    setshouldAnimate(false)
  }

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="flex items-center gap-2">
        <span className="text-lg font-medium">Instasettlable</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoIcon className="h-4 w-4 cursor-help block" />
            </TooltipTrigger>
            <TooltipContent className="bg-zinc-800 text-white border-zinc-700">
              <p>
                Maximum price difference you're willing to accept for this trade
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="relative w-[120px]">
        {!enabled ? (
          <button
            onClick={handleEnable}
            className="w-full h-9 px-3 bg-zinc-800 hover:bg-zinc-700 transition-colors rounded-full text-zinc-400 text-sm font-medium flex items-center justify-center"
          >
            OFF
          </button>
        ) : (
          <div className="relative flex items-center">
            <div className="flex items-center gap-1 w-full">
              <button
                onClick={handleConfirm}
                className={cn(
                  'absolute left-3 z-10 transition-all duration-300',
                  !confirmed && tempValue !== value
                    ? 'cursor-pointer hover:scale-110'
                    : ''
                )}
                disabled={confirmed && tempValue === value}
              >
                <Check
                  className={cn(
                    'h-4 w-4 transition-colors duration-300',
                    confirmed && tempValue === value
                      ? 'text-[#40F798]'
                      : 'text-zinc-500',
                    shouldAnimate || (!confirmed && tempValue !== value)
                      ? 'animate-[scale-pulse_1.5s_ease-in-out_4]'
                      : ''
                  )}
                />
              </button>
              <Input
                type="text"
                value={tempValue}
                onChange={(e) => handleInputChange(e.target.value)}
                className={cn(
                  'pl-9 pr-14 border-zinc-700 rounded-full text-right bg-zinc-800',
                  confirmed && tempValue === value
                    ? 'text-[#40F798]'
                    : 'text-white'
                )}
                placeholder={defaultValue}
                autoFocus
              />
              <span className="absolute right-8 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                BPS
              </span>
              <button
                onClick={handleReset}
                className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-zinc-700 rounded-full p-1 transition-colors"
              >
                <X className="h-3 w-3 text-zinc-400 hover:text-white" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
