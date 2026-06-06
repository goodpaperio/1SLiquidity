import { ethers } from "ethers";
import { TOKEN_ADDRESSES } from "./config";

export function getTokenSymbol(address: string): string {
  const lowerAddress = address.toLowerCase();
  return TOKEN_ADDRESSES[lowerAddress] || address.slice(0, 6) + "...";
}

export function formatTokenAmount(amount: string, decimals: number = 18): string {
  const value = ethers.formatUnits(amount, decimals);
  const num = parseFloat(value);

  if (num === 0) return "0";
  if (num < 0.0001) return "< 0.0001";
  if (num < 1) return num.toFixed(6);
  if (num < 1000) return num.toFixed(4);
  if (num < 1000000) return (num / 1000).toFixed(2) + "K";
  return (num / 1000000).toFixed(2) + "M";
}

export function calculateProgress(realised: string, target: string): string {
  const realisedNum = parseFloat(ethers.formatEther(realised));
  const targetNum = parseFloat(ethers.formatEther(target));

  if (targetNum === 0) return "0%";
  const progress = (realisedNum / targetNum) * 100;
  return `${Math.min(progress, 100).toFixed(1)}%`;
}
