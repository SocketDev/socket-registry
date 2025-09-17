'use strict'

const path = require('node:path')

const fastGlob = require('fast-glob')
const { execPnpm } = require('@socketsecurity/registry/lib/agent')

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

  try {
    await execPnpm(['exec', 'tsc', '--noEmit', '--skipLibCheck', ...dtsPaths], {
      stdio: 'inherit'
    })
  } catch (error) {
    throw new Error(`TypeScript type checking failed: ${error.message}`)
  }
})()
