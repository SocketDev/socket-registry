/**
 * @fileoverview Cost tracking for Claude API usage.
 * Tracks session and monthly costs with token usage.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'

import colors from 'yoctocolors-cjs'

import { PRICING, STORAGE_PATHS } from './config.mjs'
import { formatDuration } from './utils/formatting.mjs'

class CostTracker {
  constructor(model = 'claude-sonnet-4-5') {
    this.model = model
    this.monthly = this.loadMonthlyStats()
    this.session = { cacheRead: 0, cacheWrite: 0, cost: 0, input: 0, output: 0 }
    this.startTime = Date.now()
  }

  loadMonthlyStats() {
    try {
      if (existsSync(STORAGE_PATHS.stats)) {
        const data = JSON.parse(readFileSync(STORAGE_PATHS.stats, 'utf8'))
        // YYYY-MM
        const currentMonth = new Date().toISOString().slice(0, 7)
        if (data.month === currentMonth) {
          return data
        }
      }
    } catch {
      // Ignore errors, start fresh.
    }
    return {
      cost: 0,
      fixes: 0,
      month: new Date().toISOString().slice(0, 7),
      sessions: 0,
    }
  }

  saveMonthlyStats() {
    try {
      writeFileSync(STORAGE_PATHS.stats, JSON.stringify(this.monthly, null, 2))
    } catch {
      // Ignore errors.
    }
  }

  showSessionSummary() {
    const duration = Date.now() - this.startTime
    console.log(colors.cyan('\n💰 Cost Summary:'))
    console.log(`  Input tokens: ${this.session.input.toLocaleString()}`)
    console.log(`  Output tokens: ${this.session.output.toLocaleString()}`)
    if (this.session.cacheWrite > 0) {
      console.log(`  Cache write: ${this.session.cacheWrite.toLocaleString()}`)
    }
    if (this.session.cacheRead > 0) {
      console.log(`  Cache read: ${this.session.cacheRead.toLocaleString()}`)
    }
    console.log(
      `  Session cost: ${colors.green(`$${this.session.cost.toFixed(4)}`)}`,
    )
    console.log(
      `  Monthly total: ${colors.yellow(`$${this.monthly.cost.toFixed(2)}`)}`,
    )
    console.log(`  Duration: ${colors.gray(formatDuration(duration))}`)
  }

  track(usage) {
    const pricing = PRICING[this.model]
    if (!pricing) {
      return
    }

    const inputTokens = usage.input_tokens || 0
    const outputTokens = usage.output_tokens || 0
    const cacheWriteTokens = usage.cache_creation_input_tokens || 0
    const cacheReadTokens = usage.cache_read_input_tokens || 0

    const cost =
      inputTokens * pricing.input +
      outputTokens * pricing.output +
      cacheWriteTokens * pricing.cache_write +
      cacheReadTokens * pricing.cache_read

    this.session.input += inputTokens
    this.session.output += outputTokens
    this.session.cacheWrite += cacheWriteTokens
    this.session.cacheRead += cacheReadTokens
    this.session.cost += cost

    this.monthly.cost += cost
    this.saveMonthlyStats()
  }
}

export { CostTracker }
