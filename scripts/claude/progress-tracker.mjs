/**
 * @fileoverview Progress tracking with ETA estimation.
 * Tracks phases and provides time estimates based on historical data.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'

import colors from 'yoctocolors-cjs'

import { STORAGE_PATHS } from './config.mjs'
import { formatDuration } from './utils/formatting.mjs'

class ProgressTracker {
  constructor() {
    this.currentPhase = null
    this.history = this.loadHistory()
    this.phases = []
    this.startTime = Date.now()
  }

  complete() {
    this.endPhase()
    this.saveHistory()
  }

  endPhase() {
    if (this.currentPhase) {
      this.currentPhase.duration = Date.now() - this.currentPhase.start
      this.phases.push(this.currentPhase)
      this.currentPhase = null
    }
  }

  estimateETA(phaseName) {
    // Find similar past sessions.
    const similar = this.history.filter(s =>
      s.phases.some(p => p.name === phaseName),
    )
    if (similar.length === 0) {
      return null
    }

    // Get median duration for this phase.
    const durations = similar
      .map(s => s.phases.find(p => p.name === phaseName)?.duration)
      .filter(d => d)
      .sort((a, b) => a - b)

    if (durations.length === 0) {
      return null
    }

    const median = durations[Math.floor(durations.length / 2)]
    return median
  }

  getTotalETA() {
    // Sum up remaining phases based on historical data.
    const remaining = ['ci-monitor', 'commit', 'local-checks'].filter(
      p => !this.phases.some(ph => ph.name === p),
    )

    let total = 0
    for (const phase of remaining) {
      const eta = this.estimateETA(phase)
      if (eta) {
        total += eta
      }
    }

    // Add current phase remaining time.
    if (this.currentPhase) {
      const eta = this.estimateETA(this.currentPhase.name)
      if (eta) {
        const elapsed = Date.now() - this.currentPhase.start
        total += Math.max(0, eta - elapsed)
      }
    }

    return total > 0 ? total : null
  }

  loadHistory() {
    try {
      if (existsSync(STORAGE_PATHS.history)) {
        const data = JSON.parse(readFileSync(STORAGE_PATHS.history, 'utf8'))
        // Keep only last 50 sessions.
        return data.sessions.slice(-50)
      }
    } catch {
      // Ignore errors.
    }
    return []
  }

  saveHistory() {
    try {
      const data = {
        sessions: [
          ...this.history,
          { phases: this.phases, timestamp: Date.now() },
        ],
      }
      // Keep only last 50 sessions.
      if (data.sessions.length > 50) {
        data.sessions = data.sessions.slice(-50)
      }
      writeFileSync(STORAGE_PATHS.history, JSON.stringify(data, null, 2))
    } catch {
      // Ignore errors.
    }
  }

  showProgress() {
    const totalElapsed = Date.now() - this.startTime
    const eta = this.getTotalETA()

    console.log(colors.cyan('\n⏱️  Progress:'))
    console.log(`  Elapsed: ${formatDuration(totalElapsed)}`)
    if (eta) {
      console.log(`  ETA: ${formatDuration(eta)}`)
    }

    if (this.currentPhase) {
      const phaseElapsed = Date.now() - this.currentPhase.start
      console.log(
        colors.gray(
          `  Current: ${this.currentPhase.name} (${formatDuration(phaseElapsed)})`,
        ),
      )
    }

    // Show completed phases.
    if (this.phases.length > 0) {
      console.log(colors.gray('  Completed:'))
      this.phases.forEach(p => {
        console.log(
          colors.gray(
            `    ${colors.green('✓')} ${p.name} (${formatDuration(p.duration)})`,
          ),
        )
      })
    }
  }

  startPhase(name) {
    if (this.currentPhase) {
      this.endPhase()
    }
    this.currentPhase = { name, start: Date.now() }
  }
}

export { ProgressTracker }
