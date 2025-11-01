/**
 * @fileoverview Snapshot system for smart rollback.
 * Provides git-based snapshots for safe experimentation.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'

import colors from 'yoctocolors-cjs'

import { log, REPO_STORAGE, rootPath } from './config.mjs'
import { formatDuration } from './utils/formatting.mjs'

class SnapshotManager {
  constructor() {
    this.snapshots = []
  }

  async createSnapshot(label, runCommandWithOutput) {
    const sha = await runCommandWithOutput('git', ['rev-parse', 'HEAD'], {
      cwd: rootPath,
    })
    const diff = await runCommandWithOutput('git', ['diff', 'HEAD'], {
      cwd: rootPath,
    })

    const snapshot = {
      diff: diff.stdout,
      label,
      sha: sha.stdout.trim(),
      timestamp: Date.now(),
    }

    this.snapshots.push(snapshot)

    // Save snapshot to disk.
    const snapshotPath = path.join(
      REPO_STORAGE.snapshots,
      `snapshot-${Date.now()}.json`,
    )
    await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2))

    return snapshot
  }

  listSnapshots() {
    console.log(colors.cyan('\n📸 Available Snapshots:'))
    this.snapshots.forEach((snap, i) => {
      const age = formatDuration(Date.now() - snap.timestamp)
      console.log(
        `  ${i + 1}. ${snap.label} ${colors.gray(`(${age} ago, ${snap.sha.substring(0, 7)})`)}`,
      )
    })
  }

  async rollback(steps, runCommand) {
    if (this.snapshots.length < steps) {
      log.warn(`Only ${this.snapshots.length} snapshot(s) available`)
      return false
    }

    const target = this.snapshots[this.snapshots.length - steps]
    log.warn(`Rolling back ${steps} fix(es) to: ${target.label}`)

    await runCommand('git', ['reset', '--hard', target.sha], { cwd: rootPath })

    // Re-apply diff if there was one.
    if (target.diff) {
      await runCommand('git', ['apply'], {
        cwd: rootPath,
        input: target.diff,
      })
    }

    log.done('Rollback complete')
    return true
  }
}

export { SnapshotManager }
