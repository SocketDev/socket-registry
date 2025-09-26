/**
 * @fileoverview Package downloading utility from npm registry.
 * Downloads and extracts npm packages for analysis and override generation.
 */

import { existsSync, promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import util from 'node:util'

import constants from './constants.mjs'
import ENV from '@socketsecurity/registry/lib/constants/env'
import WIN32 from '@socketsecurity/registry/lib/constants/win32'
import {
  readPackageJson,
  resolveOriginalPackageName,
} from '@socketsecurity/registry/lib/packages'
import { pEach } from '@socketsecurity/registry/lib/promises'
import { LOG_SYMBOLS, logger } from '@socketsecurity/registry/lib/logger'

const { values: cliArgs } = util.parseArgs({
  options: {
    package: {
      type: 'string',
      multiple: true,
    },
    concurrency: {
      type: 'string',
      // Reduce concurrency in CI to avoid memory issues, especially on Windows.
      default: ENV.CI ? (WIN32 ? '5' : '10') : '50',
    },
    'temp-dir': {
      type: 'string',
      default: path.join(os.tmpdir(), 'npm-package-tests'),
    },
  },
})

const concurrency = Math.max(1, parseInt(cliArgs.concurrency, 10))
const tempBaseDir = cliArgs['temp-dir']
const MAX_PROGRESS_WIDTH = 80

// Progress tracking for line wrapping.
let currentLinePosition = 0
let completedPackages = 0
let totalPackagesCount = 0

function writeProgress(symbol) {
  if (currentLinePosition >= MAX_PROGRESS_WIDTH) {
    completedPackages++
    process.stdout.write(`\n(${completedPackages}/${totalPackagesCount}) `)
    currentLinePosition = `(${completedPackages}/${totalPackagesCount}) `.length
  }
  process.stdout.write(symbol)
  currentLinePosition++
}

async function downloadPackage(socketPkgName) {
  const origPkgName = resolveOriginalPackageName(socketPkgName)

  // Check if this package should be skipped.
  const skipTestsMap = constants.skipTestsByEcosystem
  const skipSet = skipTestsMap.get('npm')
  if (skipSet && (skipSet.has(socketPkgName) || skipSet.has(origPkgName))) {
    writeProgress(LOG_SYMBOLS.warn)
    return {
      package: origPkgName,
      socketPackage: socketPkgName,
      downloaded: false,
      reason: 'Skipped',
    }
  }

  const overridePath = path.join(constants.npmPackagesPath, socketPkgName)

  if (!existsSync(overridePath)) {
    writeProgress(LOG_SYMBOLS.fail)
    return {
      package: origPkgName,
      socketPackage: socketPkgName,
      downloaded: false,
      reason: 'No override',
    }
  }

  try {
    // Read the test/npm/package.json to get the version spec.
    const testPkgJson = await readPackageJson(constants.testNpmPkgJsonPath, {
      normalize: true,
    })
    const versionSpec = testPkgJson.devDependencies?.[origPkgName]

    if (!versionSpec) {
      writeProgress(LOG_SYMBOLS.fail)
      return {
        package: origPkgName,
        socketPackage: socketPkgName,
        downloaded: false,
        reason: 'Not in devDependencies',
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

void (async () => {
  const packages = cliArgs.package?.length
    ? cliArgs.package
    : constants.npmPackageNames

  logger.log(
    `Processing package info for ${packages.length} packages with concurrency ${concurrency}...`,
  )
  logger.log(`Temp directory: ${tempBaseDir}`)
  logger.log(
    `Progress: ${LOG_SYMBOLS.success} = success, ${LOG_SYMBOLS.fail} = failed, ${LOG_SYMBOLS.warn} = skipped\n`,
  )

  // Initialize progress tracking.
  totalPackagesCount = packages.length
  completedPackages = 0
  currentLinePosition = 0
  process.stdout.write('(0/' + totalPackagesCount + ') ')
  currentLinePosition = ('(0/' + totalPackagesCount + ') ').length

  // Ensure base temp directory exists.
  await fs.mkdir(tempBaseDir, { recursive: true })

  const results = []

  await pEach(
    packages,
    async pkgName => {
      const result = await downloadPackage(pkgName)
      results.push(result)
    },
    { concurrency },
  )

  // Add newline after progress indicators.
  process.stdout.write('\n')

  const failed = results.filter(r => !r.downloaded && r.reason !== 'Skipped')

  // Write results to file for the install phase.
  const resultsFile = path.join(tempBaseDir, 'download-results.json')
  await fs.writeFile(resultsFile, JSON.stringify(results, null, 2))

  // Set exit code for process termination.
  process.exitCode = failed.length ? 1 : 0
})()
