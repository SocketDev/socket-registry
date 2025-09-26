/**
 * @fileoverview Package downloading utility from npm registry.
 * Downloads and extracts npm packages for analysis and override generation.
 */
'use strict'

import { existsSync, promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import util from 'node:util'

import constants from './constants.mjs'
import {
  readPackageJson,
  resolveOriginalPackageName,
} from '@socketsecurity/registry/lib/packages'
import { pEach } from '@socketsecurity/registry/lib/promises'
import { logger } from '@socketsecurity/registry/lib/logger'

const { values: cliArgs } = util.parseArgs({
  options: {
    package: {
      type: 'string',
      multiple: true,
    },
    concurrency: {
      type: 'string',
      // Reduce concurrency in CI to avoid memory issues.
      default: '50',
    },
    'temp-dir': {
      type: 'string',
      default: path.join(os.tmpdir(), 'npm-package-tests'),
    },
  },
})

const concurrency = Math.max(1, parseInt(cliArgs.concurrency, 10))
const tempBaseDir = cliArgs['temp-dir']

async function downloadPackage(socketPkgName) {
  const origPkgName = resolveOriginalPackageName(socketPkgName)

  // Check if this package should be skipped.
  const skipTestsMap = constants.skipTestsByEcosystem
  const skipSet = skipTestsMap.get('npm')
  if (skipSet && (skipSet.has(socketPkgName) || skipSet.has(origPkgName))) {
    logger.warn(`${origPkgName}: Skipped (known issues)`)
    return {
      package: origPkgName,
      socketPackage: socketPkgName,
      downloaded: false,
      reason: 'Skipped',
    }
  }

  const overridePath = path.join(constants.npmPackagesPath, socketPkgName)

  if (!existsSync(overridePath)) {
    logger.fail(`${origPkgName}: No Socket override found`)
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
      logger.fail(`${origPkgName}: Not in devDependencies`)
      return {
        package: origPkgName,
        socketPackage: socketPkgName,
        downloaded: false,
        reason: 'Not in devDependencies',
      }
    }

    logger.log(`📦 ${origPkgName}: Downloaded package info`)

    return {
      package: origPkgName,
      socketPackage: socketPkgName,
      downloaded: true,
      versionSpec,
      overridePath,
    }
  } catch (error) {
    logger.fail(`${origPkgName}: Download failed`)
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
  logger.log(`Temp directory: ${tempBaseDir}\n`)

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

  // Summary.
  logger.log('\n' + '='.repeat(60))
  logger.log('PACKAGE INFO SUMMARY')
  logger.log('='.repeat(60))

  const downloaded = results.filter(r => r.downloaded)
  const failed = results.filter(r => !r.downloaded && r.reason !== 'Skipped')
  const skipped = results.filter(r => r.reason === 'Skipped')

  // Calculate total attempted (excluding skipped).
  const totalAttempted = results.length - skipped.length

  logger.success(
    `Ready for install: ${downloaded.length}/${totalAttempted} (${results.length} total)`,
  )

  // Format packages to fit in 80 columns with line wrapping.
  const packageNames = downloaded.map(r => r.package)
  let currentLine = ''

  for (const pkgName of packageNames) {
    const nextItem = currentLine ? ` ${pkgName}` : pkgName

    if (currentLine.length + nextItem.length <= 80) {
      currentLine += nextItem
    } else {
      if (currentLine) {
        logger.log(currentLine)
      }
      currentLine = pkgName
    }
  }

  if (currentLine) {
    logger.log(currentLine)
  }

  if (skipped.length > 0) {
    logger.warn(`Skipped: ${skipped.length}/${results.length} (known issues)`)
    skipped.forEach(r => logger.log(`   ${r.package}`))
  }

  if (failed.length) {
    logger.fail(
      `Failed: ${failed.length}/${totalAttempted} (${results.length} total)`,
    )
    failed.forEach(r =>
      logger.log(`   ${r.package}: ${r.reason?.substring(0, 50)}...`),
    )
  } else if (totalAttempted > 0) {
    // All non-skipped downloads succeeded.
    logger.log('')
    logger.success(
      '🎉 All packages ready for install! (excluding skipped packages)',
    )
  }

  // Write results to file for the install phase.
  const resultsFile = path.join(tempBaseDir, 'download-results.json')
  await fs.writeFile(resultsFile, JSON.stringify(results, null, 2))
  logger.log(`\nPackage info saved to: ${resultsFile}`)

  // Set exit code for process termination.
  process.exitCode = failed.length ? 1 : 0
})()
