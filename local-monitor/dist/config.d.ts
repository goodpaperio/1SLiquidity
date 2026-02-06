import { ethers } from "ethers";
import "dotenv/config";
export interface ContractAddresses {
    core: string;
    registry: string;
    executor: string;
    streamDaemon: string;
}
export declare const CONTRACT_ADDRESSES: ContractAddresses;
export declare const DEPLOYMENT_BLOCK = 23720434;
export declare const TOKEN_ADDRESSES: Record<string, string>;
export declare const RPC_URL: string | undefined;
export declare const PRIVATE_KEY: string | undefined;
export declare function getProvider(): ethers.JsonRpcProvider;
export declare function getSigner(): ethers.Wallet;
//# sourceMappingURL=config.d.ts.map