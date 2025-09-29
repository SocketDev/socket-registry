import { existsSync, promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { parseArgs } from '../registry/dist/lib/parse-args.js'

import { copy } from 'fs-extra'

import { cleanTestScript } from '../test/utils/script-cleaning.mjs'
import { testRunners } from '../test/utils/test-runners.mjs'
import { suppressMaxListenersWarning } from './utils/suppress-warnings.mjs'
import ENV from '../registry/dist/lib/constants/ENV.js'
import spinner from '../registry/dist/lib/constants/spinner.js'
import WIN32 from '../registry/dist/lib/constants/WIN32.js'
import { readPackageJson } from '../registry/dist/lib/packages.js'
import { pEach } from '../registry/dist/lib/promises.js'
import { LOG_SYMBOLS, logger } from '../registry/dist/lib/logger.js'
import { spawn } from '../registry/dist/lib/spawn.js'
import { pluralize } from '../registry/dist/lib/words.js'

const { values: cliArgs } = parseArgs({
  options: {
    package: {
      type: 'string',
      multiple: true,
    },
    concurrency: {
      type: 'string',
      default: ENV.CI ? (WIN32 ? '5' : '10') : '15',
    },
    'temp-dir': {
      type: 'string',
      default: path.join(os.tmpdir(), 'npm-package-tests'),
    },
  },
  strict: false,
})

const concurrency = Math.max(1, parseInt(cliArgs.concurrency, 10))
const tempBaseDir = cliArgs.tempDir

// Progress tracking.
let completedPackages = 0
let totalPackagesCount = 0
let cachedCount = 0
let installedCount = 0
let failedCount = 0

function writeProgress(symbol) {
  // Track counts silently.
  if (symbol === '✓' || symbol === '💾') {
    cachedCount += 1
  } else if (symbol === LOG_SYMBOLS.success) {
    installedCount += 1
  } else if (symbol === LOG_SYMBOLS.fail || symbol === LOG_SYMBOLS.warn) {
    failedCount += 1
  }
}

function completePackage() {
  completedPackages += 1
}

async function runCommand(command, args, options = {}) {
  try {
    const result = await spawn(command, args, {
      stdio: 'pipe',
      shell: process.platform.startsWith('win'),
      env: { ...process.env, NODE_NO_WARNINGS: '1' },
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

async function installPackage(packageInfo) {
  const {
    overridePath,
    package: origPkgName,
    socketPackage: socketPkgName,
    versionSpec,
  } = packageInfo

  // Create temp directory for this package.
  const packageTempDir = path.join(tempBaseDir, socketPkgName)

  // Check if package is already installed and has a test script.
  const installedPath = path.join(packageTempDir, 'node_modules', origPkgName)
  const packageJsonPath = path.join(installedPath, 'package.json')
  const installMarkerPath = path.join(
    packageTempDir,
    '.socket-install-complete',
  )

  // Check if installation is complete and valid.
  if (existsSync(installMarkerPath) && existsSync(packageJsonPath)) {
    try {
      // Read package.json directly to avoid readPackageJson issues with circular references.
      const existingPkgJson = JSON.parse(
        await fs.readFile(packageJsonPath, 'utf8'),
      )
      const markerData = JSON.parse(
        await fs.readFile(installMarkerPath, 'utf8'),
      )

      // Verify the installation matches the requested version.
      if (
        existingPkgJson.scripts?.test &&
        markerData.versionSpec === versionSpec
      ) {
        // Always reapply Socket override files to ensure they're up-to-date.
        writeProgress('💾')

        // Save existing scripts and devDependencies before copying.
        const savedScripts = existingPkgJson.scripts
        const savedDevDeps = existingPkgJson.devDependencies

        await copy(overridePath, installedPath, {
          overwrite: true,
          dereference: true,
          filter: src =>
            !src.includes('node_modules') && !src.endsWith('.DS_Store'),
        })

        // Restore scripts and devDependencies after copying.
        // Re-read the package.json after copy to get fresh editable instance.
        const restoredPkgJson = await readPackageJson(installedPath, {
          editable: true,
        })
        if (savedScripts) {
          restoredPkgJson.scripts = savedScripts
        }
        if (savedDevDeps) {
          restoredPkgJson.devDependencies = savedDevDeps
        }
        await restoredPkgJson.save()

        // Check mark for cached with refreshed overrides.
        writeProgress('✓')
        completePackage()
        return {
          package: origPkgName,
          socketPackage: socketPkgName,
          installed: true,
          tempDir: packageTempDir,
          cached: true,
        }
      }
    } catch {
      // If we can't read it, reinstall.
    }
  }

  await fs.mkdir(packageTempDir, { recursive: true })

  try {
    // Create minimal package.json in temp directory.
    await fs.writeFile(
      path.join(packageTempDir, 'package.json'),
      JSON.stringify(
        {
          name: 'test-temp',
          version: '1.0.0',
          private: true,
        },
        null,
        2,
      ),
    )

    writeProgress('📦')

    // Install the package.
    const packageSpec = versionSpec.startsWith('https://')
      ? versionSpec
      : `${origPkgName}@${versionSpec}`

    await runCommand('pnpm', ['add', packageSpec], {
      cwd: packageTempDir,
    })

    // Copy Socket override files on top.
    const installedPath = path.join(packageTempDir, 'node_modules', origPkgName)
    writeProgress('🔧')

    // Save original scripts before copying.
    let originalPkgJson = {}
    let originalScripts = {}
    try {
      originalPkgJson = await readPackageJson(installedPath, {
        normalize: true,
      })
      originalScripts = originalPkgJson.scripts || {}
    } catch {
      // Package.json might not exist in the symlink location for some packages.
      // Try the pnpm store location.
      const pnpmStorePath = path.join(
        packageTempDir,
        'node_modules',
        '.pnpm',
        `${origPkgName}@${versionSpec}`,
        'node_modules',
        origPkgName,
      )
      try {
        originalPkgJson = await readPackageJson(pnpmStorePath, {
          normalize: true,
        })
        originalScripts = originalPkgJson.scripts || {}
      } catch {
        // If we still can't read it, that's okay - we'll use the override's package.json.
        originalScripts = {}
      }
    }

    await copy(overridePath, installedPath, {
      overwrite: true,
      dereference: true,
      filter: src =>
        !src.includes('node_modules') && !src.endsWith('.DS_Store'),
    })

    // Merge back the test scripts and devDependencies if they existed.
    const editablePkgJson = await readPackageJson(installedPath, {
      editable: true,
    })

    // Preserve devDependencies from original.
    if (originalPkgJson.devDependencies) {
      editablePkgJson.devDependencies = originalPkgJson.devDependencies
    }

    // Preserve test scripts.
    if (originalScripts) {
      editablePkgJson.scripts = editablePkgJson.scripts || {}

      // Look for actual test runner in scripts.
      const additionalTestRunners = [...testRunners, 'test:stock', 'test:all']
      let actualTestScript = additionalTestRunners.find(
        runner => originalScripts[runner],
      )

      if (!actualTestScript && originalScripts.test) {
        // Try to extract the test runner from the test script.
        const testMatch = originalScripts.test.match(/npm run ([-:\w]+)/)
        if (testMatch && originalScripts[testMatch[1]]) {
          actualTestScript = testMatch[1]
        }
      }

      // Use the actual test script or cleaned version.
      if (actualTestScript && originalScripts[actualTestScript]) {
        editablePkgJson.scripts.test = cleanTestScript(
          originalScripts[actualTestScript],
        )
        // Also preserve the actual script if it's referenced.
        if (actualTestScript !== 'test') {
          editablePkgJson.scripts[actualTestScript] = cleanTestScript(
            originalScripts[actualTestScript],
          )
        }
      } else if (originalScripts.test) {
        // Fallback to simple test script if it exists.
        editablePkgJson.scripts.test = cleanTestScript(originalScripts.test)
      }

      // Preserve any test:* and tests-* scripts that might be referenced.
      for (const [key, value] of Object.entries(originalScripts)) {
        if (
          (key.startsWith('test:') || key.startsWith('tests')) &&
          !editablePkgJson.scripts[key]
        ) {
          editablePkgJson.scripts[key] = cleanTestScript(value)
        }
      }
    }

    await editablePkgJson.save()

    // Check for test script.
    const testScript = editablePkgJson.scripts?.test

    if (!testScript) {
      writeProgress(LOG_SYMBOLS.warn)
      completePackage()
      return {
        package: origPkgName,
        socketPackage: socketPkgName,
        installed: false,
        reason: 'No test script',
      }
    }

    // Install dependencies with pnpm.
    writeProgress('📚')
    await runCommand('pnpm', ['install'], { cwd: installedPath })

    // Mark installation as complete.
    const installMarkerPath = path.join(
      packageTempDir,
      '.socket-install-complete',
    )
    await fs.writeFile(
      installMarkerPath,
      JSON.stringify(
        {
          installedAt: new Date().toISOString(),
          versionSpec,
          socketPackage: socketPkgName,
          originalPackage: origPkgName,
        },
        null,
        2,
      ),
    )

    writeProgress(LOG_SYMBOLS.success)
    completePackage()
    return {
      package: origPkgName,
      socketPackage: socketPkgName,
      installed: true,
      tempDir: packageTempDir,
    }
  } catch (error) {
    writeProgress(LOG_SYMBOLS.fail)
    completePackage()
    return {
      package: origPkgName,
      socketPackage: socketPkgName,
      installed: false,
      reason: error.message,
    }
  }
}

async function main() {
  suppressMaxListenersWarning()

  // Read download results.
  const downloadResultsFile = path.join(tempBaseDir, 'download-results.json')

  if (!existsSync(downloadResultsFile)) {
    logger.fail('Download results not found. Please run download phase first.')
    process.exitCode = 1
    return
  }

  let downloadResults = []
  try {
    const resultsData = await fs.readFile(downloadResultsFile, 'utf8')
    downloadResults = JSON.parse(resultsData)
  } catch (error) {
    logger.fail(`Could not read download results: ${error.message}`)
    process.exitCode = 1
    return
  }

  // Filter to packages that were successfully downloaded.
  const packagesToInstall = downloadResults.filter(r => r.downloaded)

  // Filter by specific packages if requested.
  const filteredPackages = cliArgs.package?.length
    ? packagesToInstall.filter(
        pkg =>
          cliArgs.package.includes(pkg.package) ||
          cliArgs.package.includes(pkg.socketPackage),
      )
    : packagesToInstall

  if (filteredPackages.length === 0) {
    logger.warn('No packages to install')
    process.exitCode = 0
    return
  }

  // Initialize progress tracking.
  totalPackagesCount = filteredPackages.length
  completedPackages = 0
  cachedCount = 0
  installedCount = 0
  failedCount = 0

  // Start spinner.
  spinner.start(
    `Installing ${filteredPackages.length} ${pluralize('package', filteredPackages.length)}`,
  )

  // Update spinner text periodically.
  const progressInterval = setInterval(() => {
    spinner.text = `Installing ${pluralize('package', filteredPackages.length)}\nProgress (${completedPackages}/${totalPackagesCount})`
  }, 100)

  // Ensure base temp directory exists.
  await fs.mkdir(tempBaseDir, { recursive: true })

  const results = []

  await pEach(
    filteredPackages,
    async packageInfo => {
      const result = await installPackage(packageInfo)
      results.push(result)
    },
    { concurrency },
  )

  clearInterval(progressInterval)
  spinner.stop()

  // Show progress summary.
  if (cachedCount > 0) {
    logger.log(`♻️  Used cache: ${cachedCount}`)
  }
  if (installedCount > 0) {
    logger.log(`📦 Installed: ${installedCount}`)
  }
  if (failedCount > 0) {
    logger.fail(`Failed: ${failedCount}`)
  }

  // Categorize failures.
  const noTestScript = results.filter(
    r => !r.installed && r.reason === 'No test script',
  )
  const criticalFailures = results.filter(
    r =>
      !r.installed && r.reason !== 'Skipped' && r.reason !== 'No test script',
  )

  // Write results to file for the test runner.
  const resultsFile = path.join(tempBaseDir, 'install-results.json')
  await fs.writeFile(resultsFile, JSON.stringify(results, null, 2))

  // Summary output only if issues.
  if (noTestScript.length > 0 || criticalFailures.length > 0) {
    logger.log('')
    if (noTestScript.length > 0) {
      logger.warn(`No test script: ${noTestScript.length} packages`)
      if (noTestScript.length <= 5) {
        logger.group()
        for (const pkg of noTestScript) {
          logger.log(`- ${pkg.package}`)
        }
        logger.groupEnd()
      }
    }
    if (criticalFailures.length > 0) {
      logger.fail(`Failed: ${criticalFailures.length} packages`)
      logger.group()
      for (const pkg of criticalFailures) {
        logger.log(`- ${pkg.package}: ${pkg.reason}`)
      }
      logger.groupEnd()
    }
  }

  // Only fail on critical errors, not on packages without test scripts.
  process.exitCode = criticalFailures.length ? 1 : 0
}

main().catch(console.error)
