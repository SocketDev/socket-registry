/**
 * @fileoverview Validates that esbuild configuration has minify: false.
 * Minification breaks ESM/CJS interop and makes debugging harder.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getDefaultLogger } from '@socketsecurity/lib/logger'

import { runValidationScript } from '../utils/validation-runner.mjs'

const logger = getDefaultLogger()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootPath = path.join(__dirname, '..', '..')

/**
 * Validate esbuild configuration has minify: false.
 */
async function validateEsbuildMinify() {
  const configPath = path.join(rootPath, 'registry/.config/esbuild.config.mjs')

  try {
    // Dynamic import of the esbuild config
    const config = await import(configPath)
    const violations = []

    // Check buildConfig
    if (config.buildConfig) {
      if (config.buildConfig.minify !== false) {
        violations.push({
          config: 'buildConfig',
          value: config.buildConfig.minify,
          message: 'buildConfig.minify must be false',
          location: `${configPath}:70`,
        })
      }
    }

    // Check watchConfig
    if (config.watchConfig) {
      if (config.watchConfig.minify !== false) {
        violations.push({
          config: 'watchConfig',
          value: config.watchConfig.minify,
          message: 'watchConfig.minify must be false',
          location: `${configPath}:98`,
        })
      }
    }

    return violations
  } catch (error) {
    logger.fail(`Failed to load esbuild config: ${error.message}`)
    process.exitCode = 1
    return []
  }
}

async function main() {
  await runValidationScript(
    async () => {
      const violations = await validateEsbuildMinify()

      if (violations.length > 0) {
        logger.log('')

        for (const violation of violations) {
          logger.log(`  ${violation.message}`)
          logger.log(`  Found: minify: ${violation.value}`)
          logger.log('  Expected: minify: false')
          logger.log(`  Location: ${violation.location}`)
          logger.log('')
        }

        logger.log(
          'Minification breaks ESM/CJS interop and makes debugging harder.',
        )
        logger.log('')
      }

      return violations
    },
    {
      failureMessage: 'esbuild minify validation failed',
      successMessage: 'esbuild minify validation passed',
    },
  )
}

main()
