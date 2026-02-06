import { ethers } from 'ethers';

export class DecimalUtils {
  static normalizeAmount(amount: string, decimals: number): bigint {
    return ethers.parseUnits(amount, decimals);
  }

  static formatAmount(amount: bigint, decimals: number): string {
    return ethers.formatUnits(amount, decimals);
  }

  static calculatePrice(
    amountIn: bigint,
    amountOut: bigint,
    decimalsIn: number,
    decimalsOut: number
  ): string {
    const normalizedIn = Number(ethers.formatUnits(amountIn, decimalsIn));
    const normalizedOut = Number(ethers.formatUnits(amountOut, decimalsOut));
    return (normalizedOut / normalizedIn).toString();
  }

  static adjustForDecimals(
    value: bigint,
    fromDecimals: number,
    toDecimals: number
  ): bigint {
    if (fromDecimals === toDecimals) return value;
    if (fromDecimals > toDecimals) {
      return value / BigInt(10 ** (fromDecimals - toDecimals));
    }
    return value * BigInt(10 ** (toDecimals - fromDecimals));
  }
} 