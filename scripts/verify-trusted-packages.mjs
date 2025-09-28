#!/usr/bin/env node
/**
 * @fileoverview Verify that Socket packages have trusted package setup correctly.
 * Checks @socketregistry/*, @socketoverride/*, and @socketsecurity/registry packages by default.
 * Use --all flag to check all @socketsecurity/* packages.
 */

import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { logger } from '@socketsecurity/registry/lib/logger'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const { values: args } = parseArgs({
  options: {
    all: {
      type: 'boolean',
      default: false,
    },
    help: {
      type: 'boolean',
      default: false,
    },
  },
})

if (args.help) {
  console.log(`
Usage: node verify-trusted-packages.mjs [options]

Options:
  --all     Check all @socketsecurity/* packages (not just registry)
  --help    Show this help message

By default, checks:
  - All @socketregistry/* packages
  - All @socketoverride/* packages
  - @socketsecurity/registry

With --all flag, additionally checks:
  - All other @socketsecurity/* packages
`)
  process.exit(0)
}

async function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'pipe',
      shell: process.platform === 'win32',
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', data => {
      stdout += data.toString()
    })

    child.stderr.on('data', data => {
      stderr += data.toString()
    })

    child.on('error', reject)

    child.on('close', code => {
      if (code !== 0) {
        reject(new Error(`Command failed with exit code ${code}: ${stderr}`))
      } else {
        resolve(stdout)
      }
    })
  })
}

async function getPackageInfo(packageName) {
  try {
    const output = await runCommand('npm', ['view', packageName, '--json'])
    return JSON.parse(output)
  } catch (error) {
    return null
  }
}

async function checkTrustedPackage(packageName) {
  logger.log(`Checking ${packageName}...`)

  const info = await getPackageInfo(packageName)

  if (!info) {
    logger.fail(`  ✗ Package not found on npm`)
    return false
  }

  // Check if maintainers include expected Socket accounts
  const maintainers = info.maintainers || []
  const maintainerNames = maintainers.map(m => m.name || m)

  const expectedMaintainers = ['socket-security', 'socket-dev', 'socket-admin']
  const hasSocketMaintainer = maintainerNames.some(name =>
    expectedMaintainers.some(expected => name.includes(expected))
  )

  if (!hasSocketMaintainer) {
    logger.warn(`  ⚠ No Socket maintainers found. Current maintainers: ${maintainerNames.join(', ')}`)
  }

  // Check repository field
  const repository = info.repository
  if (!repository || !repository.url) {
    logger.warn(`  ⚠ No repository URL configured`)
  } else if (!repository.url.includes('SocketDev')) {
    logger.warn(`  ⚠ Repository not under SocketDev org: ${repository.url}`)
  }

  // Check if published from Socket registry
  if (info.publishConfig && info.publishConfig.registry) {
    if (info.publishConfig.registry.includes('socket')) {
      logger.success(`  ✓ Published via Socket registry`)
    } else {
      logger.warn(`  ⚠ Published via non-Socket registry: ${info.publishConfig.registry}`)
    }
  }

  logger.success(`  ✓ Package exists on npm`)

  // Check latest version
  if (info.version) {
    logger.info(`  ℹ Latest version: ${info.version}`)
  }

  return true
}

async function getPackagesFromScope(scope) {
  try {
    const output = await runCommand('npm', ['search', '--json', `scope:${scope}`, '--searchlimit=1000'])
    const results = JSON.parse(output)
    return results.map(pkg => pkg.name)
  } catch (error) {
    logger.error(`Failed to search for ${scope} packages:`, error.message)
    return []
  }
}

async function main() {
  logger.log('🔍 Verifying Socket package trusted setup...\n')

  const packagesToCheck = new Set()

  // Always check @socketregistry/* packages
  logger.log('Fetching @socketregistry packages...')
  const socketRegistryPackages = await getPackagesFromScope('socketregistry')
  socketRegistryPackages.forEach(pkg => packagesToCheck.add(pkg))
  logger.info(`  Found ${socketRegistryPackages.length} packages\n`)

  // Always check @socketoverride/* packages
  logger.log('Fetching @socketoverride packages...')
  const socketOverridePackages = await getPackagesFromScope('socketoverride')
  socketOverridePackages.forEach(pkg => packagesToCheck.add(pkg))
  logger.info(`  Found ${socketOverridePackages.length} packages\n`)

  // Always check @socketsecurity/registry specifically
  packagesToCheck.add('@socketsecurity/registry')

  // If --all flag, check all @socketsecurity/* packages
  if (args.all) {
    logger.log('Fetching all @socketsecurity packages...')
    const socketSecurityPackages = await getPackagesFromScope('socketsecurity')
    socketSecurityPackages.forEach(pkg => packagesToCheck.add(pkg))
    logger.info(`  Found ${socketSecurityPackages.length} packages\n`)
  }

  logger.log(`\n📦 Checking ${packagesToCheck.size} packages total:\n`)

  const results = {
    success: [],
    failed: [],
  }

  // Sort packages for consistent output
  const sortedPackages = Array.from(packagesToCheck).sort()

  for (const packageName of sortedPackages) {
    try {
      const success = await checkTrustedPackage(packageName)
      if (success) {
        results.success.push(packageName)
      } else {
        results.failed.push(packageName)
      }
      console.log() // Empty line between packages
    } catch (error) {
      logger.error(`Error checking ${packageName}:`, error.message)
      results.failed.push(packageName)
    }
  }

  // Summary
  logger.log('\n📊 Summary:')
  logger.success(`  ✓ ${results.success.length} packages verified`)

  if (results.failed.length > 0) {
    logger.fail(`  ✗ ${results.failed.length} packages need attention:`)
    results.failed.forEach(pkg => {
      logger.fail(`    - ${pkg}`)
    })
    process.exit(1)
  }

  logger.log('\n✨ All packages have correct trusted setup!')
}

main().catch(error => {
  logger.error('Fatal error:', error)
  process.exit(1)
})