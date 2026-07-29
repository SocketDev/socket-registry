/**
 * @file Check that Socket packages have trusted package setup correctly. Checks
 *
 * @socketregistry/_, @socketoverride/_, and @socketsecurity/registry-stable
 *   packages by default. Use --all flag to check all Socket packages across all
 *   scopes.
 *
 *   Three legs run per package: maintainers, repository, and npm provenance
 *   come off `npm view`; staged publishing comes off the FULL packument via
 *   `./check-trusted-packages-staged.mts`, because `_npmUser.approver` — the
 *   only registry-observable evidence of the staged approval flow — is absent
 *   from both `npm view` output and the abbreviated packument.
 */

import os from 'node:os'
import process from 'node:process'

import { parseArgs } from '@socketsecurity/lib-stable/argv/parse'
import { COLUMN_LIMIT } from '@socketsecurity/lib-stable/constants/sentinels'
import { errorMessage } from '@socketsecurity/lib-stable/errors/message'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'

import {
  describeStagedTrust,
  formatStagedTrustProblem,
  isStagedTrustFailure,
  loadStagedRoster,
  readStagedTrust,
} from './check-trusted-packages-staged.mts'

import type { StagedRosterEntry } from './check-trusted-packages-staged.mts'

const logger = getDefaultLogger()

// The scopes this repo itself publishes, and the only ones the manifest roster
// contributes to the run.
const PUBLISHED_SCOPES = ['@socketoverride/', '@socketregistry/']

// Registry reads run from a scratch cwd so npm never applies this repo's
// devEngines pnpm pin to a command that only talks to the registry.
const NPM_VIEW_CWD = os.tmpdir()

const allowedMaintainers = new Set([
  'feross <feross@feross.org>',
  'socket-bot <eng@socket.dev>',
])

const coreSocketPackages = [
  '@socketsecurity/cli',
  '@socketsecurity/registry-stable',
  '@socketsecurity/sdk-stable',
  'sfw',
  'socket',
]

const otherSocketPackages = [
  '@socketsecurity/cli-with-sentry',
  '@socketsecurity/config',
  '@socketsecurity/eslint-config',
  '@socketsecurity/mcp',
  'socket-mcp',
  'socket-mpc',
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

if (args['help']) {
  logger.log('')
  logger.log('Usage: node check-trusted-packages.mjs [options]')
  logger.log('')
  logger.log('Options:')
  logger.log(
    '  --all     Check all Socket packages (@socketsecurity/*, @socketregistry/*, @socketoverride/*)',
  )
  logger.log(
    '  --debug   Show detailed information for all packages (not just failures)',
  )
  logger.log('  --help    Show this help message')
  logger.log('')
  logger.log('By default, checks:')
  logger.log('  - All @socketregistry/* packages')
  logger.log('  - All @socketoverride/* packages')
  logger.log('  - Core Socket packages (sfw, socket, etc.)')
  logger.log('')
  logger.log('Each package is checked for:')
  logger.log('  - Expected maintainers and a SocketDev repository')
  logger.log('  - npm provenance (trusted publishing)')
  logger.log(
    '  - Staged publishing on the version dist-tag latest points at; a package',
  )
  logger.log(
    '    whose manifest version is not published yet is reported, never failed',
  )
  logger.log('')
  logger.log('With --all flag, adds:')
  logger.log(
    '  - Additional Socket packages (@socketsecurity/config, @socketsecurity/mcp, etc.)',
  )
  logger.log('')
  process.exitCode = 0
}

interface PackageMaintainer {
  name?: string | undefined
  email?: string | undefined
}

interface PackageInfo {
  name: string
  version: string
  maintainers?: Array<PackageMaintainer | string> | undefined
  repository?: { url?: string | undefined } | undefined
  dist?: { attestations?: unknown | undefined } | undefined
}

interface CheckState {
  linePosition: number
}

/**
 * Read a published package's maintainer / repository / provenance metadata.
 *
 * `npm view` runs from a scratch cwd, NOT the repo. This repo's package.json
 * declares `devEngines.packageManager: pnpm`, and npm refuses to run any
 * command inside it with EBADDEVENGINES — including a pure registry read that
 * has nothing to do with the local project.
 *
 * A multi-field `npm view --json` answers with a single-element ARRAY, not a
 * bare object, so the result is unwrapped before use.
 *
 * A failed read THROWS. The caller only reaches this for a package the
 * packument proved is published, so "npm view produced nothing" is a broken
 * read, never an absent package — reporting it as "not found" would be a
 * misattributed pass/fail on a gate whose whole job is trust.
 *
 * @throws {Error} When the registry read fails or answers with an unusable
 *   body.
 */
async function getPackageInfo(packageName: string): Promise<PackageInfo> {
  let output: string
  try {
    output = await runCommand('npm', [
      'view',
      packageName,
      '--json',
      'name',
      'version',
      'maintainers',
      'repository',
      'dist',
    ])
  } catch (e) {
    throw new Error(
      [
        `What: the registry metadata read for ${packageName} failed, so its trust setup could not be checked.`,
        `Where: npm view ${packageName} (cwd ${NPM_VIEW_CWD})`,
        `Saw: ${errorMessage(e)}`,
        'Wanted: a JSON record carrying name, version, maintainers, repository, and dist.',
        'Fix: re-run once the registry is reachable. A read that cannot complete is never reported as a package problem.',
      ].join('\n'),
    )
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(output)
  } catch (e) {
    throw new Error(
      [
        `What: the registry metadata for ${packageName} was not JSON, so its trust setup could not be checked.`,
        `Where: npm view ${packageName} (cwd ${NPM_VIEW_CWD})`,
        `Saw: ${errorMessage(e)}`,
        'Wanted: a JSON record, or a single-element array wrapping one.',
        'Fix: re-run; if it persists, check the npm CLI version for an output-format change.',
      ].join('\n'),
    )
  }
  // A multi-field `npm view --json` wraps its record in an array.
  return (Array.isArray(parsed) ? parsed[0] : parsed) as PackageInfo
}

// The staged-publishing roster keyed by package name — the manifest is the
// authoritative list of what this repo publishes, and it carries the version of
// record, so an in-flight bump is distinguishable from a package that has never
// been published. Populated once in main().
const stagedRosterByName = new Map<string, StagedRosterEntry>()

async function getPackagesFromScope(scope: string): Promise<string[]> {
  try {
    const output = await runCommand('npm', [
      'search',
      '--json',
      `scope:${scope}`,
      '--searchlimit=1000',
    ])
    const results = JSON.parse(output) as Array<{ name: string }>
    return results.map(pkg => pkg.name)
  } catch (e) {
    logger.error(
      `Failed to search for ${scope} packages:`,
      (e as Error).message,
    )
    return []
  }
}

async function runCommand(
  command: string,
  commandArgs: string[] = [],
): Promise<string> {
  try {
    const result = await spawn(command, commandArgs, {
      cwd: NPM_VIEW_CWD,
      shell: process.platform === 'win32',
      stdio: 'pipe',
    })
    if (result.code !== 0) {
      throw new Error(
        `Command failed with exit code ${result.code}: ${result.stderr}`,
      )
    }
    return result.stdout
  } catch (e) {
    throw new Error(`Command failed: ${errorMessage(e)}`)
  }
}

export async function checkTrustedPackage(
  packageName: string,
  state: CheckState,
): Promise<boolean> {
  // The staged leg reads the FULL packument and runs first, because it is the
  // leg that can legitimately answer "this package isn't published yet" — a
  // state the `npm view` legs below can only report as a flat failure. A
  // registry read that fails for any reason other than a 404 throws out of
  // here on purpose: the caller records the package as failed, so the run can
  // never report a package trustworthy because its fetch died.
  const stagedReport = await readStagedTrust(
    stagedRosterByName.get(packageName) ?? {
      manifestVersion: undefined,
      name: packageName,
    },
  )

  // An unpublished roster entry is a pending first publish or an in-flight
  // bump, not a trust regression — nothing is on the registry to gate, and the
  // `npm view` legs below have no record to read.
  if (stagedReport.verdict === 'unpublished') {
    if (args['debug']) {
      logger.info(describeStagedTrust(stagedReport))
    }
    return true
  }

  const info = await getPackageInfo(packageName)

  const issues: string[] = []
  const successes: string[] = []

  if (isStagedTrustFailure(stagedReport)) {
    issues.push(formatStagedTrustProblem(stagedReport))
  } else {
    successes.push(describeStagedTrust(stagedReport))
  }

  // Check if maintainers include expected Socket accounts
  const maintainers = info.maintainers || []
  const maintainerStrings = maintainers.map((m: PackageMaintainer | string) => {
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
  if (dist?.attestations) {
    successes.push('Trusted-published with npm provenance')
  } else {
    issues.push('Not trusted-published (missing provenance)')
  }

  // Display results
  if (issues.length > 0) {
    // Add newline if we were writing dots
    if (!args['debug'] && state.linePosition > 0) {
      process.stdout.write('\n')
      state.linePosition = 0
    }
    logger.warn(`${packageName}:`)
    logger.indent()
    for (let i = 0, { length } = successes; i < length; i += 1) {
      const success = successes[i]
      logger.success(success)
    }
    for (let i = 0, { length } = issues; i < length; i += 1) {
      const issue = issues[i]
      logger.fail(issue)
    }
    if (info.version) {
      logger.info(`Latest version: ${info.version}`)
    }
    logger.dedent()
    logger.log('')
    logger.log('')
    return false
  }

  // Success - show minimal output unless debug mode
  if (args['debug']) {
    for (let i = 0, { length } = successes; i < length; i += 1) {
      const success = successes[i]
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

async function main(): Promise<void> {
  const packagesToCheck = new Set<string>()

  // Always include packages from manifest (@socketregistry/*, @socketoverride/*).
  const roster = await loadStagedRoster({ scopes: PUBLISHED_SCOPES })
  for (let i = 0, { length } = roster; i < length; i += 1) {
    const entry = roster[i]
    if (entry) {
      stagedRosterByName.set(entry.name, entry)
      packagesToCheck.add(entry.name)
    }
  }

  // Supplement with @socketregistry/* and @socketoverride/* packages from npm.
  const socketRegistryPackages = await getPackagesFromScope('socketregistry')
  for (let i = 0, { length } = socketRegistryPackages; i < length; i += 1) {
    const pkg = socketRegistryPackages[i]
    if (pkg) {
      packagesToCheck.add(pkg)
    }
  }

  const socketOverridePackages = await getPackagesFromScope('socketoverride')
  for (let i = 0, { length } = socketOverridePackages; i < length; i += 1) {
    const pkg = socketOverridePackages[i]
    if (pkg) {
      packagesToCheck.add(pkg)
    }
  }

  // Always check core Socket packages.
  for (let i = 0, { length } = coreSocketPackages; i < length; i += 1) {
    const pkg = coreSocketPackages[i]
    if (pkg) {
      packagesToCheck.add(pkg)
    }
  }

  if (args['all']) {
    // Add hardcoded other Socket packages.
    for (let i = 0, { length } = otherSocketPackages; i < length; i += 1) {
      const pkg = otherSocketPackages[i]
      if (pkg) {
        packagesToCheck.add(pkg)
      }
    }

    // Supplement with any additional @socketsecurity/* packages from npm.
    const socketSecurityPackages = await getPackagesFromScope('socketsecurity')
    for (let i = 0, { length } = socketSecurityPackages; i < length; i += 1) {
      const pkg = socketSecurityPackages[i]
      if (pkg) {
        packagesToCheck.add(pkg)
      }
    }
  }

  logger.write(`🔍 Checking ${packagesToCheck.size} Socket packages`)

  const results: { success: string[]; failed: string[] } = {
    success: [],
    failed: [],
  }

  // Track position for line wrapping - pass as state object
  const state = { linePosition: 0 }

  // Sort packages for consistent output
  const sortedPackages = Array.from(packagesToCheck).toSorted()

  for (let i = 0, { length } = sortedPackages; i < length; i += 1) {
    const packageName = sortedPackages[i]
    if (!packageName) {
      continue
    }
    try {
      if (args['debug']) {
        logger.group(packageName)
      }

      const success = await checkTrustedPackage(packageName, state)
      if (args['debug']) {
        logger.groupEnd()
        // Empty line between packages in debug mode
        logger.log('')
      }
      if (success) {
        results.success.push(packageName)
      } else {
        results.failed.push(packageName)
      }
    } catch (e) {
      if (args['debug']) {
        logger.groupEnd()
      }
      logger.error(`Error checking ${packageName}:`, (e as Error).message)
      results.failed.push(packageName)
    }
  }

  // Add newline if we were writing dots and didn't wrap to a new line.
  if (!args['debug'] && state.linePosition > 0) {
    process.stdout.write('\n')
  }

  // Summary
  logger.log('')
  logger.log('')
  logger.log('📊 Summary:')
  logger.success(`${results.success.length} packages verified`)

  if (results.failed.length > 0) {
    logger.fail(`${results.failed.length} packages need attention`)
    process.exitCode = 1
    return
  }

  logger.log('')
  logger.log('✨ All packages have correct trusted setup!')
}

main().catch(error => {
  logger.error('Fatal error:', error)
  process.exitCode = 1
})
