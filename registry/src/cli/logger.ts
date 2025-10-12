/**
 * @fileoverview Logger utilities for Socket Registry v2.0.
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LoggerOptions {
  level?: LogLevel
  prefix?: string
  colors?: boolean
}

/**
 * Logger class for CLI output.
 */
export class Logger {
  private level: LogLevel
  private prefix: string
  private colors: boolean

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.INFO
    this.prefix = options.prefix ?? ''
    this.colors = options.colors ?? process.stdout.isTTY
  }

  private async getColors() {
    const { default: colors } = await import('yoctocolors-cjs')
    return colors
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString()
    const prefix = this.prefix ? `[${this.prefix}] ` : ''
    return `${timestamp} ${level} ${prefix}${message}`
  }

  async error(message: string): Promise<void> {
    if (this.level >= LogLevel.ERROR) {
      if (this.colors) {
        const colors = await this.getColors()
        console.error(colors.red('✗'), message)
      } else {
        console.error(this.formatMessage('ERROR', message))
      }
    }
  }

  async warn(message: string): Promise<void> {
    if (this.level >= LogLevel.WARN) {
      if (this.colors) {
        const colors = await this.getColors()
        console.warn(colors.yellow('⚠'), message)
      } else {
        console.warn(this.formatMessage('WARN', message))
      }
    }
  }

  async info(message: string): Promise<void> {
    if (this.level >= LogLevel.INFO) {
      if (this.colors) {
        const colors = await this.getColors()
        console.log(colors.green('✓'), message)
      } else {
        console.log(this.formatMessage('INFO', message))
      }
    }
  }

  async debug(message: string): Promise<void> {
    if (this.level >= LogLevel.DEBUG) {
      if (this.colors) {
        const colors = await this.getColors()
        console.log(colors.gray('•'), message)
      } else {
        console.log(this.formatMessage('DEBUG', message))
      }
    }
  }

  async log(message: string): Promise<void> {
    console.log(message)
  }

  setLevel(level: LogLevel): void {
    this.level = level
  }

  setPrefix(prefix: string): void {
    this.prefix = prefix
  }
}

// Default logger instance
export const logger = new Logger()

// Convenience functions
export const error = (message: string) => logger.error(message)
export const warn = (message: string) => logger.warn(message)
export const info = (message: string) => logger.info(message)
export const debug = (message: string) => logger.debug(message)
export const log = (message: string) => logger.log(message)
