/** @fileoverview Wrapper script for running all tests with --force flag support. */

import { spawn } from 'node:child_process'
import path from 'node:path'

import { logger } from '../registry/dist/lib/logger.js'

import constants from './constants.mjs'

/**
 * Run a command with the specified arguments.
 * @throws {Error} When command exits with non-zero code.
 */
async function runCommand(command, args = [], options) {
  const opts = { __proto__: null, ...options }
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: constants.rootPath,
      stdio: 'inherit',
      env: process.env,
      ...opts,
    })

    child.on('exit', code => {
      if (code === 0) {
        resolve()
      } else {
        reject(
          new Error(`${command} ${args.join(' ')} exited with code ${code}`),
        )
      }
    })

    child.on('error', error => {
      reject(error)
    })
  })
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
