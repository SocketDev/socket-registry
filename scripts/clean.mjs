/**
 * @fileoverview Clean script for the registry.
 * Removes build artifacts, caches, and other generated files.
 *
 * Usage:
 *   node scripts/clean.mjs [options]
 *
 * Options:
 *   --cache           Clean cache directories only
 *   --coverage        Clean coverage reports only
 *   --registry        Clean registry build only
 *   --test            Clean test artifacts only
 *   --test-cache      Clean test cache only
 *   --tsbuildinfo     Clean tsbuildinfo files only
 *   --node-modules    Clean node_modules
 *   --all             Clean everything (default)
 */

import { parseArgs } from 'node:util'
import { logger } from '@socketsecurity/registry/lib/logger'
import { runCommand, runSequence } from './utils/run-command.mjs'

async function main() {
  try {
    const { values } = parseArgs({
      options: {
        all: { type: 'boolean', default: false },
        cache: { type: 'boolean', default: false },
        coverage: { type: 'boolean', default: false },
        'node-modules': { type: 'boolean', default: false },
        registry: { type: 'boolean', default: false },
        test: { type: 'boolean', default: false },
        'test-cache': { type: 'boolean', default: false },
        tsbuildinfo: { type: 'boolean', default: false },
      },
      strict: false,
    })

    // If no specific option is provided, clean everything
    const cleanAll =
      values.all ||
      (!values.cache &&
        !values.coverage &&
        !values.registry &&
        !values.test &&
        !values['test-cache'] &&
        !values.tsbuildinfo &&
        !values['node-modules'])

    const tasks = []

    if (cleanAll || values.cache) {
      tasks.push({ name: 'cache', pattern: '**/.cache' })
    }

    if (cleanAll || values.coverage) {
      tasks.push({ name: 'coverage', pattern: 'coverage' })
    }

    if (cleanAll || values.registry) {
      tasks.push({
        command: 'pnpm',
        name: 'registry',
        runCommand: true,
        args: ['--filter', 'registry', 'run', 'clean'],
      })
    }

    if (cleanAll || values.test) {
      tasks.push({
        name: 'test',
        pattern: 'test/**/.tmp-* test/**/packages',
      })
    }

    if (cleanAll || values['test-cache']) {
      tasks.push({
        command: 'node',
        name: 'test-cache',
        runCommand: true,
        args: ['./scripts/clean-test-cache.mjs'],
      })
    }

    if (cleanAll || values.tsbuildinfo) {
      tasks.push({
        name: 'tsbuildinfo',
        pattern: '*.tsbuildinfo',
      })
    }

    if (values['node-modules']) {
      tasks.push({ name: 'node_modules', pattern: '**/node_modules' })
    }

    if (tasks.length === 0) {
      logger.log('Nothing to clean')
      return
    }

    logger.log('Cleaning...')
    let hadError = false

    for (const task of tasks) {
      logger.log(`  - ${task.name}`)
      if (task.runCommand) {
        // eslint-disable-next-line no-await-in-loop
        const exitCode = await runCommand(task.command, task.args, {
          stdio: 'inherit',
        })
        if (exitCode !== 0) {
          hadError = true
        }
      } else {
        // eslint-disable-next-line no-await-in-loop
        const exitCode = await runCommand('del-cli', [task.pattern], {
          stdio: 'pipe',
        })
        if (exitCode !== 0) {
          hadError = true
        }
      }
    }

    if (hadError) {
      process.exitCode = 1
    } else {
      logger.log('Clean complete')
    }
  } catch (error) {
    logger.error('Clean failed:', error.message)
    process.exitCode = 1
  }
}

main()
