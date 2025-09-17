'use strict'

const { spawn } = require('node:child_process')
const path = require('node:path')

const constants = require('@socketregistry/scripts/constants')

void (async () => {
  const { WIN32 } = constants

  try {
    // Separate force flag from other arguments.
    const args = process.argv.slice(2)

    // Check if --force is present anywhere in the arguments.
    const forceIndex = args.indexOf('--force')
    const hasForce = forceIndex !== -1

    if (hasForce) {
      // Remove --force from arguments.
      args.splice(forceIndex, 1)
    }

    // Also remove the -- separator if it becomes empty after removing --force.
    const dashDashIndex = args.indexOf('--')
    if (dashDashIndex !== -1 && dashDashIndex === args.length - 1) {
      args.splice(dashDashIndex, 1)
    }

    const spawnEnv = {
      ...process.env,
      ...(hasForce ? { FORCE_TEST: '1' } : {})
    }

    // Handle Windows vs Unix for vitest executable.
    const vitestCmd = WIN32 ? 'vitest.cmd' : 'vitest'
    const vitestPath = path.join(
      constants.rootPath,
      'node_modules',
      '.bin',
      vitestCmd
    )

    // Pass remaining arguments to vitest.
    const vitestArgs = ['run', ...args]

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
    console.error('Error running tests:', e)
    // eslint-disable-next-line n/no-process-exit
    process.exit(1)
  }
})()
