export interface DepthPoint {
    price: string;
    amount: string;
}

export interface DepthData {
    token0: string;
    token1: string;
    dex: string;
    timestamp: number;
    depthPoints: DepthPoint[];
}

export interface DepthConfig {
    maxDepthPoints: number;
    priceIntervals: number[]; // e.g., [0.01, 0.02] for 1% and 2% depth
}

export interface DexDepthProvider {
    getDepth: (
        token0: string,
        token1: string,
        config: DepthConfig
    ) => Promise<DepthData>;
} 