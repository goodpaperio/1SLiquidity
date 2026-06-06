"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOKEN_ADDRESSES = exports.DEPLOYMENT_BLOCK = exports.BOT_VERSION = exports.CONTRACT_ADDRESSES = void 0;
exports.getProvider = getProvider;
exports.getSigner = getSigner;
exports.getRpcUrl = getRpcUrl;
const ethers_1 = require("ethers");
require("dotenv/config");
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const deploymentBlock_1 = require("./deploymentBlock");
exports.CONTRACT_ADDRESSES = {
    core: "0xD0B6DaD2Dc5dad47bEB7C3D7Dd7980a20CD6a710",
    registry: "0x34d4bd3D3424B4C06bA14D68a10e1DBA5Cfb11D4",
    executor: "0xb2194D54cD31A2c23B071ca68394CF9C35910545",
    streamDaemon: "0x75C851Ea1f6461f65Fd04582b6E4BF49168632C5",
};
function extractVersionNumber(version) {
    return version.split(".").map((v) => Number(v));
}
function compareSemver(a, b) {
    const av = extractVersionNumber(a);
    const bv = extractVersionNumber(b);
    const len = Math.max(av.length, bv.length);
    for (let i = 0; i < len; i++) {
        const ai = av[i] ?? 0;
        const bi = bv[i] ?? 0;
        if (ai !== bi)
            return ai - bi;
    }
    return 0;
}
function getLatestDeploymentVersion(repoRoot) {
    const versionsDir = (0, path_1.join)(repoRoot, "versions");
    if (!(0, fs_1.existsSync)(versionsDir))
        return null;
    const matches = (0, fs_1.readdirSync)(versionsDir)
        .map((name) => {
        const m = name.match(/^deployment-addresses-mainnet-(\d+\.\d+\.\d+)\.json$/);
        return m ? m[1] : null;
    })
        .filter((v) => Boolean(v));
    if (matches.length === 0)
        return null;
    matches.sort(compareSemver);
    return matches[matches.length - 1];
}
function detectBotVersion() {
    const fromEnv = process.env.BOT_VERSION?.trim();
    if (fromEnv)
        return fromEnv;
    const repoRoot = (0, path_1.join)(__dirname, "..", "..");
    // Prefer deployment manifests first so runtime reflects deployed artifacts.
    const latestDeploymentVersion = getLatestDeploymentVersion(repoRoot);
    if (latestDeploymentVersion)
        return latestDeploymentVersion;
    // Fallback to latest git tag when manifests are unavailable.
    try {
        const latestTag = (0, child_process_1.execSync)("git describe --tags --abbrev=0", {
            cwd: repoRoot,
            stdio: ["ignore", "pipe", "ignore"],
            encoding: "utf8",
        }).trim();
        if (latestTag)
            return latestTag;
    }
    catch {
        // fall through to package.json fallback
    }
    // Final fallback: root package.json version.
    try {
        const rootPackagePath = (0, path_1.join)(repoRoot, "package.json");
        const rootPackage = JSON.parse((0, fs_1.readFileSync)(rootPackagePath, "utf8"));
        if (rootPackage.version)
            return rootPackage.version;
    }
    catch {
        // ignore and use final default
    }
    return "unknown";
}
function loadDeploymentManifests(repoRoot) {
    const versionsDir = (0, path_1.join)(repoRoot, "versions");
    if (!(0, fs_1.existsSync)(versionsDir))
        return [];
    return (0, fs_1.readdirSync)(versionsDir)
        .filter((name) => name.startsWith("deployment-addresses-mainnet-"))
        .map((name) => {
        try {
            return JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(versionsDir, name), "utf8"));
        }
        catch {
            return {};
        }
    });
}
function detectDeploymentBlock() {
    const fromEnv = process.env.DEPLOYMENT_BLOCK?.trim();
    if (fromEnv)
        return Number(fromEnv);
    const repoRoot = (0, path_1.join)(__dirname, "..", "..");
    return (0, deploymentBlock_1.resolveDeploymentBlock)(exports.CONTRACT_ADDRESSES.core, loadDeploymentManifests(repoRoot), 25072029);
}
// Bot/deployment version shown in Telegram notifications.
// Resolution order: BOT_VERSION env -> latest deployment file -> latest git tag -> root package.json.
exports.BOT_VERSION = detectBotVersion();
// Earliest known deployment block for the configured Core contract.
exports.DEPLOYMENT_BLOCK = detectDeploymentBlock();
// Common token addresses on Ethereum mainnet (all lowercase for lookup)
exports.TOKEN_ADDRESSES = {
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
const secrets_1 = require("./secrets");
// These will be initialized from secrets (AWS Secrets Manager or env vars)
let RPC_URL = null;
let PRIVATE_KEY = null;
// Initialize secrets (called at startup)
async function initializeSecrets() {
    const secrets = await (0, secrets_1.getSecrets)();
    RPC_URL = secrets.MAINNET_RPC_HTTP_URL;
    PRIVATE_KEY = secrets.PRIVATE_KEY;
}
// Export async versions that ensure secrets are loaded
async function getProvider() {
    if (!RPC_URL) {
        await initializeSecrets();
    }
    if (!RPC_URL) {
        throw new Error("Failed to load RPC_URL from secrets");
    }
    return new ethers_1.ethers.JsonRpcProvider(RPC_URL);
}
async function getSigner() {
    if (!PRIVATE_KEY) {
        await initializeSecrets();
    }
    if (!PRIVATE_KEY) {
        throw new Error("Failed to load PRIVATE_KEY from secrets");
    }
    const provider = await getProvider();
    return new ethers_1.ethers.Wallet(PRIVATE_KEY, provider);
}
// For compatibility with existing code that expects synchronous access
function getRpcUrl() {
    if (!RPC_URL) {
        throw new Error("Secrets not initialized. Call getProvider() or getSigner() first.");
    }
    return RPC_URL;
}
//# sourceMappingURL=config.js.map