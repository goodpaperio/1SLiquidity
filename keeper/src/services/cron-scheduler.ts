import * as cron from 'node-cron'
import { runLiquidityAnalysisFromJson } from '../tests/liquidity-analysis'
import { main as fetchBalancerPools } from '../scripts/fetch-balancer-pools'
import { main as fetchCurvePools } from '../scripts/fetch-curve-pools'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
dotenv.config()

interface CronJobConfig {
  name: string
  schedule: string
  description: string
  enabled: boolean
  type: 'liquidity-analysis' | 'fetch-balancer-pools' | 'fetch-curve-pools'
}

interface CronSchedulerConfig {
  jobs: CronJobConfig[]
  timezone: string
  logging: {
    enabled: boolean
    logDir: string
    retentionDays: number
  }
}

class CronScheduler {
  private config: CronSchedulerConfig
  private runningJobs: Map<string, cron.ScheduledTask> = new Map()
  private logDir: string

  constructor(config?: Partial<CronSchedulerConfig>) {
    this.config = {
      jobs: [
        {
          name: 'liquidity-analysis',
          schedule: process.env.CRON_SCHEDULE || '0 8,20 * * *', // 8 AM, 8 PM
          description: '2 times daily at 8 AM and 8 PM',
          enabled: process.env.CRON_ENABLED === 'true',
          type: 'liquidity-analysis',
        },
        {
          name: 'fetch-balancer-pools',
          schedule: process.env.BALANCER_CRON_SCHEDULE || '0 8,20 * * *', // 8 AM, 8 PM
          description: '2 times daily at 8 AM and 8 PM',
          enabled: process.env.BALANCER_CRON_ENABLED === 'true',
          type: 'fetch-balancer-pools',
        },
        {
          name: 'fetch-curve-pools',
          schedule: process.env.CURVE_CRON_SCHEDULE || '0 8,20 * * *', // 8 AM, 8 PM
          description: '2 times daily at 8 AM and 8 PM',
          enabled: process.env.CURVE_CRON_ENABLED === 'true',
          type: 'fetch-curve-pools',
        },
      ],
      timezone: 'UTC',
      logging: {
        enabled: true,
        logDir: 'logs/cron',
        retentionDays: 30,
      },
      ...config,
    }

    this.logDir = path.join(process.cwd(), this.config.logging.logDir)
    this.ensureLogDir()
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true })
    }
  }

  private log(
    level: 'INFO' | 'ERROR' | 'WARN',
    message: string,
    jobName?: string
  ): void {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] [${level}] ${
      jobName ? `[${jobName}] ` : ''
    }${message}`

    console.log(logMessage)

    if (this.config.logging.enabled) {
      const logFile = path.join(
        this.logDir,
        `cron-scheduler-${new Date().toISOString().split('T')[0]}.log`
      )
      fs.appendFileSync(logFile, logMessage + '\n')
    }
  }

  private async executeJob(jobConfig: CronJobConfig): Promise<void> {
    const startTime = Date.now()
    this.log('INFO', `Starting ${jobConfig.type} job`, jobConfig.name)

    try {
      switch (jobConfig.type) {
        case 'liquidity-analysis':
          await runLiquidityAnalysisFromJson(
            'src/tests/tokens-list-04-09-2025.json'
          )
          break

        case 'fetch-balancer-pools':
          await fetchBalancerPools()
          break

        case 'fetch-curve-pools':
          await fetchCurvePools()
          break

        default:
          throw new Error(`Unknown job type: ${jobConfig.type}`)
      }

      const duration = Date.now() - startTime
      this.log(
        'INFO',
        `${jobConfig.type} completed successfully in ${duration}ms`,
        jobConfig.name
      )
    } catch (error) {
      const duration = Date.now() - startTime
      this.log(
        'ERROR',
        `${jobConfig.type} failed after ${duration}ms: ${
          error instanceof Error ? error.message : String(error)
        }`,
        jobConfig.name
      )

      throw error
    }
  }

  private async executeLiquidityAnalysis(jobName: string): Promise<void> {
    // Keep this method for backward compatibility
    const jobConfig = this.config.jobs.find((j) => j.name === jobName)
    if (jobConfig) {
      await this.executeJob(jobConfig)
    }
  }

  private scheduleJob(jobConfig: CronJobConfig): void {
    if (!jobConfig.enabled) {
      this.log(
        'INFO',
        `Job disabled, skipping: ${jobConfig.description}`,
        jobConfig.name
      )
      return
    }

    // Validate cron expression
    if (!cron.validate(jobConfig.schedule)) {
      this.log(
        'ERROR',
        `Invalid cron schedule: ${jobConfig.schedule}`,
        jobConfig.name
      )
      return
    }

    this.log(
      'INFO',
      `Scheduling job: ${jobConfig.description} (${jobConfig.schedule})`,
      jobConfig.name
    )

    const task = cron.schedule(
      jobConfig.schedule,
      async () => {
        try {
          await this.executeJob(jobConfig)
        } catch (error) {
          // Error is already logged in executeJob
        }
      },
      {
        timezone: this.config.timezone,
      }
    )

    this.runningJobs.set(jobConfig.name, task)
    this.log('INFO', `Job scheduled successfully`, jobConfig.name)
  }

  private cleanupOldLogs(): void {
    if (!this.config.logging.enabled) return

    try {
      const files = fs.readdirSync(this.logDir)
      const cutoffDate = new Date()
      cutoffDate.setDate(
        cutoffDate.getDate() - this.config.logging.retentionDays
      )

      files.forEach((file) => {
        if (file.startsWith('cron-scheduler-') && file.endsWith('.log')) {
          const filePath = path.join(this.logDir, file)
          const stats = fs.statSync(filePath)

          if (stats.mtime < cutoffDate) {
            fs.unlinkSync(filePath)
            this.log('INFO', `Cleaned up old log file: ${file}`)
          }
        }
      })
    } catch (error) {
      this.log(
        'WARN',
        `Failed to cleanup old logs: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  public start(): void {
    this.log('INFO', '🚀 Starting Cron Scheduler...')
    this.log('INFO', `Timezone: ${this.config.timezone}`)

    // Schedule all enabled jobs
    this.config.jobs.forEach((job) => this.scheduleJob(job))

    // Start all scheduled tasks
    this.runningJobs.forEach((task, jobName) => {
      task.start()
      this.log('INFO', `Started job`, jobName)
    })

    // Schedule log cleanup to run daily at midnight
    cron.schedule(
      '0 0 * * *',
      () => {
        this.cleanupOldLogs()
      },
      {
        timezone: this.config.timezone,
      }
    )

    this.log(
      'INFO',
      `✅ Cron Scheduler started with ${this.runningJobs.size} active jobs`
    )
    this.listActiveJobs()
  }

  public stop(): void {
    this.log('INFO', '🛑 Stopping Cron Scheduler...')

    this.runningJobs.forEach((task, jobName) => {
      task.stop()
      this.log('INFO', `Stopped job`, jobName)
    })

    this.runningJobs.clear()
    this.log('INFO', '✅ Cron Scheduler stopped')
  }

  public listActiveJobs(): void {
    this.log('INFO', '📋 Active Jobs:')
    this.config.jobs.forEach((job) => {
      if (job.enabled && this.runningJobs.has(job.name)) {
        this.log(
          'INFO',
          `  ✓ ${job.name}: ${job.description} (${job.schedule})`
        )
      }
    })
  }

  public async runJobNow(jobName: string): Promise<void> {
    const job = this.config.jobs.find((j) => j.name === jobName)
    if (!job) {
      throw new Error(`Job not found: ${jobName}`)
    }

    this.log('INFO', `Running job manually`, jobName)
    await this.executeJob(job)
  }

  public getJobStatus(): Array<{
    name: string
    enabled: boolean
    running: boolean
    schedule: string
    description: string
  }> {
    return this.config.jobs.map((job) => ({
      name: job.name,
      enabled: job.enabled,
      running: this.runningJobs.has(job.name),
      schedule: job.schedule,
      description: job.description,
    }))
  }

  public updateJobConfig(
    jobName: string,
    updates: Partial<CronJobConfig>
  ): void {
    const jobIndex = this.config.jobs.findIndex((j) => j.name === jobName)
    if (jobIndex === -1) {
      throw new Error(`Job not found: ${jobName}`)
    }

    // Stop existing job if running
    const existingTask = this.runningJobs.get(jobName)
    if (existingTask) {
      existingTask.stop()
      this.runningJobs.delete(jobName)
      this.log('INFO', `Stopped job for reconfiguration`, jobName)
    }

    // Update configuration
    this.config.jobs[jobIndex] = { ...this.config.jobs[jobIndex], ...updates }

    // Reschedule if enabled
    this.scheduleJob(this.config.jobs[jobIndex])

    if (this.config.jobs[jobIndex].enabled) {
      const task = this.runningJobs.get(jobName)
      if (task) {
        task.start()
        this.log('INFO', `Restarted job with new configuration`, jobName)
      }
    }
  }
}

export default CronScheduler
export { CronScheduler, CronJobConfig, CronSchedulerConfig }
