/**
 * @fileoverview Test runner for the project.
 * Handles test execution with Vitest, including:
 * - Force flag processing for running all tests
 * - Test environment setup for npm package tests
 * - Glob pattern expansion for test file selection
 * - Cross-platform compatibility (Windows/Unix)
 */

import path from 'node:path'

import fastGlob from 'fast-glob'

import { logger } from '../registry/dist/lib/logger.js'
import { spawn } from '../registry/dist/lib/spawn.js'

import constants from './constants.mjs'

async function main() {
  const { WIN32 } = constants

  try {
    // Separate force flag from other arguments.
    let args = process.argv.slice(2)

    // Remove the -- separator if it's the first argument.
    if (args[0] === '--') {
      args = args.slice(1)
    }

    // Check if --force is present anywhere in the arguments.
    const forceIndex = args.indexOf('--force')
    const hasForce = forceIndex !== -1

    if (hasForce) {
      // Remove --force from arguments.
      args.splice(forceIndex, 1)
    }

    const spawnEnv = {
      ...process.env,
      ...(hasForce ? { FORCE_TEST: '1' } : {}),
    }

    // Handle Windows vs Unix for vitest executable.
    const vitestCmd = WIN32 ? 'vitest.cmd' : 'vitest'
    const vitestPath = path.join(constants.rootNodeModulesBinPath, vitestCmd)

    // Expand glob patterns in arguments.
    const expandedArgs = []
    for (const arg of args) {
      // Check if the argument looks like a glob pattern.
      if (arg.includes('*') && !arg.startsWith('-')) {
        const files = fastGlob.sync(arg, { cwd: constants.rootPath })
        expandedArgs.push(...files)
      } else {
        expandedArgs.push(arg)
      }
    }

    // Pass remaining arguments to vitest.
    const vitestArgs = [
      'run',
      '--config',
      '.config/vitest.config.mts',
      ...expandedArgs,
    ]

    // On Windows, .cmd files need to be executed with shell: true.
    const spawnOptions = {
      cwd: constants.rootPath,
      env: spawnEnv,
      shell: WIN32,
      stdio: 'inherit',
    }

    await spawn(vitestPath, vitestArgs, spawnOptions)
      .then(result => {
        process.exitCode = result.code || 0
      })
      .catch(e => {
        logger.error('Error running tests:', e)
        process.exitCode = 1
      })
  } catch (e) {
    logger.error('Error running tests:', e)
    process.exitCode = 1
  }
}

main().catch(console.error)
