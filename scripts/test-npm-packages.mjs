'use strict'

import { createRequire } from 'node:module'
import { existsSync, promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import util from 'node:util'

import constants from './constants.mjs'
import { cleanTestScript, testRunners } from './lib/test-utils.mjs'
import { safeRemove } from './lib/safe-remove.mjs'

const require = createRequire(import.meta.url)
const { copy } = require('fs-extra')
const { readPackageJson } = require('@socketsecurity/registry/lib/packages')
const {
  resolveOriginalPackageName,
} = require('@socketsecurity/registry/lib/packages')
const { pEach } = require('@socketsecurity/registry/lib/promises')
const { logger } = require('@socketsecurity/registry/lib/logger')

const { values: cliArgs } = util.parseArgs({
  options: {
    package: {
      type: 'string',
      multiple: true,
    },
    concurrency: {
      type: 'string',
      // Reduce concurrency in CI to avoid memory issues.
      default: process.env.CI ? '1' : '3',
    },
    force: {
      type: 'boolean',
      default: false,
    },
  },
})

const concurrency = Math.max(1, parseInt(cliArgs.concurrency, 10) || 3)

async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'pipe',
      shell: process.platform.startsWith('win'),
      ...options,
    })

    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', data => {
      stdout += data
    })

    child.stderr?.on('data', data => {
      stderr += data
    })

    child.on('close', code => {
      if (code === 0) {
        resolve({ stdout, stderr })
      } else {
        const error = new Error(`Command failed: ${command} ${args.join(' ')}`)
        error.code = code
        error.stdout = stdout
        error.stderr = stderr
        reject(error)
      }
    })

    child.on('error', reject)
  })
}

async function testPackage(socketPkgName) {
  const origPkgName = resolveOriginalPackageName(socketPkgName)

  // Check if this package should be skipped.
  const skipTestsMap = constants.skipTestsByEcosystem
  const skipSet = skipTestsMap.get('npm')
  if (skipSet && (skipSet.has(socketPkgName) || skipSet.has(origPkgName))) {
    logger.warn(`${origPkgName}: Skipped (known issues)`)
    return { package: origPkgName, passed: false, reason: 'Skipped' }
  }

  const overridePath = path.join(constants.npmPackagesPath, socketPkgName)

  if (!existsSync(overridePath)) {
    logger.fail(`${origPkgName}: No Socket override found`)
    return { package: origPkgName, passed: false, reason: 'No override' }
  }

  // Create temp directory.
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), `test-${socketPkgName}-`),
  )

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
        passed: false,
        reason: 'Not in devDependencies',
      }
    }

    // Create minimal package.json in temp directory.
    await fs.writeFile(
      path.join(tempDir, 'package.json'),
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

    logger.log(`📦 ${origPkgName}: Installing ${versionSpec}...`)

    // Install the package.
    const packageSpec = versionSpec.startsWith('https://')
      ? versionSpec
      : `${origPkgName}@${versionSpec}`

    await runCommand('npm', ['install', packageSpec, '--no-save'], {
      cwd: tempDir,
    })

    // Copy Socket override files on top.
    const installedPath = path.join(tempDir, 'node_modules', origPkgName)
    logger.log(`🔧 ${origPkgName}: Applying Socket overrides...`)

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
      logger.warn(`${origPkgName}: No test script`)
      return { package: origPkgName, passed: false, reason: 'No test script' }
    }

    // Install dependencies with pnpm.
    logger.log(`📚 ${origPkgName}: Installing dependencies...`)
    await runCommand('pnpm', ['install'], { cwd: installedPath })

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
    // Clean up temp directory.
    await safeRemove(tempDir)
  }
}

async function main() {
  const packages = cliArgs.package?.length
    ? cliArgs.package
    : constants.npmPackageNames

  logger.log(
    `Testing ${packages.length} packages with concurrency ${concurrency}...\n`,
  )

  const results = []

  await pEach(
    packages,
    async pkgName => {
      const result = await testPackage(pkgName)
      results.push(result)
    },
    { concurrency },
  )

  // Summary.
  logger.log('\n' + '='.repeat(60))
  logger.log('SUMMARY')
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

  // Set exit code for process termination.
  // With --force flag, always exit with 0 regardless of failures.
  process.exitCode = cliArgs.force ? 0 : failed.length ? 1 : 0
}

main().catch(error => {
  logger.error('Fatal error:', error)
  process.exitCode = 1
})
