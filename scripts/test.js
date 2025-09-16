'use strict'

const { spawn } = require('node:child_process')
const path = require('node:path')
const util = require('node:util')

const constants = require('@socketregistry/scripts/constants')

void (async () => {
  try {
    // Parse arguments to check for force flag.
    const { positionals, values: cliArgs } = util.parseArgs({
      ...constants.parseArgsConfig,
      args: process.argv.slice(2),
      allowPositionals: true
    })

    // Set environment variable if force flag is present.
    if (cliArgs.force) {
      process.env.FORCE_TEST = '1'
    }

    const vitestPath = path.join(constants.rootPath, 'node_modules/.bin/vitest')
    // Only pass non-flag arguments to vitest.
    const args = ['run', ...positionals]

    const child = spawn(vitestPath, args, {
      cwd: constants.rootPath,
      stdio: 'inherit',
      env: process.env
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
