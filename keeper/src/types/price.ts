export interface PriceResult {
  dex: string;
  price: string;
  timestamp: number;
  // Token indices for Curve and Balancer pools
  tokenIndices?: {
    token0Index: number
    token1Index: number
  }
}