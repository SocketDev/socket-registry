/**
 * @fileoverview Minimal logger for build scripts that mimics the main logger API.
 * This is used during build when the full logger with external dependencies isn't available yet.
 */

const isDebug = () => !!process.env.DEBUG

// Simple logger that mimics the main logger API but uses console directly.
export const logger = {
  log(...args) {
    console.log(...args)
    return this
  },

  error(...args) {
    console.error(...args)
    return this
  },

  warn(...args) {
    console.warn('\u26a0\ufe0f', ...args)
    return this
  },

  success(...args) {
    console.log('\u2705', ...args)
    return this
  },

  info(...args) {
    console.log('\u2139\ufe0f', ...args)
    return this
  },

  debug(...args) {
    if (isDebug()) {
      console.log(...args)
    }
    return this
  },
}
