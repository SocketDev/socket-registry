import { createRequire } from 'node:module'
import { existsSync, promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import util from 'node:util'

import { cleanTestScript, testRunners } from './utils/test-utils.mjs'
import ENV from '@socketsecurity/registry/lib/constants/env'
import WIN32 from '@socketsecurity/registry/lib/constants/win32'
import { readPackageJson } from '@socketsecurity/registry/lib/packages'
import { pEach } from '@socketsecurity/registry/lib/promises'
import { LOG_SYMBOLS, logger } from '@socketsecurity/registry/lib/logger'
import { spawn } from '@socketsecurity/registry/lib/spawn'

const require = createRequire(import.meta.url)
const { copy } = require('fs-extra')

const { values: cliArgs } = util.parseArgs({
  options: {
    package: {
      type: 'string',
      multiple: true,
    },
    concurrency: {
      type: 'string',
      // Reduce concurrency in CI to avoid memory issues, especially on Windows.
      default: ENV.CI ? (WIN32 ? '3' : '5') : '10',
    },
    'temp-dir': {
      type: 'string',
      default: path.join(os.tmpdir(), 'npm-package-tests'),
    },
  },
})

const concurrency = Math.max(1, parseInt(cliArgs.concurrency, 10))
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

async function installPackage(packageInfo) {
  const {
    overridePath,
    package: origPkgName,
    socketPackage: socketPkgName,
    versionSpec,
  } = packageInfo

  // Create temp directory for this package.
  const packageTempDir = path.join(tempBaseDir, socketPkgName)
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

    process.stdout.write('📦')

    // Install the package.
    const packageSpec = versionSpec.startsWith('https://')
      ? versionSpec
      : `${origPkgName}@${versionSpec}`

    await runCommand('pnpm', ['add', packageSpec], {
      cwd: packageTempDir,
    })

    // Copy Socket override files on top.
    const installedPath = path.join(packageTempDir, 'node_modules', origPkgName)
    process.stdout.write('🔧')

    // Save original scripts before copying.
    const originalPkgJson = await readPackageJson(installedPath, {
      normalize: true,
    })
    const originalScripts = originalPkgJson.scripts

    await copy(overridePath, installedPath, {
      overwrite: true,
      dereference: true,
      filter: src =>
        !src.includes('node_modules') && !src.endsWith('.DS_Store'),
    })

    // Merge back the test scripts and devDependencies if they existed.
    const pkgJsonPath = path.join(installedPath, 'package.json')
    const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'))

    // Preserve devDependencies from original.
    if (originalPkgJson.devDependencies) {
      pkgJson.devDependencies = originalPkgJson.devDependencies
    }

    // Preserve test scripts.
    if (originalScripts) {
      pkgJson.scripts = pkgJson.scripts || {}

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
        pkgJson.scripts.test = cleanTestScript(
          originalScripts[actualTestScript],
        )
        // Also preserve the actual script if it's referenced.
        if (actualTestScript !== 'test') {
          pkgJson.scripts[actualTestScript] = cleanTestScript(
            originalScripts[actualTestScript],
          )
        }
      } else if (originalScripts.test) {
        // Fallback to simple test script if it exists.
        pkgJson.scripts.test = cleanTestScript(originalScripts.test)
      }

      // Preserve any test:* and tests-* scripts that might be referenced.
      for (const [key, value] of Object.entries(originalScripts)) {
        if (
          (key.startsWith('test:') || key.startsWith('tests')) &&
          !pkgJson.scripts[key]
        ) {
          pkgJson.scripts[key] = cleanTestScript(value)
        }
      }
    }

    await fs.writeFile(pkgJsonPath, JSON.stringify(pkgJson, null, 2))

    // Check for test script.
    const testScript = pkgJson.scripts?.test

    if (!testScript) {
      process.stdout.write(LOG_SYMBOLS.warn)
      return {
        package: origPkgName,
        socketPackage: socketPkgName,
        installed: false,
        reason: 'No test script',
      }
    }

    // Install dependencies with pnpm.
    process.stdout.write('📚')
    await runCommand('pnpm', ['install'], { cwd: installedPath })

    process.stdout.write(LOG_SYMBOLS.success)
    return {
      package: origPkgName,
      socketPackage: socketPkgName,
      installed: true,
      tempDir: packageTempDir,
    }
  } catch (error) {
    process.stdout.write(LOG_SYMBOLS.fail)
    return {
      package: origPkgName,
      socketPackage: socketPkgName,
      installed: false,
      reason: error.message,
    }
  }
}

void (async () => {
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

  logger.log(
    `Installing ${filteredPackages.length} packages with concurrency ${concurrency}...`,
  )
  logger.log(`Temp directory: ${tempBaseDir}`)
  logger.log(
    `Progress: 📦 = downloading, 🔧 = overriding, 📚 = dependencies, ${LOG_SYMBOLS.success} = success, ${LOG_SYMBOLS.fail} = failed, ${LOG_SYMBOLS.warn} = no test\n`,
  )

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

  // Add newline after progress indicators.
  process.stdout.write('\n')

  const failed = results.filter(r => !r.installed && r.reason !== 'Skipped')

  // Write results to file for the test runner.
  const resultsFile = path.join(tempBaseDir, 'install-results.json')
  await fs.writeFile(resultsFile, JSON.stringify(results, null, 2))

  // Set exit code for process termination.
  process.exitCode = failed.length ? 1 : 0
})()
