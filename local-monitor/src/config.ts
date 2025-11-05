import { ethers } from "ethers";
import "dotenv/config";

export interface ContractAddresses {
  core: string;
  registry: string;
  executor: string;
  streamDaemon: string;
}

export const CONTRACT_ADDRESSES: ContractAddresses = {
  core: "0x66be9da4d7312d48c855be1fc4c1e979b6e94cc2",
  registry: "0x5EAee88B493de2D646a8C29Bb5b09a79c5322dF4",
  executor: "0xA03762EFF4f98cDA57DeA0a8eB62ab872C832878",
  streamDaemon: "0xbf1c6d73db66812eb67af1594587f33487951108",
};

// Deployment block for Core contract v1.0.4
export const DEPLOYMENT_BLOCK = 23720434;

// Common token addresses on Ethereum mainnet (all lowercase for lookup)
export const TOKEN_ADDRESSES: Record<string, string> = {
  "0x0000000000000000000000000000000000000000": "ETH",
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "WETH",
  "0xa0b86a33e6441b8c4c8c0e4b8b8c8c0e4b8b8c8c": "USDC",
  "0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT",
  "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": "WBTC",
  "0x6b175474e89094c44da98b954eedeac495271d0f": "DAI",
  "0x514910771af9ca656af840dff83e8264ecf986ca": "LINK",
  "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984": "UNI",
  "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0": "MATIC",
  "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce": "SHIB",
  "0x4fabb145d64652a948d72533023f6e7a623c7c53": "BUSD",
  "0x0f5d2fb29fb7d3cfe444a200298f468908cc942": "MANA",
  "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2": "MKR",
  "0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e": "YFI",
  "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9": "AAVE",
  "0x1fe0ca53280c6b5be6c4e3030d3d0fca9c4dc7b8": "RPL",
  "0xbe1a001fe942f96eea22ba08783140b4d0e2f670": "BETA",
  "0x4d224452801aced8b2f0aebe155379bb5d594381": "APE",
  "0x3845badade8e6ddd04fcf80ce6c0a8c0c0c0c0c0": "SAND",
  "0x0d8775f648430679a709e98d2b0cb6250d2887ef": "BAT",
  "0x9be89d2a4cd102d8fecc6bf9da793be995c22541": "BB",
  "0x767fe9edc9e0df98e07454847909b5e959d7ca0e": "ILV",
  "0x15d4c048f83bd7e37d49ea4c83a07267ec4203da": "GALA",
  "0x6b3595068778dd592e39a122f4f5a5cf09c90fe2": "SUSHI",
  "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39": "HEX",
  "0x4e15361fd6b4bb609fa63c81a2be19d873717870": "FTM",
  "0x8e870d67f660d95d5be530380d0ec0bd388289e1": "PAX",
  "0x853d955acef822db058eb8505911ed77f175b99e": "FRAX",
  "0x5afe3855358e112b5647b952709e6165e1c1eee": "SAFE",
  // Add the actual addresses from the trades
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC", // Real USDC address
  "0xcf0c122c6b73ff809c693db761e7baebe62b6a2e": "USDC", // Another USDC variant
};

export const RPC_URL = process.env.RPC_HTTP_URL;

if (!RPC_URL) {
  throw new Error("RPC_HTTP_URL environment variable is required");
}

export const PRIVATE_KEY = process.env.PRIVATE_KEY;

export function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(RPC_URL);
}

export function getSigner(): ethers.Wallet {
  if (!PRIVATE_KEY) {
    throw new Error(
      "PRIVATE_KEY environment variable is required for write operations"
    );
  }
  const provider = getProvider();
  return new ethers.Wallet(PRIVATE_KEY!, provider);
}
