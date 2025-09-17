'use strict'

const { spawnSync } = require('node:child_process')
const path = require('node:path')
const fastGlob = require('fast-glob')

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

  // Show the files being checked.
  for (const dtsPath of dtsPaths) {
    console.log(`  - ${path.relative(rootDir, dtsPath)}`)
  }

  console.log('')

  // Run tsc on the filtered files.
  const result = spawnSync(
    'npx',
    ['tsc', '--noEmit', '--skipLibCheck', ...dtsPaths],
    {
      stdio: 'inherit',
      shell: true
    }
  )

  if (result.status !== 0) {
    throw new Error(
      `TypeScript type checking failed with exit code ${result.status}`
    )
  }
})()
