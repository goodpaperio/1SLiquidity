"use strict";
/**
 * AWS Secrets Manager Integration
 * Fetches secrets from AWS Secrets Manager for production use
 * Falls back to environment variables for local development
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSecrets = getSecrets;
exports.getSecret = getSecret;
exports.clearSecretsCache = clearSecretsCache;
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
// Cache secrets in memory to avoid repeated AWS API calls
let cachedSecrets = null;
/**
 * Check if running on AWS (has IAM role)
 */
function isRunningOnAWS() {
    return process.env.AWS_EXECUTION_ENV !== undefined ||
        process.env.AWS_REGION !== undefined ||
        !!process.env.USE_AWS_SECRETS;
}
/**
 * Fetch secrets from AWS Secrets Manager
 */
async function fetchFromSecretsManager() {
    const secretName = "1sliquidity-bot-secrets";
    const region = process.env.AWS_REGION || "eu-west-2";
    const client = new client_secrets_manager_1.SecretsManagerClient({ region });
    try {
        const response = await client.send(new client_secrets_manager_1.GetSecretValueCommand({
            SecretId: secretName,
        }));
        if (!response.SecretString) {
            throw new Error("Secret string is empty");
        }
        const secrets = JSON.parse(response.SecretString);
        // Validate required fields
        if (!secrets.PRIVATE_KEY || !secrets.MAINNET_RPC_HTTP_URL) {
            throw new Error("Missing required secrets: PRIVATE_KEY or MAINNET_RPC_HTTP_URL");
        }
        console.log("✅ Secrets loaded from AWS Secrets Manager");
        return secrets;
    }
    catch (error) {
        console.error("❌ Failed to fetch secrets from AWS Secrets Manager:", error);
        throw error;
    }
}
/**
 * Get secrets from environment variables (local development)
 */
function getSecretsFromEnv() {
    const secrets = {
        PRIVATE_KEY: process.env.PRIVATE_KEY || "",
        MAINNET_RPC_HTTP_URL: process.env.MAINNET_RPC_HTTP_URL || process.env.RPC_HTTP_URL || "",
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
        TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
    };
    // RPC URL is always required; PRIVATE_KEY only needed for execution
    if (!secrets.MAINNET_RPC_HTTP_URL) {
        throw new Error("Missing required environment variable: MAINNET_RPC_HTTP_URL (or RPC_HTTP_URL)");
    }
    console.log("ℹ️  Using secrets from environment variables (local mode)");
    return secrets;
}
/**
 * Get secrets - from AWS Secrets Manager on EC2, or environment variables locally
 */
async function getSecrets() {
    // Return cached secrets if available
    if (cachedSecrets) {
        return cachedSecrets;
    }
    // Determine where to fetch secrets from
    if (isRunningOnAWS()) {
        console.log("🔐 Running on AWS - fetching secrets from Secrets Manager...");
        cachedSecrets = await fetchFromSecretsManager();
    }
    else {
        console.log("💻 Running locally - using environment variables...");
        cachedSecrets = getSecretsFromEnv();
    }
    return cachedSecrets;
}
/**
 * Get a specific secret value
 */
async function getSecret(key) {
    const secrets = await getSecrets();
    return secrets[key];
}
/**
 * Clear cached secrets (useful for testing)
 */
function clearSecretsCache() {
    cachedSecrets = null;
}
//# sourceMappingURL=secrets.js.map