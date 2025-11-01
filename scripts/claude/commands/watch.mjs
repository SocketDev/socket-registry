/**
 * @fileoverview Watch command - continuous monitoring mode.
 * Watches for file changes and auto-fixes issues.
 */

import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'

import colors from 'yoctocolors-cjs'

import {
  autonomousFixSession,
  scanProjectForIssues,
} from '../automated-fixing.mjs'
import { log, parentPath, rootPath, SOCKET_PROJECTS } from '../config.mjs'
import { printHeader } from '../utils/formatting.mjs'

/**
 * Continuous monitoring mode - watches for changes and auto-fixes issues.
 */
async function runWatchMode(claudeCmd, options = {}) {
  const opts = { __proto__: null, ...options }
  printHeader('Watch Mode - Continuous Monitoring')

  log.info('Starting continuous monitoring...')
  log.substep('Press Ctrl+C to stop')

  const _watchPath = !opts['cross-repo'] ? rootPath : parentPath
  const projects = !opts['cross-repo']
    ? [{ name: path.basename(rootPath), path: rootPath }]
    : SOCKET_PROJECTS.map(name => ({
        name,
        path: path.join(parentPath, name),
      })).filter(p => existsSync(p.path))

  log.substep(`Monitoring ${projects.length} project(s)`)

  // Track last scan time to avoid duplicate scans
  const lastScanTime = new Map()
  // 5 seconds between scans
  const SCAN_COOLDOWN = 5000

  // File watcher for each project
  const watchers = []

  for (const project of projects) {
    log.substep(`Watching: ${project.name}`)

    const watcher = fs.watch(
      project.path,
      { recursive: true },
      async (_eventType, filename) => {
        // Skip common ignore patterns
        if (
          !filename ||
          filename.includes('node_modules') ||
          filename.includes('.git') ||
          filename.includes('dist') ||
          filename.includes('build') ||
          !filename.match(/\.(m?[jt]sx?)$/)
        ) {
          return
        }

        const now = Date.now()
        const lastScan = lastScanTime.get(project.name) || 0

        // Cooldown to avoid rapid re-scans
        if (now - lastScan < SCAN_COOLDOWN) {
          return
        }

        lastScanTime.set(project.name, now)

        log.progress(`Change detected in ${project.name}/${filename}`)
        log.substep('Scanning for issues...')

        try {
          // Run focused scan on changed file
          const scanResults = await scanProjectForIssues(claudeCmd, project, {
            ...opts,
            focusFiles: [filename],
            smartContext: true,
          })

          if (scanResults && Object.keys(scanResults).length > 0) {
            log.substep('Issues detected, auto-fixing...')

            // Auto-fix in careful mode
            await autonomousFixSession(
              claudeCmd,
              { [project.name]: scanResults },
              [project],
              {
                ...opts,
                // Force auto-fix in watch mode
                prompt: false,
              },
            )
          } else {
            log.done('No issues found')
          }
        } catch (error) {
          log.failed(`Error scanning ${project.name}: ${error.message}`)
        }
      },
    )

    watchers.push(watcher)
  }

  // Periodic full scans (every 30 minutes)
  const fullScanInterval = setInterval(
    async () => {
      log.step('Running periodic full scan')

      for (const project of projects) {
        try {
          const scanResults = await scanProjectForIssues(
            claudeCmd,
            project,
            opts,
          )

          if (scanResults && Object.keys(scanResults).length > 0) {
            await autonomousFixSession(
              claudeCmd,
              { [project.name]: scanResults },
              [project],
              {
                ...opts,
                prompt: false,
              },
            )
          }
        } catch (error) {
          log.failed(`Full scan error in ${project.name}: ${error.message}`)
        }
      }
      // 30 minutes
    },
    30 * 60 * 1000,
  )

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(`\n${colors.yellow('Stopping watch mode...')}`)

    // Clean up watchers
    for (const watcher of watchers) {
      watcher.close()
    }

    // Clear interval
    if (fullScanInterval) {
      clearInterval(fullScanInterval)
    }

    log.success('Watch mode stopped')
    process.exitCode = 0

    process.exit(0)
  })

  // Keep process alive
  await new Promise(() => {})
}

export { runWatchMode }
