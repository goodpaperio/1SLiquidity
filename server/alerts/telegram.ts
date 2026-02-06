/**
 * Telegram Alert Module
 * Sends alerts via Telegram Bot API
 */

interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export class TelegramAlert {
  private botToken: string;
  private chatId: string;
  private baseUrl: string;

  constructor(config: TelegramConfig) {
    this.botToken = config.botToken;
    this.chatId = config.chatId;
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  /**
   * Send a message via Telegram
   */
  async send(message: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: message,
          parse_mode: parseMode,
        }),
      });

      const data = await response.json();
      
      if (!data.ok) {
        console.error('Telegram API error:', data);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to send Telegram message:', error);
      return false;
    }
  }

  /**
   * Send success alert
   */
  async sendSuccess(successCount: number, failCount: number): Promise<void> {
    const message = `✅ <b>Trades Executed</b>

🔄 Successful: <code>${successCount}</code>
❌ Failed: <code>${failCount}</code>

⏰ Time: ${new Date().toISOString()}`;

    await this.send(message);
  }

  /**
   * Send failure alert
   */
  async sendFailure(failCount: number, pairIds: string[]): Promise<void> {
    const pairIdList = pairIds.slice(0, 3).map(id => `<code>${id.slice(0, 10)}...${id.slice(-6)}</code>`).join('\n');
    
    const message = `⚠️ <b>Execution Failures</b>

❌ Failed: <code>${failCount}</code> trade(s)

📋 Pair IDs:
${pairIdList}

⏰ Time: ${new Date().toISOString()}`;

    await this.send(message);
  }

  /**
   * Send low balance alert
   */
  async sendLowBalance(balance: string, threshold: string): Promise<void> {
    const message = `⚠️ <b>Low Balance Alert</b>

💰 Wallet balance: <code>${balance} ETH</code>
📊 Threshold: <code>${threshold} ETH</code>

⚠️ Please top up the bot wallet!

⏰ Time: ${new Date().toISOString()}`;

    await this.send(message);
  }

  /**
   * Send daily summary
   */
  async sendDailySummary(stats: {
    totalRuns: number;
    successfulExecutions: number;
    failedExecutions: number;
    diskUsage: string;
  }): Promise<void> {
    const message = `📊 <b>Daily Summary</b> - ${new Date().toISOString().split('T')[0]}

🔄 Bot runs: <code>${stats.totalRuns}</code>
✅ Successful: <code>${stats.successfulExecutions}</code>
❌ Failed: <code>${stats.failedExecutions}</code>
💾 Disk usage: <code>${stats.diskUsage}</code>

⏰ Generated: ${new Date().toISOString()}`;

    await this.send(message);
  }

  /**
   * Send generic error alert
   */
  async sendError(errorMessage: string, context?: string): Promise<void> {
    const message = `🚨 <b>Bot Error</b>

❌ Error: <code>${errorMessage}</code>
${context ? `\n📝 Context: ${context}` : ''}

⏰ Time: ${new Date().toISOString()}`;

    await this.send(message);
  }
}

/**
 * Create Telegram alert instance from environment variables
 */
export function createTelegramAlert(): TelegramAlert | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn('Telegram credentials not configured. Alerts disabled.');
    return null;
  }

  return new TelegramAlert({ botToken, chatId });
}
