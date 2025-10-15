/** @fileoverview Wrapper script for running all tests with --force flag support. */

import path from 'node:path'

import { logger } from '../registry/dist/lib/logger.js'
import { spawn } from '../registry/dist/lib/spawn.js'

import constants from './constants.mjs'

/**
 * Run a command with the specified arguments.
 * @throws {Error} When command exits with non-zero code.
 */
async function runCommand(command, args, options) {
  const opts = { __proto__: null, shell: constants.WIN32, ...options }
  try {
    const result = await spawn(command, args, {
      cwd: constants.rootPath,
      env: process.env,
      stdio: 'inherit',
      ...opts,
    })
    if (result.code !== 0) {
      throw new Error(
        `${command} ${args.join(' ')} exited with code ${result.code}`,
      )
    }
  } catch (e) {
    throw new Error(`${command} ${args.join(' ')} failed: ${e.message}`)
  }
}

async function main() {
  try {
    // Get arguments passed to this script.
    let args = process.argv.slice(2)

    // Remove the -- separator if it's the first argument.
    if (args[0] === '--') {
      args = args.slice(1)
    }

    // Pass all arguments to the underlying scripts.
    logger.log('Running checks...\n')
    await runCommand('pnpm', ['run', 'check'])

    logger.log('\nRunning unit tests...\n')
    const testScriptPath = path.join(constants.rootPath, 'scripts', 'test.mjs')
    await runCommand('node', [testScriptPath, ...args])

    logger.log('\nRunning npm package tests...\n')
    const npmTestScriptPath = path.join(
      constants.rootPath,
      'scripts',
      'test-npm-packages.mjs',
    )
    await runCommand('node', [npmTestScriptPath, ...args])

    process.exitCode = 0
  } catch (e) {
    logger.error('Test suite failed:', e.message)
    process.exitCode = 1
  }
}

main().catch(console.error)
