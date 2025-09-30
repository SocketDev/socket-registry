/**
 * @fileoverview Check that Socket packages have trusted package setup correctly.
 * Checks @socketregistry/*, @socketoverride/*, and @socketsecurity/registry packages by default.
 * Use --all flag to check all Socket packages across all scopes.
 */

import { readFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { parseArgs } from '../registry/dist/lib/parse-args.js'

import COLUMN_LIMIT from '../registry/dist/lib/constants/COLUMN_LIMIT.js'
import { logger } from '../registry/dist/lib/logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const allowedMaintainers = new Set([
  'socket-bot <eng@socket.dev>',
  'feross <feross@feross.org>',
])

const coreSocketPackages = [
  '@socketsecurity/cli',
  '@socketsecurity/registry',
  '@socketsecurity/sdk',
  'socket-cli',
]

const otherSocketPackages = [
  '@socketsecurity/cli-with-sentry',
  '@socketsecurity/config',
  '@socketsecurity/eslint-config',
  '@socketsecurity/mcp',
  'socket-mcp',
  'socket-mpc',
  'sfw',
]

const { values: args } = parseArgs({
  options: {
    all: {
      type: 'boolean',
      default: false,
    },
    debug: {
      type: 'boolean',
      default: false,
    },
    help: {
      type: 'boolean',
      default: false,
    },
  },
  strict: false,
})

if (args.help) {
  console.log(`
Usage: node check-trusted-packages.mjs [options]

Options:
  --all     Check all Socket packages (@socketsecurity/*, @socketregistry/*, @socketoverride/*)
  --debug   Show detailed information for all packages (not just failures)
  --help    Show this help message

By default, checks:
  - All @socketregistry/* packages
  - All @socketoverride/* packages
  - Core Socket packages (cli, registry, sdk, socket-cli, sfw)

With --all flag, adds:
  - Additional Socket packages (cli-with-sentry, config, eslint-config, mcp, socket-mcp, socket-mpc)
`)
  // eslint-disable-next-line n/no-process-exit
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
    // Get the latest version specifically to ensure we get detailed info
    const output = await runCommand('npm', [
      'view',
      packageName,
      '--json',
      'name',
      'version',
      'maintainers',
      'repository',
      'dist',
    ])
    return JSON.parse(output)
  } catch {
    return null
  }
}

async function checkTrustedPackage(packageName, state) {
  const info = await getPackageInfo(packageName)

  if (!info) {
    logger.fail('Package not found on npm')
    return false
  }

  const issues = []
  const successes = []

  // Check if maintainers include expected Socket accounts
  const maintainers = info.maintainers || []
  const maintainerStrings = maintainers.map(m => {
    if (typeof m === 'string') {
      return m
    }
    return m.name && m.email ? `${m.name} <${m.email}>` : String(m)
  })

  const hasAllowedMaintainers =
    maintainerStrings.length > 0 &&
    maintainerStrings.every(m => allowedMaintainers.has(m))

  if (!hasAllowedMaintainers) {
    issues.push(`Unexpected maintainers: ${maintainerStrings.join(', ')}`)
  } else {
    successes.push(`Maintainers: ${maintainerStrings.join(', ')}`)
  }

  // Check repository field
  const repository = info.repository
  if (!repository || !repository.url) {
    issues.push('No repository URL configured')
  } else if (!repository.url.includes('SocketDev')) {
    issues.push(`Repository not under SocketDev org: ${repository.url}`)
  } else {
    successes.push(`Repository: ${repository.url}`)
  }

  // Check for npm provenance (trusted publishing)
  const dist = info.dist
  if (dist && dist.attestations) {
    successes.push('Trusted-published with npm provenance')
  } else {
    issues.push('Not trusted-published (missing provenance)')
  }

  // Display results
  if (issues.length > 0) {
    // Add newline if we were writing dots
    if (!args.debug && state.linePosition > 0) {
      process.stdout.write('\n')
      state.linePosition = 0
    }
    logger.warn(`${packageName}:`)
    logger.indent()
    for (const success of successes) {
      logger.success(success)
    }
    for (const issue of issues) {
      logger.fail(issue)
    }
    if (info.version) {
      logger.info(`Latest version: ${info.version}`)
    }
    logger.dedent()
    console.log('\n')
    return false
  }

  // Success - show minimal output unless debug mode
  if (args.debug) {
    for (const success of successes) {
      logger.success(success)
    }
    logger.info(`Latest version: ${info.version}`)
  } else {
    // Write a dot for minimal output with line wrapping
    process.stdout.write('.')
    state.linePosition += 1
    if (state.linePosition >= COLUMN_LIMIT) {
      process.stdout.write('\n')
      state.linePosition = 0
    }
  }

  return true
}

async function getPackagesFromManifest() {
  try {
    const manifestPath = path.join(__dirname, '..', 'registry', 'manifest.json')
    const content = await readFile(manifestPath, 'utf8')
    const manifest = JSON.parse(content)
    const packages = new Set()

    if (manifest.npm && Array.isArray(manifest.npm)) {
      for (const entry of manifest.npm) {
        const [, data] = entry
        if (data && data.name) {
          // Only include @socketregistry/* and @socketoverride/* packages
          if (
            data.name.startsWith('@socketregistry/') ||
            data.name.startsWith('@socketoverride/')
          ) {
            packages.add(data.name)
          }
        }
      }
    }

    return Array.from(packages).sort()
  } catch (error) {
    logger.error('Failed to read manifest.json:', error.message)
    return []
  }
}

async function getPackagesFromScope(scope) {
  try {
    const output = await runCommand('npm', [
      'search',
      '--json',
      `scope:${scope}`,
      '--searchlimit=1000',
    ])
    const results = JSON.parse(output)
    return results.map(pkg => pkg.name)
  } catch (error) {
    logger.error(`Failed to search for ${scope} packages:`, error.message)
    return []
  }
}

async function main() {
  const packagesToCheck = new Set()

  // Always include packages from manifest (@socketregistry/*, @socketoverride/*).
  const manifestPackages = await getPackagesFromManifest()
  manifestPackages.forEach(pkg => packagesToCheck.add(pkg))

  // Supplement with @socketregistry/* and @socketoverride/* packages from npm.
  const socketRegistryPackages = await getPackagesFromScope('socketregistry')
  socketRegistryPackages.forEach(pkg => packagesToCheck.add(pkg))

  const socketOverridePackages = await getPackagesFromScope('socketoverride')
  socketOverridePackages.forEach(pkg => packagesToCheck.add(pkg))

  // Always check core Socket packages.
  coreSocketPackages.forEach(pkg => packagesToCheck.add(pkg))

  if (args.all) {
    // Add hardcoded other Socket packages.
    otherSocketPackages.forEach(pkg => packagesToCheck.add(pkg))

    // Supplement with any additional @socketsecurity/* packages from npm.
    const socketSecurityPackages = await getPackagesFromScope('socketsecurity')
    socketSecurityPackages.forEach(pkg => packagesToCheck.add(pkg))
  }

  logger.write(`🔍 Checking ${packagesToCheck.size} Socket packages`)

  const results = {
    success: [],
    failed: [],
  }

  // Track position for line wrapping - pass as state object
  const state = { linePosition: 0 }

  // Sort packages for consistent output
  const sortedPackages = Array.from(packagesToCheck).sort()

  for (const packageName of sortedPackages) {
    try {
      if (args.debug) {
        logger.group(packageName)
      }
      // eslint-disable-next-line no-await-in-loop
      const success = await checkTrustedPackage(packageName, state)
      if (args.debug) {
        logger.groupEnd()
        // Empty line between packages in debug mode
        console.log()
      }
      if (success) {
        results.success.push(packageName)
      } else {
        results.failed.push(packageName)
      }
    } catch (error) {
      if (args.debug) {
        logger.groupEnd()
      }
      logger.error(`Error checking ${packageName}:`, error.message)
      results.failed.push(packageName)
    }
  }

  // Add newline if we were writing dots and didn't wrap to a new line.
  if (!args.debug && state.linePosition > 0) {
    process.stdout.write('\n')
  }

  // Summary
  console.log('\n')
  logger.log('📊 Summary:')
  logger.success(`${results.success.length} packages verified`)

  if (results.failed.length > 0) {
    logger.fail(`${results.failed.length} packages need attention`)
    // eslint-disable-next-line n/no-process-exit
    process.exit(1)
  }

  logger.log('\n✨ All packages have correct trusted setup!')
}

main().catch(error => {
  logger.error('Fatal error:', error)
  // eslint-disable-next-line n/no-process-exit
  process.exit(1)
})
