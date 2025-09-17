'use strict'

const { spawn } = require('node:child_process')
const path = require('node:path')

const constants = require('@socketregistry/scripts/constants')

void (async () => {
  try {
    // Separate force flag from other arguments.
    const args = process.argv.slice(2)
    const forceIndex = args.indexOf('--force')

    let hasForce = false
    if (forceIndex !== -1) {
      hasForce = true
      // Remove --force from arguments.
      args.splice(forceIndex, 1)
    }

    const spawnEnv = {
      ...process.env,
      ...(hasForce ? { FORCE_TEST: '1' } : {})
    }

    const vitestPath = path.join(constants.rootPath, 'node_modules/.bin/vitest')
    // Pass remaining arguments to vitest.
    const vitestArgs = ['run', ...args]

    const child = spawn(vitestPath, vitestArgs, {
      cwd: constants.rootPath,
      stdio: 'inherit',
      env: spawnEnv
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
