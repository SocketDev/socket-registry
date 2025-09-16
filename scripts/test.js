'use strict'

const { spawn } = require('node:child_process')
const path = require('node:path')
const constants = require('@socketregistry/scripts/constants')

void (async () => {
  try {
    const vitestPath = path.join(constants.rootPath, 'node_modules/.bin/vitest')
    const args = ['run', ...process.argv.slice(2)]

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
