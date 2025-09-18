/**
 * @fileoverview Test runner for the project.
 * Handles test execution with Vitest, including:
 * - Force flag processing for running all tests
 * - Test environment setup for npm package tests
 * - Glob pattern expansion for test file selection
 * - Cross-platform compatibility (Windows/Unix)
 */
'use strict'

const { spawn, spawnSync } = require('node:child_process')
const { existsSync } = require('node:fs')
const path = require('node:path')

const fastGlob = require('fast-glob')

const constants = require('@socketregistry/scripts/constants')
const { logger } = require('@socketsecurity/registry/lib/logger')

void (async () => {
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

      // Check if we're running npm tests and need to set up the test environment.
      const isNpmTest = args.some(arg => arg.includes('npm.test'))
      if (isNpmTest) {
        // Check if test environment needs setup.
        const needsSetup =
          !existsSync(constants.testNpmNodeWorkspacesPath) ||
          !existsSync(constants.testNpmNodeModulesPath)

        if (needsSetup) {
          logger.log('Setting up test environment...')
          const setupResult = spawnSync(
            'node',
            [
              path.join(
                constants.rootPath,
                'scripts',
                'update-test-npm-package-json.js'
              ),
              '--force'
            ],
            {
              cwd: constants.rootPath,
              stdio: 'inherit',
              shell: WIN32
            }
          )

          if (setupResult.status !== 0) {
            logger.error('Failed to set up test environment')
            // eslint-disable-next-line n/no-process-exit
            process.exit(1)
          }
        }
      }
    }

    const spawnEnv = {
      ...process.env,
      ...(hasForce ? { FORCE_TEST: '1' } : {})
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
    const vitestArgs = ['run', ...expandedArgs]

    const child = spawn(vitestPath, vitestArgs, {
      cwd: constants.rootPath,
      stdio: 'inherit',
      env: spawnEnv,
      shell: WIN32
    })

    child.on('exit', code => {
      // eslint-disable-next-line n/no-process-exit
      process.exit(code || 0)
    })
  } catch (e) {
    logger.error('Error running tests:', e)
    // eslint-disable-next-line n/no-process-exit
    process.exit(1)
  }
})()
