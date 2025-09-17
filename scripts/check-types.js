'use strict'

const { spawnSync } = require('node:child_process')
const path = require('node:path')

const fastGlob = require('fast-glob')

const constants = require('@socketregistry/scripts/constants')

const rootDir = path.resolve(__dirname, '..')

void (async () => {
  // Find all .d.ts files excluding node_modules using fast-glob.
  const dtsPaths = await fastGlob.glob('**/*.d.ts', {
    cwd: rootDir,
    absolute: true,
    ignore: ['**/node_modules/**', '**/node_workspaces/**']
  })

  if (!dtsPaths.length) {
    console.log('No TypeScript declaration files found to check.')
    return
  }

  console.log(`Checking ${dtsPaths.length} TypeScript declaration files...`)

  // Run tsc on the filtered files.
  const result = spawnSync(
    'npx',
    ['tsc', '--noEmit', '--skipLibCheck', ...dtsPaths],
    {
      stdio: 'inherit',
      shell: constants.WIN32
    }
  )

  if (result.status !== 0) {
    throw new Error(
      `TypeScript type checking failed with exit code ${result.status}`
    )
  }
})()
