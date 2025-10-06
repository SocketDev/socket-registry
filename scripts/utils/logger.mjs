/**
 * @fileoverview Simple console logger for build scripts.
 * Provides basic logging without depending on the built registry package.
 */

/**
 * Simple logger that wraps console methods.
 */
class Logger {
  /**
   * Log a message to stdout.
   */
  log(...args) {
    console.log(...args)
    return this
  }

  /**
   * Log an error message to stderr.
   */
  error(...args) {
    console.error(...args)
    return this
  }

  /**
   * Log an info message to stderr.
   */
  info(...args) {
    console.info(...args)
    return this
  }

  /**
   * Log a warning message to stderr.
   */
  warn(...args) {
    console.warn(...args)
    return this
  }
}

export const logger = new Logger()
