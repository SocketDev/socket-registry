/**
 * @fileoverview JavaScript compilation using esbuild (10x faster than tsgo)
 * This replaces tsgo for JS compilation while keeping tsgo for declarations
 */
import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { build, context } from 'esbuild'
import fg from 'fast-glob'

import { printError, printSuccess } from '../../scripts/utils/cli-helpers.mjs'
import {
  analyzeMetafile,
  buildConfig,
  watchConfig,
} from '../.config/esbuild.config.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootPath = path.join(__dirname, '..')
const srcPath = path.join(rootPath, 'src')
const distPath = path.join(rootPath, 'dist')

const isQuiet = process.argv.includes('--quiet')
const isVerbose = process.argv.includes('--verbose')
const isWatch = process.argv.includes('--watch')
const isNeeded = process.argv.includes('--needed')

/**
 * Check if build is needed by comparing source and output timestamps.
 */
function isBuildNeeded() {
  if (!existsSync(distPath)) {
    return true
  }

  const sourceFiles = fg.sync('**/*.{ts,mts,cts}', {
    cwd: srcPath,
    absolute: true,
    ignore: ['**/*.d.ts'],
  })

  if (sourceFiles.length === 0) {
    return false
  }

  // Find newest source file timestamp.
  let newestSource = 0
  for (const file of sourceFiles) {
    const stat = statSync(file)
    if (stat.mtimeMs > newestSource) {
      newestSource = stat.mtimeMs
    }
  }

  // Find oldest output file timestamp.
  const outputFiles = fg.sync('**/*.js', {
    cwd: distPath,
    absolute: true,
  })

  if (outputFiles.length === 0) {
    return true
  }

  let oldestOutput = Number.POSITIVE_INFINITY
  for (const file of outputFiles) {
    const stat = statSync(file)
    if (stat.mtimeMs < oldestOutput) {
      oldestOutput = stat.mtimeMs
    }
  }

  // Build needed if any source is newer than oldest output.
  return newestSource > oldestOutput
}

/**
 * Standard build for production
 */
async function buildJS() {
  try {
    // Check if build is needed when --needed flag is passed.
    if (isNeeded && !isBuildNeeded()) {
      if (!isQuiet) {
        console.log('→ Build not needed, skipping')
      }
      return 0
    }

    if (!isQuiet) {
      console.log('→ Building JavaScript with esbuild')
    }

    const startTime = Date.now()
    const result = await build({
      ...buildConfig,
      logLevel: isQuiet ? 'silent' : isVerbose ? 'debug' : 'info',
    })

    const buildTime = Date.now() - startTime

    if (!isQuiet) {
      console.log(`  JavaScript built in ${buildTime}ms`)

      if (result?.metafile && isVerbose) {
        const analysis = analyzeMetafile(result.metafile)
        console.log(`  Total size: ${analysis.totalSize}`)
      }
    }

    return 0
  } catch (error) {
    if (!isQuiet) {
      printError('JavaScript build failed')
      console.error(error)
    }
    return 1
  }
}

/**
 * Watch mode with incremental builds (68% faster rebuilds)
 */
async function watchJS() {
  try {
    if (!isQuiet) {
      console.log('→ Starting watch mode with incremental builds')
      console.log('  Watching for file changes...')
    }

    const ctx = await context({
      ...watchConfig,
      logLevel: isQuiet ? 'silent' : isVerbose ? 'debug' : 'warning',
      plugins: [
        ...(watchConfig.plugins || []),
        {
          name: 'rebuild-logger',
          setup(build) {
            build.onEnd(result => {
              if (result.errors.length > 0) {
                if (!isQuiet) {
                  printError('Rebuild failed')
                }
              } else {
                if (!isQuiet) {
                  printSuccess('Rebuild succeeded')

                  if (result?.metafile && isVerbose) {
                    const analysis = analyzeMetafile(result.metafile)
                    console.log(`  Total size: ${analysis.totalSize}`)
                  }
                }
              }
            })
          },
        },
      ],
    })

    await ctx.watch()

    // Keep process alive
    process.on('SIGINT', async () => {
      if (!isQuiet) {
        console.log('\nStopping watch mode...')
      }
      await ctx.dispose()
      process.exit(0)
    })

    // Wait indefinitely
    await new Promise(() => {})
  } catch (error) {
    if (!isQuiet) {
      printError('Watch mode failed')
      console.error(error)
    }
    return 1
  }
}

// Main
if (isWatch) {
  watchJS().catch(error => {
    console.error(error)
    process.exit(1)
  })
} else {
  buildJS()
    .then(code => {
      process.exitCode = code
    })
    .catch(error => {
      console.error(error)
      process.exitCode = 1
    })
}
