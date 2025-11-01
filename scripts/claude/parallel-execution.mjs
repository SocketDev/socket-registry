/**
 * @fileoverview Parallel task execution utilities.
 * Provides functions for running tasks concurrently with progress tracking.
 */

import { log } from './config.mjs'

/**
 * Execute tasks in parallel with multiple workers.
 * Default: 3 workers (balanced performance without overwhelming system)
 */
async function executeParallel(tasks, workers = 3) {
  if (workers === 1 || tasks.length === 1) {
    // Sequential execution
    const results = []
    for (const task of tasks) {
      results.push(await task())
    }
    return results
  }

  // Parallel execution with worker limit
  log.substep(`🚀 Executing ${tasks.length} tasks with ${workers} workers`)
  const results = []
  const executing = []

  for (const task of tasks) {
    const promise = task().then(result => {
      executing.splice(executing.indexOf(promise), 1)
      return result
    })

    results.push(promise)
    executing.push(promise)

    if (executing.length >= workers) {
      await Promise.race(executing)
    }
  }

  return Promise.all(results)
}

/**
 * Run tasks in parallel with progress tracking.
 * NOTE: When running Claude agents in parallel, they must use stdio: 'pipe' to avoid
 * conflicting interactive prompts. If agents need user interaction, they would queue
 * and block each other. Use --seq flag for sequential execution with full interactivity.
 */
async function runParallel(tasks, description = 'tasks', taskNames = []) {
  log.info(`Running ${tasks.length} ${description} in parallel...`)

  const startTime = Date.now()
  let completed = 0

  // Add progress tracking to each task
  const trackedTasks = tasks.map((task, index) => {
    const name = taskNames[index] || `Task ${index + 1}`
    const taskStartTime = Date.now()

    return task.then(
      result => {
        completed++
        const elapsed = Math.round((Date.now() - taskStartTime) / 1000)
        log.done(
          `[${name}] Completed (${elapsed}s) - ${completed}/${tasks.length}`,
        )
        return result
      },
      error => {
        completed++
        const elapsed = Math.round((Date.now() - taskStartTime) / 1000)
        log.failed(
          `[${name}] Failed (${elapsed}s) - ${completed}/${tasks.length}`,
        )
        throw error
      },
    )
  })

  // Progress indicator
  const progressInterval = setInterval(() => {
    const elapsed = Math.round((Date.now() - startTime) / 1000)
    const pending = tasks.length - completed
    if (pending > 0) {
      log.substep(
        `Progress: ${completed}/${tasks.length} complete, ${pending} running (${elapsed}s elapsed)`,
      )
    }
  }, 15_000)
  // Update every 15 seconds

  const results = await Promise.allSettled(trackedTasks)
  clearInterval(progressInterval)

  const totalElapsed = Math.round((Date.now() - startTime) / 1000)
  const succeeded = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  if (failed > 0) {
    log.warn(
      `Completed in ${totalElapsed}s: ${succeeded} succeeded, ${failed} failed`,
    )
    // Log errors with task names
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const name = taskNames[index] || `Task ${index + 1}`
        log.error(`[${name}] failed: ${result.reason}`)
      }
    })
  } else {
    log.success(
      `All ${succeeded} ${description} completed successfully in ${totalElapsed}s`,
    )
  }

  return results
}

/**
 * Determine if parallel execution should be used.
 */
function shouldRunParallel(options = {}) {
  const opts = { __proto__: null, ...options }
  // Parallel is only used when:
  // 1. --cross-repo is specified (multi-repo mode)
  // 2. AND --seq is not specified
  if (opts['cross-repo'] && !opts.seq) {
    return true
  }
  return false
}

export { executeParallel, runParallel, shouldRunParallel }
