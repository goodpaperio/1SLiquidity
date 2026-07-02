import { ethers } from "ethers";
import "dotenv/config";
export interface ContractAddresses {
    core: string;
    registry: string;
    executor: string;
    streamDaemon: string;
}
export declare const CONTRACT_ADDRESSES: ContractAddresses;
export declare const BOT_VERSION: string;
export declare const DEPLOYMENT_BLOCK: number;
export declare const TOKEN_ADDRESSES: Record<string, string>;
export declare function getProvider(): Promise<ethers.AbstractProvider>;
export declare function getSigner(): Promise<ethers.Wallet>;
export declare function getRpcUrl(): string;
//# sourceMappingURL=config.d.ts.map