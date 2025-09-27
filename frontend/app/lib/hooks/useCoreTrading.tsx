// hooks/useCoreTrading.ts
import { useState, useCallback } from 'react'
import { ethers } from 'ethers'
import { erc20Abi, parseUnits } from 'viem'
import { toast } from 'react-hot-toast'
import coreAbi from '../config/trade-core-abi.json'
import { useToast } from '../context/toastProvider'
import NotifiSwapStream from '@/app/components/toasts/notifiSwapStream'
import wethAbi from '../config/eth-contract-abi.json'

// Types
export interface TradeData {
  owner: string
  tokenIn: string
  tokenOut: string
  amountIn: string
  amountRemaining: string
  targetAmountOut: string
  realisedAmountOut: string
  isInstasettlable: boolean
  usePriceBased: boolean
  instasettleBps?: string
}

export interface PlaceTradeParams {
  tokenInObj: any
  tokenOutObj: any
  tokenIn: string
  tokenOut: string
  amountIn: string
  minAmountOut: string
  isInstasettlable: boolean
  usePriceBased: boolean
}

export interface InstasettleParams extends PlaceTradeParams {
  tradeId: number
  signer: ethers.Signer
}

export interface ContractInfo {
  owner: string
  streamDaemon: string
  executor: string
  registry: string
  lastTradeId: string
  maxBps: string
  maxFeeCapBps: string
  streamProtocolFeeBps: string
  streamBotFeeBps: string
  instasettleProtocolFeeBps: string
}

// Constants - You should move these to environment variables
const CORE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CORE_ADDRESS || ''
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'

export const useCoreTrading = () => {
  const [loading, setLoading] = useState(false)
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null)
  const { addToast, updateToast, removeToast } = useToast()

  // Helper function to get contract instance
  const getContract = useCallback((signer?: ethers.Signer) => {
    if (!CORE_CONTRACT_ADDRESS) {
      throw new Error('Core contract address not configured')
    }

    if (!signer) {
      // For read-only operations
      const provider = new ethers.providers.Web3Provider(
        (window as any).ethereum
      )
      return new ethers.Contract(CORE_CONTRACT_ADDRESS, coreAbi, provider)
    }

    return new ethers.Contract(CORE_CONTRACT_ADDRESS, coreAbi, signer)
  }, [])

  const getWethContract = useCallback((signer?: ethers.Signer) => {
    if (!WETH_ADDRESS) {
      throw new Error('Weth contract address not configured')
    }

    if (!signer) {
      // For read-only operations
      const provider = new ethers.providers.Web3Provider(
        (window as any).ethereum
      )
      return new ethers.Contract(WETH_ADDRESS, wethAbi, provider)
    }

    return new ethers.Contract(WETH_ADDRESS, wethAbi, signer)
  }, [])

  // Helper function to get token decimals
  const getTokenDecimals = useCallback(
    async (tokenAddress: string, signer: ethers.Signer): Promise<number> => {
      try {
        const tokenContract = new ethers.Contract(
          tokenAddress,
          erc20Abi,
          signer
        )
        return await tokenContract.decimals()
      } catch (error) {
        console.error('Error getting token decimals:', error)
        return 18 // Default to 18 decimals
      }
    },
    []
  )

  // Helper function to check token allowance
  const checkTokenAllowance = useCallback(
    async (
      tokenAddress: string,
      spender: string,
      amount: ethers.BigNumber,
      signer: ethers.Signer
    ): Promise<boolean> => {
      try {
        const tokenContract = new ethers.Contract(
          tokenAddress,
          erc20Abi,
          signer
        )
        const userAddress = await signer.getAddress()
        const allowance = await tokenContract.allowance(userAddress, spender)
        return allowance.gte(amount)
      } catch (error) {
        console.error('Error checking token allowance:', error)
        return false
      }
    },
    []
  )

  // Helper function to approve token
  const approveToken = useCallback(
    async (
      tokenAddress: string,
      spender: string,
      amount: ethers.BigNumber,
      signer: ethers.Signer
    ): Promise<boolean> => {
      try {
        toast.loading('Approving tokens...', { id: 'token-approval' })

        const tokenContract = new ethers.Contract(
          tokenAddress,
          erc20Abi,
          signer
        )
        const approveTx = await tokenContract.approve(spender, amount)
        await approveTx.wait()

        toast.success('Token approval successful!', { id: 'token-approval' })
        return true
      } catch (error: any) {
        toast.dismiss('token-approval')
        toast.error(`Token approval failed: ${error.reason || error.message}`)
        return false
      } finally {
        toast.dismiss('token-approval')
      }
    },
    []
  )

  // Get contract information
  const getContractInfo = useCallback(async () => {
    try {
      setLoading(true)
      const contract = getContract()

      const [
        owner,
        streamDaemon,
        executor,
        registry,
        lastTradeId,
        maxBps,
        maxFeeCapBps,
        streamProtocolFeeBps,
        streamBotFeeBps,
        instasettleProtocolFeeBps,
      ] = await Promise.all([
        contract.owner(),
        contract.streamDaemon(),
        contract.executor(),
        contract.registry(),
        contract.lastTradeId(),
        contract.MAX_BPS(),
        contract.MAX_FEE_CAP_BPS(),
        contract.streamProtocolFeeBps(),
        contract.streamBotFeeBps(),
        contract.instasettleProtocolFeeBps(),
      ])

      const info: ContractInfo = {
        owner,
        streamDaemon,
        executor,
        registry,
        lastTradeId: lastTradeId.toString(),
        maxBps: maxBps.toString(),
        maxFeeCapBps: maxFeeCapBps.toString(),
        streamProtocolFeeBps: streamProtocolFeeBps.toString(),
        streamBotFeeBps: streamBotFeeBps.toString(),
        instasettleProtocolFeeBps: instasettleProtocolFeeBps.toString(),
      }

      setContractInfo(info)
      return info
    } catch (error: any) {
      console.error('Error getting contract info:', error)
      toast.error(
        `Failed to get contract info: ${error.reason || error.message}`
      )
      return null
    } finally {
      setLoading(false)
    }
  }, [getContract])

  // Get trade information
  const getTrade = useCallback(
    async (tradeId: number): Promise<TradeData | null> => {
      try {
        const contract = getContract()
        const trade = await contract.getTrade(tradeId)

        return {
          owner: trade.owner,
          tokenIn: trade.tokenIn,
          tokenOut: trade.tokenOut,
          amountIn: ethers.utils.formatUnits(trade.amountIn),
          amountRemaining: ethers.utils.formatUnits(trade.amountRemaining),
          targetAmountOut: ethers.utils.formatUnits(trade.targetAmountOut),
          realisedAmountOut: ethers.utils.formatUnits(trade.realisedAmountOut),
          isInstasettlable: trade.isInstasettlable,
          usePriceBased: trade.usePriceBased,
          instasettleBps: trade.instasettleBps?.toString(),
        }
      } catch (error: any) {
        console.error(`Error getting trade ${tradeId}:`, error)
        toast.error(
          `Failed to get trade info: ${error.reason || error.message}`
        )
        return null
      }
    },
    [getContract]
  )

  // Get recent trades
  const getRecentTrades = useCallback(
    async (count: number = 5): Promise<TradeData[]> => {
      try {
        setLoading(true)
        const contract = getContract()
        const lastTradeId = await contract.lastTradeId()

        const trades: TradeData[] = []
        const tradeCount = Math.min(count, lastTradeId.toNumber())

        for (
          let i = Math.max(1, lastTradeId.toNumber() - tradeCount + 1);
          i <= lastTradeId.toNumber();
          i++
        ) {
          const trade = await getTrade(i)
          if (trade) {
            trades.push(trade)
          }
        }

        return trades
      } catch (error: any) {
        console.error('Error getting recent trades:', error)
        toast.error(
          `Failed to get recent trades: ${error.reason || error.message}`
        )
        return []
      } finally {
        setLoading(false)
      }
    },
    [getContract, getTrade]
  )

  // Place a trade
  const placeTrade = useCallback(
    async (
      params: PlaceTradeParams,
      signer: ethers.Signer
    ): Promise<{ success: boolean; tradeId?: number; txHash?: string }> => {
      console.log('placeTrademethod called 1')

      // Prevent multiple calls by checking loading state
      if (loading) {
        return { success: false }
      }

      const TOAST_ID = 'place-trade'

      // Helper function to update toast with progress
      const updateToastProgress = (
        step: string,
        progress: number,
        currentStep: number,
        isError: boolean = false
      ) => {
        const toastContent = (
          <NotifiSwapStream
            tokenInObj={params.tokenInObj}
            tokenOutObj={params.tokenOutObj}
            tokenIn={params.tokenInObj?.token_address || ''}
            tokenOut={params.tokenOutObj?.token_address || ''}
            amountIn={params.amountIn.toString()}
            amountOut={params.minAmountOut.toString()}
            step={step}
            progress={progress}
            currentStep={currentStep}
            totalSteps={4}
            isError={isError}
          />
        )

        addToast(toastContent, TOAST_ID, false) // Don't auto-close
      }

      console.log('placeTrademethod called 2')

      try {
        setLoading(true)
        const {
          tokenInObj,
          tokenOutObj,
          tokenIn,
          tokenOut,
          amountIn,
          minAmountOut,
          isInstasettlable,
          usePriceBased,
        } = params

        console.log('Params ===>', params)

        // Step 1: Initialize
        updateToastProgress('Preparing trade...', 10, 1)

        if (!CORE_CONTRACT_ADDRESS) {
          throw new Error('Core contract address not configured')
        }

        // Step 2: Get token decimals
        updateToastProgress('Getting token information...', 25, 2)
        console.log('Getting token decimals...')
        const tokenInDecimals = await getTokenDecimals(tokenIn, signer)
        const tokenOutDecimals = await getTokenDecimals(tokenOut, signer)
        console.log('Token decimals:', { tokenInDecimals, tokenOutDecimals })

        const amountInWei = ethers.utils.parseUnits(amountIn, tokenInDecimals)
        const minAmountOutWei = ethers.utils.parseUnits(
          minAmountOut,
          tokenOutDecimals
        )
        console.log('Amounts in Wei:', {
          amountInWei: amountInWei.toString(),
          minAmountOutWei: minAmountOutWei.toString(),
        })

        console.log('Wrapping tokens...', tokenOutObj)
        if (tokenOutObj.symbol === 'ETH' || tokenInObj.symbol === 'ETH') {
          let amountInEth = parseUnits(amountIn, 18)
          if (tokenOutObj.symbol === 'ETH') {
            amountInEth = parseUnits(minAmountOut, 18)
          }
          const wethContract = getWethContract(signer)
          const wrapTx = await wethContract.deposit({ value: amountInEth })
          await wrapTx.wait()
        }

        // Step 3: Check and handle token allowance
        updateToastProgress('Checking token allowance...', 40, 3)
        console.log('Checking token allowance...')
        const hasAllowance = await checkTokenAllowance(
          tokenIn,
          CORE_CONTRACT_ADDRESS,
          amountInWei,
          signer
        )
        console.log('Has allowance:', hasAllowance)

        // if (!hasAllowance) {
        //   updateToastProgress('Approving tokens...', 55, 3)
        //   console.log('Approving tokens...')
        //   const approved = await approveToken(
        //     tokenIn,
        //     CORE_CONTRACT_ADDRESS,
        //     amountInWei,
        //     signer
        //   )
        //   if (!approved) {
        //     return { success: false }
        //   }
        // }

        if (!hasAllowance) {
          updateToastProgress('Approving tokens...', 55, 3)
          console.log('Approving tokens...')

          // Handle token approval without react-hot-toast
          const tokenContract = new ethers.Contract(tokenIn, erc20Abi, signer)
          const approveTx = await tokenContract.approve(
            CORE_CONTRACT_ADDRESS,
            amountInWei
          )
          await approveTx.wait()
        }

        // Step 4: Prepare trade
        updateToastProgress('Preparing trade data...', 70, 4)
        console.log('Getting contract instance...')
        const contract = getContract(signer)

        // Encode trade data
        console.log('Encoding trade data...')
        console.log('Trade data ===>', {
          tokenIn,
          tokenOut,
          amountInWei,
          minAmountOutWei,
          isInstasettlable,
          usePriceBased,
        })

        const tradeData = ethers.utils.defaultAbiCoder.encode(
          ['address', 'address', 'uint256', 'uint256', 'bool', 'bool'],
          [
            tokenIn,
            tokenOut,
            amountInWei,
            minAmountOutWei,
            isInstasettlable,
            usePriceBased,
          ]
        )
        console.log('Trade data encoded')

        // Estimate gas
        console.log('Estimating gas...')
        const gasEstimate = await contract.estimateGas.placeTrade(tradeData)
        console.log('Gas estimate:', gasEstimate.toString())

        // Execute place trade
        updateToastProgress('Sending transaction...', 85, 4)
        console.log('Executing place trade...')
        const placeTradeTx = await contract.placeTrade(tradeData, {
          gasLimit: gasEstimate.mul(120).div(100), // 20% buffer
        })

        console.log('Transaction sent:', placeTradeTx.hash)
        updateToastProgress('Waiting for confirmation...', 95, 4)
        const receipt = await placeTradeTx.wait()
        console.log('Transaction confirmed! Block:', receipt.blockNumber)

        // Get trade ID from events
        const tradeCreatedEvent = receipt.events?.find(
          (e: any) => e.event === 'TradeCreated'
        )
        const tradeId = tradeCreatedEvent?.args?.tradeId?.toNumber()

        // Final success update
        updateToastProgress('Trade completed successfully!', 100, 4)

        // Auto-close success toast after 3 seconds
        setTimeout(() => {
          removeToast(TOAST_ID)
        }, 3000)

        return {
          success: true,
          tradeId,
          txHash: placeTradeTx.hash,
        }
      } catch (error: any) {
        console.error('Error placing trade:', error)
        // Show error in custom toast
        updateToastProgress(
          `Failed: ${error.reason || error.message}`,
          0,
          1,
          true
        )

        // Auto-close error toast after 5 seconds
        setTimeout(() => {
          removeToast(TOAST_ID)
        }, 5000)

        return { success: false }
      } finally {
        setLoading(false)
      }
    },
    [
      getContract,
      getTokenDecimals,
      checkTokenAllowance,
      addToast,
      removeToast,
      loading,
    ]
  )

  // Dummy method for testing toast updates
  const placeTradeDummy = useCallback(
    async (
      params: PlaceTradeParams,
      signer: ethers.Signer,
      testScenario: 'success' | 'error' | 'error-early' = 'success' // Easy test control
    ): Promise<{ success: boolean; tradeId?: number; txHash?: string }> => {
      const TOAST_ID = 'place-trade-dummy'

      // Helper function to update toast with progress
      const updateToastProgress = (
        step: string,
        progress: number,
        currentStep: number,
        isError: boolean = false
      ) => {
        const toastContent = (
          <NotifiSwapStream
            tokenInObj={params.tokenInObj}
            tokenOutObj={params.tokenOutObj}
            tokenIn={params.tokenInObj?.token_address || ''}
            tokenOut={params.tokenOutObj?.token_address || ''}
            amountIn={params.amountIn.toString()}
            amountOut={params.minAmountOut.toString()}
            step={step}
            progress={progress}
            currentStep={currentStep}
            totalSteps={4}
            isError={isError}
          />
        )

        addToast(toastContent, TOAST_ID, true, 5000) // Auto-close after 5 seconds
      }

      try {
        setLoading(true)

        // Step 1: Initialize
        updateToastProgress('Preparing trade...', 10, 1)
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Test early error scenario
        if (testScenario === 'error-early') {
          throw new Error('Early error: Contract not found')
        }

        // Step 2: Get token information
        updateToastProgress('Getting token information...', 25, 2)
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Test error scenario after 2 steps
        if (testScenario === 'error') {
          throw new Error('Transaction failed: Insufficient gas')
        }

        // Step 3: Check token allowance
        updateToastProgress('Checking token allowance...', 40, 3)
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Step 4: Approve tokens
        updateToastProgress('Approving tokens...', 55, 3)
        await new Promise((resolve) => setTimeout(resolve, 1500))

        // Step 5: Prepare trade
        updateToastProgress('Preparing trade data...', 70, 4)
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Step 6: Send transaction
        updateToastProgress('Sending transaction...', 85, 4)
        await new Promise((resolve) => setTimeout(resolve, 2000))

        // Step 7: Wait for confirmation
        updateToastProgress('Waiting for confirmation...', 95, 4)
        await new Promise((resolve) => setTimeout(resolve, 1500))

        // Final success update
        updateToastProgress('Trade completed successfully!', 100, 4)

        return {
          success: true,
          tradeId: Math.floor(Math.random() * 1000),
          txHash: '0x' + Math.random().toString(16).substr(2, 64),
        }
      } catch (error: any) {
        console.error('Error in dummy trade:', error)
        // Show error in custom toast
        updateToastProgress(`Failed: ${error.message}`, 0, 1, true)
        return { success: false }
      } finally {
        setLoading(false)
      }
    },
    [addToast]
  )

  // Cancel a trade
  const cancelTrade = useCallback(
    async (
      tradeId: number,
      signer: ethers.Signer
    ): Promise<{ success: boolean; txHash?: string }> => {
      const TOAST_ID = 'cancel-trade'

      try {
        setLoading(true)

        // Show cancelling toast
        addToast(
          <div className="text-white">Cancelling trade...</div>,
          TOAST_ID,
          false
        )

        const contract = getContract(signer)

        // Check if trade exists and get details
        const trade = await contract.getTrade(tradeId)
        const userAddress = await signer.getAddress()

        // Check if the caller is the trade owner
        if (trade.owner.toLowerCase() !== userAddress.toLowerCase()) {
          addToast(
            <div className="text-red-400">
              Only the trade owner can cancel this trade
            </div>,
            TOAST_ID,
            true,
            5000
          )
          return { success: false }
        }

        console.log('Cancelling trade...', trade)
        console.log('userAddress ===>', userAddress)

        // Estimate gas
        const gasEstimate = await contract.estimateGas.cancelTrade(tradeId)

        // Execute cancel trade
        const cancelTx = await contract.cancelTrade(tradeId, {
          gasLimit: gasEstimate.mul(120).div(100),
        })

        addToast(
          <div className="text-white">Waiting for confirmation...</div>,
          TOAST_ID,
          false
        )
        await cancelTx.wait()

        addToast(
          <div className="text-green-400">Trade cancelled successfully!</div>,
          TOAST_ID,
          true,
          3000
        )

        return {
          success: true,
          txHash: cancelTx.hash,
        }
      } catch (error: any) {
        console.error('Error cancelling trade:', error)
        addToast(
          <div className="text-red-400">
            Failed to cancel trade: {error.reason || error.message}
          </div>,
          TOAST_ID,
          true,
          5000
        )
        return { success: false }
      } finally {
        setLoading(false)
      }
    },
    [getContract, addToast]
  )

  const instasettle = useCallback(
    async (
      params: InstasettleParams,
      signer: ethers.Signer
    ): Promise<{ success: boolean; txHash?: string }> => {
      console.log('Instasettle params ===>', params)

      // Helper function to update toast with progress
      const updateToastProgress = (
        step: string,
        progress: number,
        currentStep: number,
        tokenInObj?: any,
        tokenOutObj?: any,
        amountIn?: string,
        amountOut?: string
      ) => {
        const toastContent = (
          <NotifiSwapStream
            tokenInObj={params.tokenInObj}
            tokenOutObj={params.tokenOutObj}
            tokenIn={params?.tokenIn || ''}
            tokenOut={params?.tokenOut || ''}
            amountIn={params.amountIn.toString()}
            amountOut={params.minAmountOut.toString()}
            step={step}
            progress={progress}
            currentStep={currentStep}
            totalSteps={5}
          />
        )

        addToast(toastContent, 'instasettle', false) // Don't auto-close
      }

      try {
        setLoading(true)

        // Step 1: Initialize
        updateToastProgress('Preparing instasettle...', 10, 1)

        const contract = getContract(signer)

        // Step 2: Get trade details
        updateToastProgress('Getting trade details...', 25, 2)
        const trade = await contract.getTrade(params.tradeId)

        console.log('trade ===>', trade)
        // Check if the trade is instasettlable
        if (!trade.isInstasettlable) {
          updateToastProgress('Trade is not instasettlable', 0, 1)
          // Auto-close error toast after 5 seconds
          setTimeout(() => {
            removeToast('instasettle')
          }, 5000)
          return { success: false }
        }

        // Calculate remaining amount
        const remainingAmountOut = trade.targetAmountOut.sub(
          trade.realisedAmountOut
        )
        if (remainingAmountOut.lte(0)) {
          updateToastProgress('No remaining amount to settle', 0, 1)
          // Auto-close error toast after 5 seconds
          setTimeout(() => {
            removeToast('instasettle')
          }, 5000)
          return { success: false }
        }

        // Calculate settler payment
        const settlerPayment = remainingAmountOut
          .mul(10000 - trade.instasettleBps)
          .div(10000)

        // Calculate protocol fee from settler payment
        const instasettleProtocolFeeBps =
          await contract.instasettleProtocolFeeBps()
        const protocolFee = settlerPayment
          .mul(instasettleProtocolFeeBps)
          .div(10000)

        // Total amount needed = settler payment + protocol fee
        const totalAmountNeeded = settlerPayment.add(protocolFee)

        // Get token decimals for display
        const tokenInDecimals = await getTokenDecimals(trade.tokenIn, signer)
        const tokenOutDecimals = await getTokenDecimals(trade.tokenOut, signer)

        console.log('tokenInDecimals ===>', tokenInDecimals)
        console.log('tokenOutDecimals ===>', tokenOutDecimals)
        console.log('trade.targetAmountIn ===>', trade.targetAmountIn)
        console.log('remainingAmountOut ===>', remainingAmountOut)
        console.log('settlerPayment ===>', settlerPayment)
        console.log('protocolFee ===>', protocolFee)
        console.log('totalAmountNeeded ===>', totalAmountNeeded)

        // Format amounts for display
        const amountInFormatted = ethers.utils.formatUnits(
          trade.amountIn,
          tokenInDecimals
        )
        const amountOutFormatted = ethers.utils.formatUnits(
          remainingAmountOut,
          tokenOutDecimals
        )

        // Create token objects for display (you may need to adjust this based on your token object structure)
        const tokenInObj = { token_address: trade.tokenIn }
        const tokenOutObj = { token_address: trade.tokenOut }

        // Step 3: Check balance
        updateToastProgress(
          'Checking balance...',
          40,
          3,
          tokenInObj,
          tokenOutObj,
          amountInFormatted,
          amountOutFormatted
        )

        const tokenOutContract = new ethers.Contract(
          trade.tokenOut,
          erc20Abi,
          signer
        )
        const userAddress = await signer.getAddress()
        const tokenOutBalance = await tokenOutContract.balanceOf(userAddress)

        if (tokenOutBalance.lt(totalAmountNeeded)) {
          updateToastProgress(
            `Insufficient balance. Required: ${ethers.utils.formatUnits(
              totalAmountNeeded,
              tokenOutDecimals
            )} (includes protocol fee)`,
            0,
            1,
            tokenInObj,
            tokenOutObj,
            amountInFormatted,
            amountOutFormatted
          )
          // Auto-close error toast after 5 seconds
          setTimeout(() => {
            removeToast('instasettle')
          }, 5000)
          return { success: false }
        }

        // Step 4: Check and handle allowance
        updateToastProgress(
          'Checking token allowance...',
          55,
          4,
          tokenInObj,
          tokenOutObj,
          amountInFormatted,
          amountOutFormatted
        )

        const hasAllowance = await checkTokenAllowance(
          trade.tokenOut,
          CORE_CONTRACT_ADDRESS,
          totalAmountNeeded,
          signer
        )

        if (!hasAllowance) {
          updateToastProgress(
            'Approving tokens...',
            70,
            4,
            tokenInObj,
            tokenOutObj,
            amountInFormatted,
            amountOutFormatted
          )
          // Handle token approval
          const tokenContract = new ethers.Contract(
            trade.tokenOut,
            erc20Abi,
            signer
          )
          const approveTx = await tokenContract.approve(
            CORE_CONTRACT_ADDRESS,
            totalAmountNeeded
          )
          await approveTx.wait()
        }

        // Step 5: Execute instasettle
        updateToastProgress(
          'Estimating gas...',
          80,
          5,
          tokenInObj,
          tokenOutObj,
          amountInFormatted,
          amountOutFormatted
        )
        console.log('tradeId:', params.tradeId, typeof params.tradeId)
        console.log('==== gasEstimate start ====')

        // Estimate gas
        const gasEstimate = await contract.estimateGas.instasettle(
          params.tradeId
        )

        console.log('==== gasEstimate end ====', gasEstimate)

        // Execute instasettle
        updateToastProgress(
          'Sending transaction...',
          90,
          5,
          tokenInObj,
          tokenOutObj,
          amountInFormatted,
          amountOutFormatted
        )

        const instasettleTx = await contract.instasettle(params.tradeId, {
          gasLimit: gasEstimate.mul(120).div(100),
        })

        updateToastProgress(
          'Waiting for confirmation...',
          95,
          5,
          tokenInObj,
          tokenOutObj,
          amountInFormatted,
          amountOutFormatted
        )

        await instasettleTx.wait()

        // Final success update
        updateToastProgress(
          'Instasettle completed successfully!',
          100,
          5,
          tokenInObj,
          tokenOutObj,
          amountInFormatted,
          amountOutFormatted
        )

        // Auto-close success toast after 3 seconds
        setTimeout(() => {
          removeToast('instasettle')
        }, 3000)

        return {
          success: true,
          txHash: instasettleTx.hash,
        }
      } catch (error: any) {
        console.error('Error instasettling trade:', error)
        // Show error in custom toast
        updateToastProgress(`Failed: ${error.reason || error.message}`, 0, 1)

        // Auto-close error toast after 5 seconds
        setTimeout(() => {
          removeToast('instasettle')
        }, 5000)

        return { success: false }
      } finally {
        setLoading(false)
      }
    },
    [getContract, getTokenDecimals, checkTokenAllowance, addToast, removeToast]
  )

  // Instasettle a trade
  // const instasettle = useCallback(
  //   async (
  //     params: InstasettleParams,
  //     signer: ethers.Signer
  //   ): Promise<{ success: boolean; txHash?: string }> => {
  //     console.log('Instasettle params ===>', params)

  //     // Helper function to update toast with progress
  //     const updateToastProgress = (
  //       step: string,
  //       progress: number,
  //       currentStep: number,
  //       tokenInObj?: any,
  //       tokenOutObj?: any,
  //       amountIn?: string,
  //       amountOut?: string
  //     ) => {
  //       const toastContent = (
  //         <NotifiSwapStream
  //           tokenInObj={params.tokenInObj}
  //           tokenOutObj={params.tokenOutObj}
  //           tokenIn={params?.tokenIn || ''}
  //           tokenOut={params?.tokenOut || ''}
  //           amountIn={params.amountIn.toString()}
  //           amountOut={params.minAmountOut.toString()}
  //           step={step}
  //           progress={progress}
  //           currentStep={currentStep}
  //           totalSteps={5}
  //         />
  //       )

  //       addToast(toastContent, 'instasettle', false) // Don't auto-close
  //     }

  //     try {
  //       setLoading(true)

  //       // Step 1: Initialize
  //       updateToastProgress('Preparing instasettle...', 10, 1)

  //       const contract = getContract(signer)

  //       // Step 2: Get trade details
  //       updateToastProgress('Getting trade details...', 25, 2)
  //       const trade = await contract.getTrade(params.tradeId)

  //       console.log('trade ===>', trade)
  //       // Check if the trade is instasettlable
  //       if (!trade.isInstasettlable) {
  //         updateToastProgress('Trade is not instasettlable', 0, 1)
  //         // Auto-close error toast after 5 seconds
  //         setTimeout(() => {
  //           removeToast('instasettle')
  //         }, 5000)
  //         return { success: false }
  //       }

  //       // Calculate remaining amount
  //       const remainingAmountOut = trade.targetAmountOut.sub(
  //         trade.realisedAmountOut
  //       )
  //       if (remainingAmountOut.lte(0)) {
  //         updateToastProgress('No remaining amount to settle', 0, 1)
  //         // Auto-close error toast after 5 seconds
  //         setTimeout(() => {
  //           removeToast('instasettle')
  //         }, 5000)
  //         return { success: false }
  //       }

  //       // Calculate settler payment
  //       const settlerPayment = remainingAmountOut
  //         .mul(10000 - trade.instasettleBps)
  //         .div(10000)

  //       // Get token decimals for display
  //       const tokenInDecimals = await getTokenDecimals(trade.tokenIn, signer)
  //       const tokenOutDecimals = await getTokenDecimals(trade.tokenOut, signer)

  //       console.log('tokenInDecimals ===>', tokenInDecimals)
  //       console.log('tokenOutDecimals ===>', tokenOutDecimals)
  //       console.log('trade.targetAmountIn ===>', trade.targetAmountIn)
  //       console.log('remainingAmountOut ===>', remainingAmountOut)

  //       // Format amounts for display
  //       const amountInFormatted = ethers.utils.formatUnits(
  //         trade.amountIn,
  //         tokenInDecimals
  //       )
  //       const amountOutFormatted = ethers.utils.formatUnits(
  //         remainingAmountOut,
  //         tokenOutDecimals
  //       )

  //       // Create token objects for display (you may need to adjust this based on your token object structure)
  //       const tokenInObj = { token_address: trade.tokenIn }
  //       const tokenOutObj = { token_address: trade.tokenOut }

  //       // Step 3: Check balance
  //       updateToastProgress(
  //         'Checking balance...',
  //         40,
  //         3,
  //         tokenInObj,
  //         tokenOutObj,
  //         amountInFormatted,
  //         amountOutFormatted
  //       )

  //       const tokenOutContract = new ethers.Contract(
  //         trade.tokenOut,
  //         erc20Abi,
  //         signer
  //       )
  //       const userAddress = await signer.getAddress()
  //       const tokenOutBalance = await tokenOutContract.balanceOf(userAddress)

  //       if (tokenOutBalance.lt(settlerPayment)) {
  //         updateToastProgress(
  //           `Insufficient balance. Required: ${ethers.utils.formatUnits(
  //             settlerPayment,
  //             tokenOutDecimals
  //           )}`,
  //           0,
  //           1,
  //           tokenInObj,
  //           tokenOutObj,
  //           amountInFormatted,
  //           amountOutFormatted
  //         )
  //         // Auto-close error toast after 5 seconds
  //         setTimeout(() => {
  //           removeToast('instasettle')
  //         }, 5000)
  //         return { success: false }
  //       }

  //       // Step 4: Check and handle allowance
  //       updateToastProgress(
  //         'Checking token allowance...',
  //         55,
  //         4,
  //         tokenInObj,
  //         tokenOutObj,
  //         amountInFormatted,
  //         amountOutFormatted
  //       )

  //       const hasAllowance = await checkTokenAllowance(
  //         trade.tokenOut,
  //         CORE_CONTRACT_ADDRESS,
  //         settlerPayment,
  //         signer
  //       )

  //       if (!hasAllowance) {
  //         updateToastProgress(
  //           'Approving tokens...',
  //           70,
  //           4,
  //           tokenInObj,
  //           tokenOutObj,
  //           amountInFormatted,
  //           amountOutFormatted
  //         )
  //         // Handle token approval
  //         const tokenContract = new ethers.Contract(
  //           trade.tokenOut,
  //           erc20Abi,
  //           signer
  //         )
  //         const approveTx = await tokenContract.approve(
  //           CORE_CONTRACT_ADDRESS,
  //           settlerPayment
  //         )
  //         await approveTx.wait()
  //       }

  //       // Step 5: Execute instasettle
  //       updateToastProgress(
  //         'Estimating gas...',
  //         80,
  //         5,
  //         tokenInObj,
  //         tokenOutObj,
  //         amountInFormatted,
  //         amountOutFormatted
  //       )
  //       console.log('tradeId:', params.tradeId, typeof params.tradeId)
  //       console.log('==== gasEstimate start ====')

  //       // Estimate gas
  //       const gasEstimate = await contract.estimateGas.instasettle(
  //         params.tradeId
  //       )

  //       console.log('==== gasEstimate end ====', gasEstimate)

  //       // Execute instasettle
  //       updateToastProgress(
  //         'Sending transaction...',
  //         90,
  //         5,
  //         tokenInObj,
  //         tokenOutObj,
  //         amountInFormatted,
  //         amountOutFormatted
  //       )

  //       const instasettleTx = await contract.instasettle(params.tradeId, {
  //         gasLimit: gasEstimate.mul(120).div(100),
  //       })

  //       updateToastProgress(
  //         'Waiting for confirmation...',
  //         95,
  //         5,
  //         tokenInObj,
  //         tokenOutObj,
  //         amountInFormatted,
  //         amountOutFormatted
  //       )

  //       await instasettleTx.wait()

  //       // Final success update
  //       updateToastProgress(
  //         'Instasettle completed successfully!',
  //         100,
  //         5,
  //         tokenInObj,
  //         tokenOutObj,
  //         amountInFormatted,
  //         amountOutFormatted
  //       )

  //       // Auto-close success toast after 3 seconds
  //       setTimeout(() => {
  //         removeToast('instasettle')
  //       }, 3000)

  //       return {
  //         success: true,
  //         txHash: instasettleTx.hash,
  //       }
  //     } catch (error: any) {
  //       console.error('Error instasettling trade:', error)
  //       // Show error in custom toast
  //       updateToastProgress(`Failed: ${error.reason || error.message}`, 0, 1)

  //       // Auto-close error toast after 5 seconds
  //       setTimeout(() => {
  //         removeToast('instasettle')
  //       }, 5000)

  //       return { success: false }
  //     } finally {
  //       setLoading(false)
  //     }
  //   },
  //   [getContract, getTokenDecimals, checkTokenAllowance, addToast, removeToast]
  // )

  // Get trades by token pair
  const getTradesByPair = useCallback(
    async (tokenIn: string, tokenOut: string): Promise<TradeData[]> => {
      try {
        setLoading(true)
        const contract = getContract()

        const pairId = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['address', 'address'],
            [tokenIn, tokenOut]
          )
        )

        const tradeIds = await contract.getPairIdTradeIds(pairId)
        const trades: TradeData[] = []

        for (const tradeId of tradeIds) {
          const trade = await getTrade(tradeId.toNumber())
          if (trade) {
            trades.push(trade)
          }
        }

        return trades
      } catch (error: any) {
        console.error('Error getting trades by pair:', error)
        toast.error(
          `Failed to get trades by pair: ${error.reason || error.message}`
        )
        return []
      } finally {
        setLoading(false)
      }
    },
    [getContract, getTrade]
  )

  return {
    // State
    loading,
    contractInfo,

    // Functions
    getContractInfo,
    getTrade,
    getRecentTrades,
    placeTrade,
    cancelTrade,
    instasettle,
    getTradesByPair,
    placeTradeDummy,

    // Helper functions (exported in case needed)
    getTokenDecimals,
    checkTokenAllowance,
    approveToken,
  }
}
