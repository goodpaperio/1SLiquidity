import CronScheduler, { CronJobConfig } from './services/cron-scheduler'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

class CronRunner {
  private scheduler: CronScheduler

  constructor() {
    // Initialize scheduler with configuration
    this.scheduler = new CronScheduler({
      timezone: 'UTC',
      logging: {
        enabled: true,
        logDir: process.env.CRON_LOG_DIR || 'logs/cron',
        retentionDays: parseInt(
          process.env.CRON_LOG_RETENTION_DAYS || '30',
          10
        ),
      },
      jobs: [
        {
          name: 'liquidity-analysis',
          schedule: process.env.CRON_SCHEDULE || '0 8,20 * * *',
          description: '2 times daily at 8 AM and 8 PM',
          enabled: process.env.CRON_ENABLED === 'true',
          type: 'liquidity-analysis',
        },
        {
          name: 'fetch-balancer-pools',
          schedule: process.env.BALANCER_CRON_SCHEDULE || '0 6,18 * * *',
          description: '2 times daily at 6 AM and 6 PM',
          enabled: process.env.BALANCER_CRON_ENABLED === 'true',
          type: 'fetch-balancer-pools',
        },
        {
          name: 'fetch-curve-pools',
          schedule: process.env.CURVE_CRON_SCHEDULE || '0 6,18 * * *',
          description: '2 times daily at 6 AM and 6 PM',
          enabled: process.env.CURVE_CRON_ENABLED === 'true',
          type: 'fetch-curve-pools',
        },
      ],
    })

    this.setupProcessHandlers()
  }

  private setupProcessHandlers(): void {
    // Handle graceful shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`\nReceived ${signal}. Gracefully shutting down...`)
      this.scheduler.stop()
      process.exit(0)
    }

    // Handle process signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error)
      this.scheduler.stop()
      process.exit(1)
    })

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason)
      this.scheduler.stop()
      process.exit(1)
    })
  }

  public start(): void {
    console.log('🚀 Starting Liquidity Analysis Cron Runner...')
    console.log('Environment:', process.env.NODE_ENV || 'development')

    this.scheduler.start()

    console.log('✅ Cron Runner is now active. Press Ctrl+C to stop.')

    // Keep the process alive
    this.keepAlive()
  }

  public async runJobNow(jobName: string): Promise<void> {
    try {
      await this.scheduler.runJobNow(jobName)
    } catch (error) {
      console.error(`Failed to run job ${jobName}:`, error)
      throw error
    }
  }

  public getStatus(): any {
    return {
      jobs: this.scheduler.getJobStatus(),
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    }
  }

  private keepAlive(): void {
    // Keep the process running
    setInterval(() => {
      // Optional: Add health check or heartbeat logic here
    }, 30000) // Check every 30 seconds
  }
}

// CLI handling
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  const runner = new CronRunner()

  switch (command) {
    case 'start':
      runner.start()
      break

    case 'status':
      console.log(JSON.stringify(runner.getStatus(), null, 2))
      process.exit(0)
      break

    case 'run':
      const jobName = args[1]
      if (!jobName) {
        console.error('Please specify a job name to run')
        console.log('Available jobs:')
        runner.getStatus().jobs.forEach((job: any) => {
          console.log(`  - ${job.name}: ${job.description}`)
        })
        process.exit(1)
      }

      try {
        console.log(`Running job: ${jobName}`)
        await runner.runJobNow(jobName)
        console.log('✅ Job completed successfully')
        process.exit(0)
      } catch (error) {
        console.error('❌ Job failed:', error)
        process.exit(1)
      }
      break

    default:
      console.log('Liquidity Analysis Cron Runner')
      console.log('')
      console.log('Usage:')
      console.log('  npm run cron:start    - Start the cron scheduler')
      console.log('  npm run cron:status   - Show current status')
      console.log('  npm run cron:run <job> - Run a specific job now')
      console.log('')
      console.log('Available jobs:')
      runner.getStatus().jobs.forEach((job: any) => {
        console.log(`  - ${job.name}: ${job.description}`)
      })
      console.log('')
      console.log('Environment Variables:')
      console.log(
        '  CRON_TIMEZONE           - Timezone for cron jobs (default: UTC)'
      )
      console.log(
        '  CRON_LOG_DIR            - Log directory (default: logs/cron)'
      )
      console.log(
        '  CRON_LOG_RETENTION_DAYS - Log retention in days (default: 30)'
      )
      console.log(
        '  CRON_SCHEDULE           - Cron schedule for liquidity analysis (default: 0 8,20 * * *)'
      )
      console.log(
        '  CRON_ENABLED            - Enable liquidity analysis cron job (default: false)'
      )
      console.log(
        '  BALANCER_CRON_SCHEDULE  - Cron schedule for Balancer pools (default: 0 8,20 * * *)'
      )
      console.log(
        '  BALANCER_CRON_ENABLED   - Enable Balancer pools cron job (default: false)'
      )
      console.log(
        '  CURVE_CRON_SCHEDULE     - Cron schedule for Curve pools (default: 0 8,20 * * *)'
      )
      console.log(
        '  CURVE_CRON_ENABLED      - Enable Curve pools cron job (default: false)'
      )
      console.log('  DATABASE_URL            - PostgreSQL connection string')
      console.log('  BALANCER_SUBGRAPH       - Balancer subgraph URL')
      console.log('  RPC_URL                 - Ethereum RPC URL')
      process.exit(0)
  }
}

// Export for use as module
export default CronRunner
export { CronRunner }

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error)
}
