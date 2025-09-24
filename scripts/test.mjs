/**
 * @fileoverview Test runner for the project.
 * Handles test execution with Vitest, including:
 * - Force flag processing for running all tests
 * - Test environment setup for npm package tests
 * - Glob pattern expansion for test file selection
 * - Cross-platform compatibility (Windows/Unix)
 */
'use strict'

import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

import fastGlob from 'fast-glob'

import { logger } from '@socketsecurity/registry/lib/logger'

import constants from '@socketregistry/scripts/constants'

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
    }

    // Check if we're running npm tests.
    const isNpmTest = args.length === 0 || args.some(arg => arg.includes('npm'))

    // Set up test environment if needed (happens regardless of --force flag).
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
              'update-test-npm-package-json.js',
            ),
            '--force',
          ],
          {
            cwd: constants.rootPath,
            stdio: 'inherit',
            shell: WIN32,
          },
        )

        if (setupResult.status) {
          logger.error('Failed to set up test environment')
          process.exitCode = 1
          return
        }
      }
    }

    const spawnEnv = {
      ...process.env,
      ...(hasForce ? { FORCE_TEST: '1' } : {}),
      // Increase Node.js heap size to prevent out of memory errors in tests.
      // Use 8GB in CI environments, 4GB locally.
      // Add --max-semi-space-size to improve GC performance for RegExp-heavy tests.
      NODE_OPTIONS:
        `${process.env.NODE_OPTIONS || ''} --max-old-space-size=${process.env.CI ? 8192 : 4096} --max-semi-space-size=512`.trim(),
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
      shell: WIN32,
    })

    child.on('exit', code => {
      process.exitCode = code || 0
    })
  } catch (e) {
    logger.error('Error running tests:', e)
    process.exitCode = 1
  }
})()
