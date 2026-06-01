/**
 * @file Build runner: rolldown for the per-file source build, tsgo for
 *   declarations.
 */

import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { rolldown, watch } from 'rolldown'
import fg from 'fast-glob'

import { isQuiet } from '@socketsecurity/lib/argv/flag-predicates'
import { getDefaultLogger } from '@socketsecurity/lib/logger/default'
import { printFooter } from '@socketsecurity/lib/stdio/footer'
import { printHeader } from '@socketsecurity/lib/stdio/header'

import { buildConfig } from '../.config/rolldown.config.mts'
import { parseArgs } from '@socketsecurity/lib-stable/argv/parse'
import { runSequence } from '../../scripts/fleet/util/run-command.mts'
import process from 'node:process'

const logger = getDefaultLogger()

const rootPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

/**
 * Build source code with esbuild. Returns { exitCode, buildTime, result } for
 * external logging.
 */
export async function buildSource(options = {}) {
  const { quiet = false, skipClean = false, verbose = false } = options

  // Clean dist directory if needed.
  if (!skipClean) {
    const exitCode = await runSequence([
      {
        args: ['exec', 'del-cli', 'dist', '**/*.tsbuildinfo', '--', '--quiet'],
        command: 'pnpm',
        options: {
          cwd: rootPath,
          shell: process.platform === 'win32',
        },
      },
    ])
    if (exitCode !== 0) {
      if (!quiet) {
        logger.error('Clean failed')
      }
      return { exitCode, buildTime: 0 }
    }
  }

  try {
    const startTime = Date.now()
    const { output, ...inputOptions } = buildConfig
    const bundle = await rolldown(inputOptions)
    try {
      await bundle.write(output)
    } finally {
      await bundle.close()
    }
    const buildTime = Date.now() - startTime

    // No post-build transform needed: rolldown emits clean named CJS
    // (`exports.foo = foo`) directly, which Node ESM consumes for named
    // imports. esbuild's `__toCommonJS` wrapper required the rewrite; rolldown
    // doesn't.

    return { exitCode: 0, buildTime }
  } catch (e) {
    if (!quiet) {
      logger.error('Source build failed')
      logger.fail(e)
    }
    return { exitCode: 1, buildTime: 0 }
  }
}

/**
 * Build TypeScript declarations. Returns exitCode for external logging.
 */
export async function buildTypes(options = {}) {
  const {
    quiet = false,
    skipClean = false,
    verbose: _verbose = false,
  } = options

  const commands = []

  if (!skipClean) {
    commands.push({
      args: ['exec', 'del-cli', '**/*.tsbuildinfo', '--', '--quiet'],
      command: 'pnpm',
      options: {
        cwd: rootPath,
        shell: process.platform === 'win32',
      },
    })
  }

  commands.push({
    args: ['exec', 'tsgo', '--project', 'tsconfig.dts.json'],
    command: 'pnpm',
    options: {
      cwd: rootPath,
      shell: process.platform === 'win32',
    },
  })

  const exitCode = await runSequence(commands)

  if (exitCode !== 0) {
    if (!quiet) {
      logger.error('Type declarations build failed')
    }
  }

  return exitCode
}

/**
 * Check if build is needed by comparing source and output timestamps.
 */
export function isBuildNeeded() {
  const distPath = path.join(rootPath, 'dist')
  const srcPath = path.join(rootPath, 'src')

  if (!existsSync(distPath)) {
    return true
  }

  // Use fast-glob to find source files.
  const sourceFiles = fg.sync('**/*.{ts,mts,cts}', {
    cwd: srcPath,
    absolute: true,
    ignore: ['**/*.d.ts'],
  })

  if (!sourceFiles.length) {
    return false
  }

  // Find newest source file timestamp.
  let newestSource = 0
  for (let i = 0, { length } = sourceFiles; i < length; i += 1) {
    const file = sourceFiles[i]
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

  if (!outputFiles.length) {
    return true
  }

  let oldestOutput = Number.POSITIVE_INFINITY
  for (let i = 0, { length } = outputFiles; i < length; i += 1) {
    const file = outputFiles[i]
    const stat = statSync(file)
    if (stat.mtimeMs < oldestOutput) {
      oldestOutput = stat.mtimeMs
    }
  }

  // Build needed if any source is newer than oldest output.
  return newestSource > oldestOutput
}

/**
 * Watch mode for development with incremental builds (68% faster rebuilds).
 */
export async function watchBuild(options = {}) {
  const { quiet = false } = options

  if (!quiet) {
    logger.info('Starting watch mode with incremental builds')
    logger.indent('Watching for file changes…')
  }

  try {
    const { output, ...inputOptions } = buildConfig
    const watcher = watch({ ...inputOptions, output })

    // rolldown requires closing each build's result on BUNDLE_END to avoid
    // leaking native handles; ERROR surfaces a failed rebuild.
    watcher.on('event', event => {
      if (event.code === 'BUNDLE_END') {
        if (!quiet) {
          logger.success('Rebuild succeeded')
        }
        event.result.close()
      } else if (event.code === 'ERROR') {
        if (!quiet) {
          logger.error('Rebuild failed')
          logger.error(event.error)
        }
      }
    })

    // Keep the process alive; close the watcher on Ctrl-C.
    process.on('SIGINT', () => {
      watcher.close().finally(() => process.exit(0))
    })

    // Wait indefinitely.
    await new Promise(() => {})
  } catch (e) {
    if (!quiet) {
      logger.error('Watch mode failed:', e)
    }
    return 1
  }
}

async function main() {
  try {
    // Parse arguments.
    const { values } = parseArgs({
      options: {
        help: {
          type: 'boolean',
          default: false,
        },
        src: {
          type: 'boolean',
          default: false,
        },
        types: {
          type: 'boolean',
          default: false,
        },
        watch: {
          type: 'boolean',
          default: false,
        },
        needed: {
          type: 'boolean',
          default: false,
        },
        analyze: {
          type: 'boolean',
          default: false,
        },
        silent: {
          type: 'boolean',
          default: false,
        },
        quiet: {
          type: 'boolean',
          default: false,
        },
        verbose: {
          type: 'boolean',
          default: false,
        },
      },
      allowPositionals: false,
      strict: false,
    })

    // Show help if requested.
    if (values.help) {
      logger.log('Build Runner')
      logger.log('')
      logger.log('Usage: pnpm build [options]')
      logger.log('')
      logger.log('Options:')
      logger.log('  --help       Show this help message')
      logger.log('  --src        Build source code only')
      logger.log('  --types      Build TypeScript declarations only')
      logger.log(
        '  --watch      Watch mode with incremental builds (68% faster rebuilds)',
      )
      logger.log('  --needed     Only build if dist files are missing')
      logger.log('  --analyze    Show bundle size analysis')
      logger.log('  --quiet, --silent  Suppress progress messages')
      logger.log('  --verbose    Show detailed build output')
      logger.log('')
      logger.log('Examples:')
      logger.log('  pnpm build              # Full build (source + types)')
      logger.log('  pnpm build --src        # Build source only')
      logger.log('  pnpm build --types      # Build types only')
      logger.log(
        '  pnpm build --watch      # Watch mode with incremental builds',
      )
      logger.log('  pnpm build --analyze    # Build with size analysis')
      logger.log('')
      logger.log(
        'Note: Watch mode uses esbuild context API for 68% faster rebuilds',
      )
      process.exitCode = 0
      return
    }

    const quiet = isQuiet(values)
    const verbose = values.verbose

    // Check if build is needed.
    if (values.needed && !isBuildNeeded()) {
      if (!quiet) {
        logger.info('Build artifacts exist, skipping build')
      }
      process.exitCode = 0
      return
    }

    let exitCode = 0

    // Handle watch mode.
    if (values.watch) {
      if (!quiet) {
        printHeader('Build Runner (Watch Mode)')
      }
      exitCode = await watchBuild({ quiet, verbose })
    }
    // Build types only.
    else if (values.types && !values.src) {
      if (!quiet) {
        printHeader('Building TypeScript Declarations')
      }
      exitCode = await buildTypes({ quiet, verbose })
      if (exitCode === 0 && !quiet) {
        logger.indent('Type declarations built')
      }
    }
    // Build source only.
    else if (values.src && !values.types) {
      if (!quiet) {
        printHeader('Building Source')
      }
      const { buildTime, exitCode: srcExitCode } = await buildSource({
        quiet,
        verbose,
        analyze: values.analyze,
      })
      exitCode = srcExitCode
      if (exitCode === 0 && !quiet) {
        logger.indent(`Source build complete in ${buildTime}ms`)
      }
    }
    // Build everything (default).
    else {
      if (!quiet) {
        printHeader('Building Package')
      }

      // Check if build is needed when --needed flag is used.
      const buildNeeded = !values.needed || isBuildNeeded()
      if (!buildNeeded) {
        if (!quiet) {
          logger.info('Build artifacts exist, skipping build')
        }
        process.exitCode = 0
        return
      }

      // Clean dist directory.
      exitCode = await runSequence([
        {
          args: [
            'exec',
            'del-cli',
            'dist',
            '**/*.tsbuildinfo',
            '--',
            '--quiet',
          ],
          command: 'pnpm',
          options: {
            cwd: rootPath,
            shell: process.platform === 'win32',
          },
        },
      ])
      if (exitCode !== 0) {
        if (!quiet) {
          logger.error('Clean failed')
        }
        process.exitCode = exitCode
        return
      }

      if (!quiet) {
        logger.success('Build Cleaned')
      }

      // Run source and types builds in parallel.
      const [srcResult, typesExitCode] = await Promise.all([
        buildSource({
          quiet,
          verbose,
          skipClean: true,
          analyze: values.analyze,
        }),
        buildTypes({ quiet, verbose, skipClean: true }),
      ])

      // Check if any of the parallel builds failed.
      exitCode = srcResult.exitCode !== 0 ? srcResult.exitCode : typesExitCode
    }

    // Print final status and footer.
    if (!quiet) {
      if (exitCode === 0) {
        logger.success('Build completed successfully!')
      } else {
        logger.fail('Build failed')
      }
      printFooter()
    }

    if (exitCode !== 0) {
      process.exitCode = exitCode
    }
  } catch (e) {
    logger.error(`Build runner failed: ${e.message}`)
    process.exitCode = 1
  }
}

main().catch(console.error)
