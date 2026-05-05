/**
 * AWS Secrets Manager Integration
 * Fetches secrets from AWS Secrets Manager for production use
 * Falls back to environment variables for local development
 */
interface BotSecrets {
    PRIVATE_KEY: string;
    MAINNET_RPC_HTTP_URL: string;
    TELEGRAM_BOT_TOKEN?: string;
    TELEGRAM_CHAT_ID?: string;
}
/**
 * Get secrets - from AWS Secrets Manager on EC2, or environment variables locally
 */
export declare function getSecrets(): Promise<BotSecrets>;
/**
 * Get a specific secret value
 */
export declare function getSecret(key: keyof BotSecrets): Promise<string | undefined>;
/**
 * Clear cached secrets (useful for testing)
 */
export declare function clearSecretsCache(): void;
export {};
//# sourceMappingURL=secrets.d.ts.map