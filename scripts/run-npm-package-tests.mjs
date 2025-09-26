import { existsSync, promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import util from 'node:util'

import WIN32 from '@socketsecurity/registry/lib/constants/win32'

import constants from './constants.mjs'
import { safeRemove } from './utils/fs.mjs'
import { resolveOriginalPackageName } from '@socketsecurity/registry/lib/packages'
import { pEach } from '@socketsecurity/registry/lib/promises'
import { logger } from '@socketsecurity/registry/lib/logger'
import { spawn } from '@socketsecurity/registry/lib/spawn'

const { values: cliArgs } = util.parseArgs({
  options: {
    package: {
      type: 'string',
      multiple: true,
    },
    concurrency: {
      type: 'string',
      // Reduce concurrency in CI to avoid memory issues, especially on Windows.
      default: process.env.CI ? (WIN32 ? '2' : '5') : '20',
    },
    'temp-dir': {
      type: 'string',
      default: path.join(os.tmpdir(), 'npm-package-tests'),
    },
    force: {
      type: 'boolean',
      default: false,
    },
    cleanup: {
      type: 'boolean',
      default: true,
    },
  },
})

const concurrency = Math.max(1, parseInt(cliArgs.concurrency, 10) || 3)
const tempBaseDir = cliArgs['temp-dir']

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

    // Run the test.
    logger.log(`🧪 ${origPkgName}: Running tests...`)

    // Add root node_modules/.bin to PATH for test runners.
    const rootBinPath = path.join(constants.rootPath, 'node_modules', '.bin')
    const env = {
      ...process.env,
      PATH: `${rootBinPath}${path.delimiter}${process.env.PATH}`,
    }

    await runCommand('npm', ['test'], { cwd: installedPath, env })

    logger.success(`${origPkgName}: Tests passed!`)
    return { package: origPkgName, passed: true }
  } catch (error) {
    logger.fail(`${origPkgName}: Tests failed`)
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
  } finally {
    // Clean up package temp directory if requested.
    if (cliArgs.cleanup) {
      await safeRemove(packageTempDir)
    }
  }
}

void (async () => {
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
  logger.log(`Temp directory: ${tempBaseDir}\n`)

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
  passed.forEach(r => logger.log(`   ${r.package}`))

  if (skipped.length > 0) {
    logger.warn(`Skipped: ${skipped.length}/${results.length} (known issues)`)
    skipped.forEach(r => logger.log(`   ${r.package}`))
  }

  if (failed.length) {
    logger.fail(
      `Failed: ${failed.length}/${totalTested} (${results.length} total)`,
    )
    failed.forEach(r =>
      logger.log(`   ${r.package}: ${r.reason?.substring(0, 50)}...`),
    )
  } else if (totalTested > 0) {
    // All non-skipped tests passed.
    logger.log('')
    logger.success('🎉 All tests passed! (excluding skipped packages)')
  }

  // Clean up base temp directory if no packages left and cleanup is enabled.
  if (cliArgs.cleanup && existsSync(tempBaseDir)) {
    const remainingFiles = await fs.readdir(tempBaseDir)
    // Only remove if just the results file remains.
    if (
      remainingFiles.length <= 1 &&
      remainingFiles.includes('download-results.json')
    ) {
      await safeRemove(tempBaseDir)
      logger.log('\nCleaned up temp directory')
    }
  }

  // Set exit code for process termination.
  // With --force flag, always exit with 0 regardless of failures.
  process.exitCode = cliArgs.force ? 0 : failed.length ? 1 : 0
})()
