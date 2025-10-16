/**
 * @fileoverview Package validation utility for npm package testing.
 * Validates that Socket overrides either have manual tests (test/npm/<pkg-name>.test.mts) or are in test/npm/package.json devDependencies.
 */

import { existsSync, promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WIN32 } from '../registry/dist/constants/platform.js'
import { CI } from '../registry/dist/env/ci.js'
import { LOG_SYMBOLS, logger } from '../registry/dist/lib/logger.js'
import {
  readPackageJson,
  resolveOriginalPackageName,
} from '../registry/dist/lib/packages.js'
import { parseArgs } from '../registry/dist/lib/parse-args.js'
import { pEach } from '../registry/dist/lib/promises.js'
import { pluralize } from '../registry/dist/lib/words.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootPath = path.dirname(__dirname)

const npmPackagesPath = path.join(rootPath, 'packages', 'npm')
const testNpmPath = path.join(rootPath, 'test', 'npm')
const testNpmPkgJsonPath = path.join(testNpmPath, 'package.json')

function getNpmPackageNames() {
  return fs
    .readdirSync(npmPackagesPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
    .map(dirent => dirent.name)
}

const { values: cliArgs } = parseArgs({
  options: {
    concurrency: {
      type: 'string',
      default: CI ? (WIN32 ? '10' : '20') : '50',
    },
    'temp-dir': {
      type: 'string',
      default: path.join(os.tmpdir(), 'npm-package-tests'),
    },
    package: {
      type: 'string',
      multiple: true,
    },
    'clear-cache': {
      type: 'boolean',
      default: false,
    },
  },
  strict: false,
})

const concurrency = Math.max(1, Number.parseInt(cliArgs.concurrency, 10))
const tempBaseDir = cliArgs.tempDir

function writeProgress() {
  // Don't output progress dots, too noisy.
}

async function validatePackage(socketPkgName) {
  const origPkgName = resolveOriginalPackageName(socketPkgName)

  const overridePath = path.join(npmPackagesPath, socketPkgName)

  if (!existsSync(overridePath)) {
    writeProgress(LOG_SYMBOLS.fail)
    return {
      package: origPkgName,
      socketPackage: socketPkgName,
      downloaded: false,
      reason: 'No override',
    }
  }

  // Check if there's a manual test file for this package.
  const manualTestPath = path.join(testNpmPath, `${socketPkgName}.test.mts`)
  const hasManualTest = existsSync(manualTestPath)

  if (hasManualTest) {
    // Skip devDependencies check for packages with manual tests.
    writeProgress(LOG_SYMBOLS.success)
    return {
      package: origPkgName,
      socketPackage: socketPkgName,
      downloaded: true,
      reason: 'Skipped - has manual test',
      overridePath,
    }
  }

  try {
    // Read the test/npm/package.json to get the version spec.
    const testPkgJson = await readPackageJson(testNpmPkgJsonPath, {
      normalize: true,
    })
    const versionSpec = testPkgJson.devDependencies?.[origPkgName]

    if (!versionSpec) {
      writeProgress(LOG_SYMBOLS.fail)
      return {
        package: origPkgName,
        socketPackage: socketPkgName,
        downloaded: false,
        reason: 'Not in test/npm/package.json devDependencies',
      }
    }

    writeProgress(LOG_SYMBOLS.success)

    return {
      package: origPkgName,
      socketPackage: socketPkgName,
      downloaded: true,
      versionSpec,
      overridePath,
    }
  } catch (error) {
    writeProgress(LOG_SYMBOLS.fail)
    return {
      package: origPkgName,
      socketPackage: socketPkgName,
      downloaded: false,
      reason: error.message,
    }
  }
}

async function main() {
  const packages = cliArgs.package?.length
    ? cliArgs.package
    : getNpmPackageNames()

  // Ensure base temp directory exists.
  await fs.mkdir(tempBaseDir, { recursive: true })

  // Check if download results already exist and are fresh.
  const resultsFile = path.join(tempBaseDir, 'download-results.json')
  const clearCache = cliArgs.clearCache

  // Clear cache if requested.
  if (clearCache && existsSync(resultsFile)) {
    await fs.unlink(resultsFile)
    logger.log('🗑️ Cleared download cache')
  }

  // Load existing cache if available.
  let cachedResults = []
  if (!clearCache && existsSync(resultsFile)) {
    try {
      cachedResults = JSON.parse(await fs.readFile(resultsFile, 'utf8'))
    } catch {
      logger.warn('Could not read cache, starting fresh...')
    }
  }

  // Determine which packages need processing.
  let packagesToProcess = packages
  let usedCache = false

  if (cachedResults.length > 0) {
    if (cliArgs.package?.length) {
      // For specific packages, check which ones are already cached.
      const cachedPackageNames = new Set(
        cachedResults.map(r => r.socketPackage || r.package),
      )
      const missingPackages = packages.filter(
        pkg => !cachedPackageNames.has(pkg),
      )

      if (missingPackages.length === 0) {
        // All requested packages are cached.
        const relevantResults = cachedResults.filter(
          r =>
            packages.includes(r.socketPackage) || packages.includes(r.package),
        )
        logger.log(
          `💾 Using cached download results (${relevantResults.length} ${pluralize('package', { count: relevantResults.length })})`,
        )
        await fs.writeFile(
          resultsFile,
          JSON.stringify(relevantResults, null, 2),
        )
        process.exitCode = 0
        return
      }
      if (missingPackages.length < packages.length) {
        // Some packages are cached, only process missing ones.
        packagesToProcess = missingPackages
        usedCache = true
        logger.log(
          `💾 Found ${packages.length - missingPackages.length} cached, processing ${missingPackages.length} new ${pluralize('package', { count: missingPackages.length })}...`,
        )
      }
    } else {
      // For full run, check if cache has all packages.
      const cachedPackageNames = cachedResults
        .map(r => r.socketPackage || r.package)
        .sort()
      const requestedPackages = packages.slice().sort()
      if (
        JSON.stringify(cachedPackageNames) === JSON.stringify(requestedPackages)
      ) {
        logger.log(
          `💾 Using cached download results (${cachedResults.length} ${pluralize('package', { count: cachedResults.length })})`,
        )
        process.exitCode = 0
        return
      }
    }
  }

  logger.log(
    `Processing ${packagesToProcess.length} ${pluralize('package', { count: packagesToProcess.length })}...`,
  )

  // Start with cached results if doing incremental update.
  const results =
    usedCache && cliArgs.package?.length
      ? cachedResults.filter(
          r =>
            !packagesToProcess.includes(r.socketPackage) &&
            !packagesToProcess.includes(r.package),
        )
      : []

  await pEach(
    packagesToProcess,
    async pkgName => {
      const result = await validatePackage(pkgName)
      results.push(result)
    },
    { concurrency },
  )

  const failed = results.filter(r => !r.downloaded && r.reason !== 'Skipped')
  const skipped = results.filter(r => r.reason === 'Skipped')
  const succeeded = results.filter(r => r.downloaded)

  // Summary.
  logger.log(
    `✅ ${clearCache ? 'Redownloaded' : 'Processed'}: ${succeeded.length}`,
  )
  if (skipped.length > 0) {
    logger.log(`⏭️  Skipped: ${skipped.length}`)
  }
  if (failed.length > 0) {
    logger.fail(`Failed: ${failed.length}`)
  }

  // Merge new results with existing cache for full dataset.
  const finalResults =
    cliArgs.package?.length && usedCache
      ? [
          ...cachedResults.filter(
            r =>
              !packages.includes(r.socketPackage) &&
              !packages.includes(r.package),
          ),
          ...results,
        ]
      : results

  // Write results to file for the install phase.
  await fs.writeFile(
    resultsFile,
    JSON.stringify(
      cliArgs.package?.length
        ? finalResults.filter(
            r =>
              packages.includes(r.socketPackage) ||
              packages.includes(r.package),
          )
        : finalResults,
      null,
      2,
    ),
  )

  // Set exit code for process termination.
  process.exitCode = failed.length ? 1 : 0
}

main().catch(console.error)
