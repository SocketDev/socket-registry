#!/usr/bin/env node
/**
 * @file Keep packages/npm/* overrides in lock-step with their upstreams.
 *   Detects overridden upstream packages that have published a newer version
 *   than the pin in test/npm/package.json and, with --apply, drives an AI
 *   agent to update the override implementation and its unit tests TOGETHER,
 *   per docs/agents.md/fleet/test-layout.md (tests cascade in lock-step with
 *   the code they cover) and docs/agents.md/fleet/code-is-law.md (tests are
 *   mandatory, both arms). The companion law
 *   scripts/repo/check/npm-overrides-are-current.mts fails `check --all`
 *   while drift is unsynced.
 *   Flow per stale override (--apply):
 *
 *   1. Bump the upstream pin in test/npm/package.json (exact version).
 *   2. pnpm install at the repo root (the fixture lives in the root workspace); a
 *      minimumReleaseAge soak rejection marks the package soak-blocked and
 *      restores the pin — pre-soak upstream releases are never forced.
 *   3. Spawn the AI agent (verify profile) to reconcile the override
 *      implementation and its unit tests with the installed upstream, and
 *      self-verify by running the package test.
 *   4. Re-run the package test deterministically; red stops the run loud. Usage:
 *      node scripts/npm/sync-npm-overrides.mts [--check] [--apply] [--package
 *      <name>]... [--model <alias>] [--effort <level>] [--quiet] Exit codes: 0
 *      in sync, 1 error / failed sync, 2 drift found (--check).
 */

import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
// oxlint-disable-next-line socket/prefer-stable-external-semver -- @socketsecurity/lib-stable has no ./external/semver export at the pinned version; semver is a devDependency (scripts/tests only, not bundled).
import semver from 'semver'

import { AI_PROFILE } from '@socketsecurity/lib-stable/ai/profiles'
import { spawnAiAgent } from '@socketsecurity/lib-stable/ai/spawn'
import { parseArgs } from '@socketsecurity/lib-stable/argv/parse'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { fetchPackageManifest } from '@socketsecurity/lib-stable/packages/manifest'
import { resolveOriginalPackageName } from '@socketsecurity/lib-stable/packages/normalize'
import { pEach } from '@socketsecurity/lib-stable/promises/iterate'

import { DEFAULT_CONCURRENCY } from '../constants/core.mts'
import { ROOT_PATH, TEST_NPM_PATH } from '../constants/paths.mts'
import { getNpmPackageNames } from '../constants/testing.mts'
import { runCommandQuietStrict } from '../fleet/util/run-command.mts'
import { getPackageVersionSpec } from '../repo/util/packages.mts'

import type { AiEffort } from '@socketsecurity/lib-stable/ai/types'

const logger = getDefaultLogger()

export type OverrideStatus =
  | 'current'
  | 'stale'
  | 'unpinned'
  | 'unpinnable-spec'
  | 'unresolved'

export interface OverridePin {
  socketPkgName: string
  upstreamName: string
  pinnedSpec: string | undefined
}

export interface OverrideDrift extends OverridePin {
  latestVersion: string | undefined
  status: OverrideStatus
}

/**
 * Exact, comparable version pin (1.2.3 / 1.2.3-rc.1) — not a range or URL.
 */
export function isExactSemver(spec: unknown): spec is string {
  return typeof spec === 'string' && semver.valid(spec) !== null
}

/**
 * Classify one override's pin against the upstream's latest published
 * version. Pure: fetching happens in the caller so this stays unit-testable
 * offline (lock-step tests never touch the network).
 */
export function classifyOverride(
  pin: OverridePin,
  latestVersion: string | undefined,
): OverrideDrift {
  let status: OverrideStatus
  if (pin.pinnedSpec === undefined) {
    status = 'unpinned'
  } else if (!isExactSemver(pin.pinnedSpec)) {
    // GitHub tarball URLs and ranges have no single upstream version to
    // track; surfaced for a human, never auto-synced.
    status = 'unpinnable-spec'
  } else if (!isExactSemver(latestVersion)) {
    status = 'unresolved'
  } else if (semver.gte(pin.pinnedSpec, latestVersion)) {
    status = 'current'
  } else {
    status = 'stale'
  }
  return { ...pin, latestVersion, status }
}

/**
 * The lock-step brief handed to the agent. Implementation and unit tests
 * must move in the same change — the mirror and thorough-tests laws fail CI
 * otherwise — so the prompt states that as the contract, not a suggestion.
 */
export function buildSyncPrompt(drift: {
  socketPkgName: string
  upstreamName: string
  fromVersion: string
  toVersion: string
}): string {
  const { fromVersion, socketPkgName, toVersion, upstreamName } = drift
  const testPath = `test/npm/${socketPkgName}.test.mts`
  return `You are updating the Socket registry override for the npm package "${upstreamName}" after an upstream release.

Upstream moved ${fromVersion} -> ${toVersion}. The new version is already pinned in test/npm/package.json and installed; read its source under node_modules/${upstreamName}/.

Override implementation: packages/npm/${socketPkgName}/
Unit tests: ${testPath} (create it if missing)

Lock-step contract (docs/agents.md/fleet/test-layout.md, docs/agents.md/fleet/code-is-law.md):
- The implementation and its unit tests move together in this one change. Never change override behavior without updating the matching test in the same pass.
- Tests must cover both arms of every behavior you touch — the new upstream behavior and its edge cases, adversarial inputs included.

Steps:
1. Diff the new upstream behavior against the override: exports, signatures, edge cases, error behavior.
2. Update the override so its public behavior matches upstream ${toVersion} exactly.
3. Update ${testPath} in the same change to pin the new behavior, both arms.
4. Self-verify until green: INCLUDE_NPM_TESTS=1 pnpm exec vitest run ${testPath}
5. Do not bump any package versions — release tooling owns versions.

Finish with a summary of the behavioral differences you found and every file you changed. If nothing in the override needs to change for ${toVersion}, say so explicitly after verifying the tests still pass.`
}

async function collectOverridePins(
  packageFilter: string[],
): Promise<OverridePin[]> {
  const names: string[] = getNpmPackageNames()
  const selected = packageFilter.length
    ? names.filter(
        n =>
          packageFilter.includes(n) ||
          packageFilter.includes(resolveOriginalPackageName(n)),
      )
    : names
  return selected.map(socketPkgName => {
    const upstreamName = resolveOriginalPackageName(socketPkgName)
    return {
      socketPkgName,
      upstreamName,
      pinnedSpec: getPackageVersionSpec(upstreamName),
    }
  })
}

async function fetchLatestVersions(
  pins: OverridePin[],
): Promise<Map<string, string | undefined>> {
  const latest = new Map<string, string | undefined>()
  await pEach(
    pins,
    async pin => {
      const manifest = (await fetchPackageManifest(
        `${pin.upstreamName}@latest`,
      )) as { version?: string | undefined } | null
      latest.set(pin.upstreamName, manifest?.version)
    },
    { concurrency: DEFAULT_CONCURRENCY },
  )
  return latest
}

export async function collectOverrideDrift(
  packageFilter: string[] = [],
): Promise<OverrideDrift[]> {
  const pins = await collectOverridePins(packageFilter)
  const latest = await fetchLatestVersions(pins)
  return pins.map(pin => classifyOverride(pin, latest.get(pin.upstreamName)))
}

async function writeUpstreamPin(
  upstreamName: string,
  version: string,
): Promise<void> {
  const pkgJsonPath = path.join(TEST_NPM_PATH, 'package.json')
  const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'))
  pkgJson.devDependencies[upstreamName] = version
  await fs.writeFile(pkgJsonPath, `${JSON.stringify(pkgJson, null, 2)}\n`)
}

async function runPackageTest(socketPkgName: string): Promise<boolean> {
  const testPath = `test/npm/${socketPkgName}.test.mts`
  if (!existsSync(path.join(ROOT_PATH, testPath))) {
    logger.warn(`${socketPkgName}: no ${testPath} to verify against`)
    return true
  }
  try {
    await runCommandQuietStrict('pnpm', ['exec', 'vitest', 'run', testPath], {
      cwd: ROOT_PATH,
      env: { ...process.env, INCLUDE_NPM_TESTS: '1' },
    })
    return true
  } catch {
    return false
  }
}

async function applyOne(
  drift: OverrideDrift,
  options: { effort: AiEffort; model: string },
): Promise<'synced' | 'soak-blocked' | 'failed'> {
  const { effort, model } = { __proto__: null, ...options } as typeof options
  const fromVersion = drift.pinnedSpec as string
  const toVersion = drift.latestVersion as string

  logger.log(
    `${drift.socketPkgName}: syncing ${drift.upstreamName} ` +
      `${fromVersion} -> ${toVersion}`,
  )

  await writeUpstreamPin(drift.upstreamName, toVersion)
  try {
    await runCommandQuietStrict('pnpm', ['install'], { cwd: ROOT_PATH })
  } catch (e) {
    // The 7-day minimumReleaseAge soak (or any install-policy gate) rejected
    // the new version. Restore the pin — pre-soak releases are never forced.
    await writeUpstreamPin(drift.upstreamName, fromVersion)
    logger.warn(
      `${drift.socketPkgName}: install rejected (${(e as Error).message}); ` +
        'likely still inside the release soak window — pin restored, skipped',
    )
    return 'soak-blocked'
  }

  // Reconciling an override implementation + its unit tests against a new
  // upstream release takes real code judgment (behavior diffs, edge cases,
  // both-arms test design) — sonnet/medium is the codify-guidance tier for
  // this shape of work; the haiku/low floor under-reads behavioral change.
  const result = await spawnAiAgent({
    ...AI_PROFILE.verify,
    cwd: ROOT_PATH,
    effort,
    model,
    prompt: buildSyncPrompt({
      socketPkgName: drift.socketPkgName,
      upstreamName: drift.upstreamName,
      fromVersion,
      toVersion,
    }),
    timeoutMs: 15 * 60 * 1000,
  })
  if (result.exitCode !== 0) {
    logger.fail(
      `${drift.socketPkgName}: agent exited ${result.exitCode}` +
        `${result.overloaded ? ' (overloaded)' : ''}` +
        `${result.unavailable ? ' (unavailable)' : ''}`,
    )
    return 'failed'
  }

  // The agent self-verifies, but the law is deterministic: re-run the
  // package test ourselves before calling the sync good.
  if (!(await runPackageTest(drift.socketPkgName))) {
    logger.fail(
      `${drift.socketPkgName}: tests red after sync — tree left in place ` +
        'for inspection',
    )
    return 'failed'
  }
  logger.success(`${drift.socketPkgName}: synced to ${toVersion}, tests green`)
  return 'synced'
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      apply: { type: 'boolean' },
      check: { type: 'boolean' },
      effort: { type: 'string' },
      model: { type: 'string' },
      package: { type: 'string', multiple: true },
      quiet: { type: 'boolean' },
    },
    strict: false,
  })
  const quiet = !!values['quiet']
  const packageFilter = (values['package'] ?? []) as string[]

  const drift = await collectOverrideDrift(packageFilter)
  const stale = drift.filter(d => d.status === 'stale')
  const unpinnable = drift.filter(d => d.status === 'unpinnable-spec')
  const unresolved = drift.filter(d => d.status === 'unresolved')

  if (!quiet) {
    for (let i = 0, { length } = stale; i < length; i += 1) {
      const d = stale[i]!
      logger.log(
        `stale: ${d.socketPkgName} (${d.upstreamName} ` +
          `${d.pinnedSpec} -> ${d.latestVersion})`,
      )
    }
    for (let i = 0, { length } = unpinnable; i < length; i += 1) {
      const d = unpinnable[i]!
      logger.log(
        `unpinnable spec (manual review): ${d.socketPkgName} ` +
          `(${d.upstreamName} @ ${d.pinnedSpec})`,
      )
    }
    for (let i = 0, { length } = unresolved; i < length; i += 1) {
      const d = unresolved[i]!
      logger.warn(`unresolved on npm: ${d.upstreamName}`)
    }
  }

  if (!stale.length) {
    if (!quiet) {
      logger.success(
        `All ${drift.length} overrides track their upstream latest.`,
      )
    }
    return
  }

  if (!values['apply']) {
    if (!quiet) {
      logger.fail(
        `${stale.length} override(s) behind upstream. Re-run with --apply ` +
          '(optionally --package <name>) to sync implementation + tests.',
      )
    }
    // --check contract mirrors the weekly-update gate: 2 = actionable drift.
    process.exitCode = values['check'] ? 2 : 1
    return
  }

  const model = typeof values['model'] === 'string' ? values['model'] : 'sonnet'
  const effort = (
    typeof values['effort'] === 'string' ? values['effort'] : 'medium'
  ) as AiEffort
  let failed = 0
  for (let i = 0, { length } = stale; i < length; i += 1) {
    const d = stale[i]!
    const outcome = await applyOne(d, { effort, model })
    if (outcome === 'failed') {
      failed += 1
    }
  }
  if (failed) {
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e: unknown) => {
    logger.fail(`sync-npm-overrides: ${(e as Error).message}`)
    process.exitCode = 1
  })
}
