/**
 * AWS Secrets Manager Integration
 * Fetches secrets from AWS Secrets Manager for production use
 * Falls back to environment variables for local development
 */

import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

interface BotSecrets {
  PRIVATE_KEY: string;
  MAINNET_RPC_HTTP_URL: string;
  MAINNET_RPC_HTTP_URL_FALLBACK?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
}

// Cache secrets in memory to avoid repeated AWS API calls
let cachedSecrets: BotSecrets | null = null;

/**
 * Check if running on AWS (has IAM role)
 */
function isRunningOnAWS(): boolean {
  return process.env.AWS_EXECUTION_ENV !== undefined || 
         process.env.AWS_REGION !== undefined ||
         !!process.env.USE_AWS_SECRETS;
}

/**
 * Fetch secrets from AWS Secrets Manager
 */
async function fetchFromSecretsManager(): Promise<BotSecrets> {
  const secretName = "1sliquidity-bot-secrets";
  const region = process.env.AWS_REGION || "eu-west-2";

  const client = new SecretsManagerClient({ region });

  try {
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: secretName,
      })
    );

    if (!response.SecretString) {
      throw new Error("Secret string is empty");
    }

    const secrets = JSON.parse(response.SecretString) as BotSecrets;

    // Validate required fields
    if (!secrets.PRIVATE_KEY || !secrets.MAINNET_RPC_HTTP_URL) {
      throw new Error("Missing required secrets: PRIVATE_KEY or MAINNET_RPC_HTTP_URL");
    }

    console.log("✅ Secrets loaded from AWS Secrets Manager");
    return applyEnvRpcOverrides(secrets);
  } catch (error) {
    console.error("❌ Failed to fetch secrets from AWS Secrets Manager:", error);
    throw error;
  }
}

/**
 * Get secrets from environment variables (local development)
 */
function getSecretsFromEnv(): BotSecrets {
  const secrets: BotSecrets = {
    PRIVATE_KEY: process.env.PRIVATE_KEY || "",
    MAINNET_RPC_HTTP_URL: process.env.MAINNET_RPC_HTTP_URL || process.env.RPC_HTTP_URL || "",
    MAINNET_RPC_HTTP_URL_FALLBACK:
      process.env.MAINNET_RPC_HTTP_URL_FALLBACK || process.env.RPC_HTTP_URL_FALLBACK || "",
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
  };

  // RPC URL is always required; PRIVATE_KEY only needed for execution
  if (!secrets.MAINNET_RPC_HTTP_URL) {
    throw new Error(
      "Missing required environment variable: MAINNET_RPC_HTTP_URL (or RPC_HTTP_URL)"
    );
  }

  console.log("ℹ️  Using secrets from environment variables (local mode)");
  return applyEnvRpcOverrides(secrets);
}

/** server/.env can supply RPC fallback without editing Secrets Manager. */
function applyEnvRpcOverrides(secrets: BotSecrets): BotSecrets {
  const fallback =
    process.env.MAINNET_RPC_HTTP_URL_FALLBACK?.trim() ||
    process.env.RPC_HTTP_URL_FALLBACK?.trim();
  if (!fallback) {
    return secrets;
  }
  return { ...secrets, MAINNET_RPC_HTTP_URL_FALLBACK: fallback };
}

/**
 * Get secrets - from AWS Secrets Manager on EC2, or environment variables locally
 */
export async function getSecrets(): Promise<BotSecrets> {
  // Return cached secrets if available
  if (cachedSecrets) {
    return cachedSecrets;
  }

  // Determine where to fetch secrets from
  if (isRunningOnAWS()) {
    console.log("🔐 Running on AWS - fetching secrets from Secrets Manager...");
    cachedSecrets = await fetchFromSecretsManager();
  } else {
    console.log("💻 Running locally - using environment variables...");
    cachedSecrets = getSecretsFromEnv();
  }

  if (cachedSecrets.MAINNET_RPC_HTTP_URL_FALLBACK) {
    console.log("ℹ️  RPC fallback endpoint configured");
  }

  return cachedSecrets;
}

/**
 * Get a specific secret value
 */
export async function getSecret(key: keyof BotSecrets): Promise<string | undefined> {
  const secrets = await getSecrets();
  return secrets[key];
}

/**
 * Clear cached secrets (useful for testing)
 */
export function clearSecretsCache(): void {
  cachedSecrets = null;
}
