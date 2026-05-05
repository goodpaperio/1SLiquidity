/**
 * Compute Core contract storage slots for trades[1] to compare with Tenderly trace.
 * Run: npx ts-node scripts/compute-storage-slots.ts
 */

import { keccak256, toBeHex, zeroPadValue } from "ethers";

// Solidity mapping: slot for mapping[key] = keccak256(abi.encode(key, mappingSlot))
// abi.encode pads both to 32 bytes, left-aligned

// Core storage layout (need to count slots accurately):
// Ownable: slot 0 = _owner
// ReentrancyGuard: slot 1 = _status
// Core: slot 2 = streamDaemon, 3 = executor, 4 = registry, 5 = ethSupport
//       constants skip; slot 6 = packed uint16s (streamProtocolFeeBps etc)
//       slot 7 = EXECUTE_STREAM_TRADE_CAP, 8 = BPS_SLIPPAGE
//       slot 9 = protocolFees (mapping), 10 = lastTradeId
//       slot 11 = pairIdTradeIds, 12 = tradeIndicies, 13 = trades
const TRADES_SLOT = 13n;

function abiEncodeUint256(n: bigint): string {
  return zeroPadValue(toBeHex(n), 32).slice(2);
}

// keccak256(abi.encode(1, 13))
const keyEnc = abiEncodeUint256(1n);
const slotEnc = abiEncodeUint256(TRADES_SLOT);
const mappingInput = "0x" + keyEnc + slotEnc;
const trades1Base = keccak256(mappingInput);

console.log("trades[1] base slot (key,slot):", trades1Base);

// Try reverse order: keccak256(abi.encode(13, 1))
const mappingInputRev = "0x" + slotEnc + keyEnc;
const trades1BaseRev = keccak256(mappingInputRev);
console.log("trades[1] base slot (slot,key):", trades1BaseRev);

// Utils.Trade struct layout (storage offsets from base):
// 0: owner + attempts (packed)
// 1: tokenIn
// 2: tokenOut
// 3: amountIn
// 4: amountRemaining
// 5: targetAmountOut
// 6: realisedAmountOut
// 7: tradeId
// 8: instasettleBps
// 9: lastSweetSpot
// 10: isInstasettlable + usePriceBased + onlyInstasettle (packed)

function addToSlot(base: string, offset: bigint): string {
  const baseNum = BigInt(base);
  return "0x" + (baseNum + offset).toString(16).padStart(64, "0");
}

console.log("\nFrom trace: 0xd421a5181c571bba3f01190c922c3b2a896fc1d84e86c9f17ac10e67ebef8b60");
console.log("SSTORE wrote 5M to this slot (10M -> 5M)");

// The trace slot for the overwrite
const traceSlot = "0xd421a5181c571bba3f01190c922c3b2a896fc1d84e86c9f17ac10e67ebef8b60";
const traceBase = traceSlot.slice(0, -2); // base might end in 5c
console.log("\nTrace slot (last byte 0x60):", traceSlot);
console.log("If base ends 5c, offsets: 5c=0, 5d=1, 5e=2, 5f=3, 60=4");
console.log("So 0x...60 = base+4 (amountRemaining in source layout)");
console.log("  and 0x...5f = base+3 (amountIn in source layout)");
