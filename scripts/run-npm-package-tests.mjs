import { existsSync, promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { parseArgs } from '../registry/dist/lib/parse-args.js'

import WIN32 from '../registry/dist/lib/constants/WIN32.js'

import constants from './constants.mjs'
import { suppressMaxListenersWarning } from './utils/suppress-warnings.mjs'
import { resolveOriginalPackageName } from '../registry/dist/lib/packages.js'
import { pEach } from '../registry/dist/lib/promises.js'
import { logger } from '../registry/dist/lib/logger.js'
import { spawn } from '../registry/dist/lib/spawn.js'

const { values: cliArgs } = parseArgs({
  options: {
    package: {
      type: 'string',
      multiple: true,
    },
    concurrency: {
      type: 'string',
      // Reduce concurrency in CI to avoid memory issues, especially on Windows.
      default: process.env.CI ? (WIN32 ? '3' : '8') : '20',
    },
    'temp-dir': {
      type: 'string',
      default: path.join(os.tmpdir(), 'npm-package-tests'),
    },
    force: {
      type: 'boolean',
      default: false,
    },
  },
  strict: false,
})

const concurrency = Math.max(1, parseInt(cliArgs.concurrency, 10) || 3)
const tempBaseDir = cliArgs.tempDir

async function runCommand(command, args, options = {}) {
  try {
    const result = await spawn(command, args, {
      stdio: 'pipe',
      shell: process.platform.startsWith('win'),
      ...options,
    })
    return { stdout: result.stdout, stderr: result.stderr }
  } catch (error) {
    const commandError = new Error(
      `Command failed: ${command} ${args.join(' ')}`,
    )
    commandError.code = error.code || error.exitCode
    commandError.stdout = error.stdout || ''
    commandError.stderr = error.stderr || ''
    throw commandError
  }
}

async function runPackageTest(socketPkgName) {
  const origPkgName = resolveOriginalPackageName(socketPkgName)
  const packageTempDir = path.join(tempBaseDir, socketPkgName)

  if (!existsSync(packageTempDir)) {
    logger.fail(`${origPkgName}: Package not found in temp directory`)
    return {
      package: origPkgName,
      passed: false,
      reason: 'Package not downloaded',
    }
  }

  const installedPath = path.join(packageTempDir, 'node_modules', origPkgName)

  if (!existsSync(installedPath)) {
    logger.fail(`${origPkgName}: Installed package not found`)
    return {
      package: origPkgName,
      passed: false,
      reason: 'Package not installed',
    }
  }

  try {
    // Check if package.json exists and has test script.
    const pkgJsonPath = path.join(installedPath, 'package.json')
    const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'))
    const testScript = pkgJson.scripts?.test

    if (!testScript) {
      logger.warn(`${origPkgName}: No test script`)
      return { package: origPkgName, passed: false, reason: 'No test script' }
    }

    // Run the test (removed individual log message for cleaner output).

    // Add root node_modules/.bin to PATH for test runners.
    const rootBinPath = path.join(constants.rootPath, 'node_modules', '.bin')
    const env = {
      ...process.env,
      PATH: `${rootBinPath}${path.delimiter}${process.env.PATH}`,
    }

    await runCommand('npm', ['test'], { cwd: installedPath, env })

    logger.success(origPkgName)
    return { package: origPkgName, passed: true }
  } catch (error) {
    logger.fail(origPkgName)
    if (error.stderr) {
      logger.log(`   Error output:`)
      logger.log(
        error.stderr
          .split('\n')
          .slice(0, 20)
          .map(line => `     ${line}`)
          .join('\n'),
      )
    }
    if (error.stdout) {
      logger.log(`   Test output:`)
      logger.log(
        error.stdout
          .split('\n')
          .slice(-20)
          .map(line => `     ${line}`)
          .join('\n'),
      )
    }
    return { package: origPkgName, passed: false, reason: error.message }
  }
}

async function main() {
  suppressMaxListenersWarning()

  // Check if install results exist.
  const installResultsFile = path.join(tempBaseDir, 'install-results.json')
  let installResults = []

  if (existsSync(installResultsFile)) {
    try {
      const resultsData = await fs.readFile(installResultsFile, 'utf8')
      installResults = JSON.parse(resultsData)
    } catch (error) {
      logger.warn(`Could not read install results: ${error.message}`)
    }
  } else {
    // Fallback to download results for backwards compatibility.
    const downloadResultsFile = path.join(tempBaseDir, 'download-results.json')
    if (existsSync(downloadResultsFile)) {
      try {
        const resultsData = await fs.readFile(downloadResultsFile, 'utf8')
        const downloadResults = JSON.parse(resultsData)
        // Convert download results to install-like format.
        installResults = downloadResults
          .filter(r => r.downloaded)
          .map(r => ({
            ...r,
            installed: r.downloaded,
          }))
      } catch (error) {
        logger.warn(`Could not read download results: ${error.message}`)
      }
    }
  }

  // Determine which packages to test.
  let packagesToTest = []

  if (cliArgs.package?.length) {
    // Test specific packages requested.
    packagesToTest = cliArgs.package
  } else if (installResults.length > 0) {
    // Test all successfully installed packages.
    packagesToTest = installResults
      .filter(r => r.installed)
      .map(r => r.socketPackage || resolveOriginalPackageName(r.package))
  } else {
    // Fallback to all packages.
    packagesToTest = constants.npmPackageNames
  }

  if (packagesToTest.length === 0) {
    logger.warn('No packages to test')
    process.exitCode = 0
    return
  }

  logger.log(
    `Running tests for ${packagesToTest.length} packages with concurrency ${concurrency}...`,
  )

  const results = []

  await pEach(
    packagesToTest,
    async pkgName => {
      const result = await runPackageTest(pkgName)
      results.push(result)
    },
    { concurrency },
  )

  // Summary.
  logger.log('\n' + '='.repeat(60))
  logger.log('TEST SUMMARY')
  logger.log('='.repeat(60))

  const passed = results.filter(r => r.passed)
  const failed = results.filter(r => !r.passed && r.reason !== 'Skipped')
  const skipped = results.filter(r => r.reason === 'Skipped')

  // Calculate total tested (excluding skipped).
  const totalTested = results.length - skipped.length

  logger.success(
    `Passed: ${passed.length}/${totalTested} (${results.length} total)`,
  )

  // Never clean up the cache directory - it's persistent by design.

  // Set exit code for process termination.
  // With --force flag, always exit with 0 regardless of failures.
  process.exitCode = cliArgs.force ? 0 : failed.length ? 1 : 0
}

main().catch(console.error)
