/**
 * @fileoverview Standardized publish runner for Socket projects.
 * Supports both simple single-package and complex multi-package publishing.
 */

import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { parseArgs } from '@socketsecurity/lib/argv/parse'
import { WIN32 } from '@socketsecurity/lib/constants/platform'
import { getDefaultLogger } from '@socketsecurity/lib/logger'
import type { SpawnOptions } from '@socketsecurity/lib/spawn'
import { spawn } from '@socketsecurity/lib/spawn'

const logger = getDefaultLogger()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootPath = path.join(__dirname, '..')

/**
 * Run a command with spawn.
 */
export async function runCommand(
  command: string,
  args: string[] = [],
  options: SpawnOptions = {},
): Promise<number> {
  const result = await spawn(command, args, {
    stdio: 'inherit',
    cwd: rootPath,
    shell: WIN32,
    ...options,
  })
  return result.code ?? 1
}

/**
 * Validate that build artifacts exist.
 */
export async function validateBuildArtifacts(): Promise<boolean> {
  logger.step('Validating build artifacts')

  // Check for registry package dist directory
  const registryDist = path.join(rootPath, 'registry', 'dist')
  if (!existsSync(registryDist)) {
    logger.error('Missing registry/dist directory')
    return false
  }

  // Check for registry package main entry point
  const registryIndex = path.join(registryDist, 'index.js')
  if (!existsSync(registryIndex)) {
    logger.error('Missing registry/dist/index.js')
    return false
  }

  logger.success('Build artifacts validated')
  return true
}

/**
 * Publish packages using the complex multi-package flow.
 * Delegates to scripts/npm/publish-npm-packages.mts.
 */
interface PublishOptions {
  force?: boolean
  forcePublish?: boolean
  forceRegistry?: boolean
  skipNpmPackages?: boolean
  tag?: string
}

export async function publishComplex(
  options: PublishOptions = {},
): Promise<boolean> {
  const {
    force = false,
    forcePublish = false,
    forceRegistry = false,
    skipNpmPackages = false,
    tag = 'latest',
  } = options

  logger.step('Publishing packages')

  // Build args for the npm publish script
  const publishArgs = ['run', 'package-npm-publish']

  const flags = []
  if (force || forcePublish) {
    flags.push('--force-publish')
  }
  if (forceRegistry) {
    flags.push('--force-registry')
  }
  if (skipNpmPackages) {
    flags.push('--skip-npm-packages')
  }

  if (flags.length > 0) {
    publishArgs.push('--', ...flags)
  }

  // Set DIST_TAG environment variable for the publish script
  const exitCode = await runCommand('pnpm', publishArgs, {
    env: {
      ...process.env,
      DIST_TAG: tag,
    },
  })

  if (exitCode !== 0) {
    logger.error('Publish failed')
    return false
  }

  logger.success('Publish complete')
  return true
}

async function main(): Promise<void> {
  try {
    // Parse arguments
    const { values } = parseArgs({
      options: {
        help: {
          type: 'boolean',
          default: false,
        },
        force: {
          type: 'boolean',
          default: false,
        },
        'force-publish': {
          type: 'boolean',
          default: false,
        },
        'force-registry': {
          type: 'boolean',
          default: false,
        },
        'skip-build': {
          type: 'boolean',
          default: false,
        },
        'skip-checks': {
          type: 'boolean',
          default: false,
        },
        'skip-npm-packages': {
          type: 'boolean',
          default: false,
        },
        tag: {
          type: 'string',
        },
      },
      allowPositionals: false,
      strict: false,
    })

    // Show help if requested
    if (values.help) {
      logger.log('\nUsage: pnpm publish [options]')
      logger.log('\nOptions:')
      logger.log('  --help                Show this help message')
      logger.log('  --force               Force publish even with warnings')
      logger.log(
        '  --force-publish       Force publish all packages without commit checks',
      )
      logger.log(
        '  --force-registry      Force publish @socketsecurity/registry',
      )
      logger.log(
        '  --skip-build          Skip build validation (validates artifacts exist)',
      )
      logger.log('  --skip-checks         Skip pre-publish checks')
      logger.log(
        '  --skip-npm-packages   Skip publishing npm override packages',
      )
      logger.log('  --tag <tag>           npm dist-tag (default: latest)')
      logger.log('\nExamples:')
      logger.log('  pnpm publish                    # Standard publish flow')
      logger.log(
        '  pnpm publish --force-registry   # Force publish registry package',
      )
      logger.log(
        '  pnpm publish --skip-npm-packages # Only publish registry package',
      )
      process.exitCode = 0
      return
    }

    logger.log('\n────────────────────────────────────────────────────────────')
    logger.log('  Publish Runner')
    logger.log('────────────────────────────────────────────────────────────')

    // Validate build artifacts if not skipping.
    if (!values['skip-build']) {
      const artifactsExist = await validateBuildArtifacts()
      if (!artifactsExist && !values.force) {
        logger.error('Build artifacts missing - run pnpm build first')
        process.exitCode = 1
        return
      }
    }

    // Publish using complex flow (delegates to package-npm-publish script)
    const publishOpts: PublishOptions = {}
    if (values['force']) {
      publishOpts.force = true
    }
    if (values['force-publish']) {
      publishOpts.forcePublish = true
    }
    if (values['force-registry']) {
      publishOpts.forceRegistry = true
    }
    if (values['skip-npm-packages']) {
      publishOpts.skipNpmPackages = true
    }
    publishOpts.tag =
      (values['tag'] as string | undefined) ??
      process.env['DIST_TAG'] ??
      'latest'
    const publishSuccess = await publishComplex(publishOpts)

    if (!publishSuccess && !values.force) {
      logger.error('Publish failed')
      process.exitCode = 1
      return
    }

    logger.log('\n────────────────────────────────────────────────────────────')
    logger.success('Publish completed successfully!')
    process.exitCode = 0
  } catch (e) {
    logger.error(`Publish runner failed: ${(e as Error).message}`)
    process.exitCode = 1
  }
}

main().catch((e: unknown) => {
  logger.error(e)
  process.exitCode = 1
})
