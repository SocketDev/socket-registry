#!/usr/bin/env node
/*
 * @file Repo gate: every ported npm conformance suite's provenance is a
 *   machine-checkable chain, not prose. `test/npm/<pkg>.test.mts` files are 1:1
 *   ports of an upstream package's own test file. The pin of record is the
 *   `file-fork` row in `.config/repo/lockstep.json`; this gate asserts the
 *   three other records agree with it:
 *
 *   1. `.gitmodules` — the row's upstream resolves to an `upstream/<owner>-<repo>`
 *      block that is shallow, single-branch on a release tag, sparse, sha256
 *      stamped, and whose `ref` equals the row's `forked_at_sha`.
 *   2. the ported suite's `@file` header — its version, short SHA, permalink
 *      owner/repo, permalink SHA, and permalink path all agree with the row and
 *      the pin.
 *   3. `test/npm/package.json` — the package's own dependency spec pins the ported
 *      version (a semver spec) or the ported SHA (an archive tarball). Offline
 *      and pure filesystem by default, so `check --all` never flakes on the
 *      network. `--online` adds the currency leg: `git ls-remote --tags`
 *      resolves each upstream's newest release tag and reports how far behind
 *      the pin is. Every unresolvable input is an exit-1 failure with a What /
 *      Where / Saw vs wanted / Fix block — a pin this gate cannot resolve never
 *      reads green. Drift of the ported BYTES (upstream commits since
 *      `forked_at_sha`) is the lockstep harness's job — `pnpm run lockstep`,
 *      which needs the submodule materialized. This gate is its offline
 *      complement. Wiring the remaining overrides:
 *      docs/agents.md/repo/npm-port-provenance.md. Usage: node
 *      scripts/repo/check/npm-port-provenance-is-current.mts [--online]
 *      [--quiet]
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'

import { isMainModule } from '../../fleet/_shared/is-main-module.mts'
import {
  loadManifestTree,
  resolveManifestRoot,
} from '../../fleet/lockstep/manifest.mts'
import { findNpmPortCurrencyProblems } from './npm-port-provenance/currency.mts'
import { findNpmPortProvenanceProblems } from './npm-port-provenance/problems.mts'
import {
  collectNpmPortRows,
  formatNpmPortProblem,
  mergeGitmodulesPins,
} from './npm-port-provenance/records.mts'

const logger = getDefaultLogger()

export interface NpmPortCheckOptions {
  // Add the network currency leg: how far each pin trails the newest release.
  online?: boolean | undefined
  // Suppress the pass line; failures always print.
  quiet?: boolean | undefined
}

function readJsonRecord(filePath: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8'))
  if (parsed === null || typeof parsed !== 'object') {
    throw new Error(
      `npm-port-provenance-is-current: ${filePath} did not parse to a JSON object; the conformance fixture manifest must be an object so its devDependencies can be read.`,
    )
  }
  return parsed as Record<string, unknown>
}

function readNpmFixtureDevDependencies(
  repoRoot: string,
): Record<string, string> {
  const record = readJsonRecord(
    path.join(repoRoot, 'test', 'npm', 'package.json'),
  )
  const devDeps = record['devDependencies']
  if (devDeps === null || typeof devDeps !== 'object') {
    return {}
  }
  return devDeps as Record<string, string>
}

function failMissingRecord(lines: readonly string[]): number {
  logger.fail(lines.join('\n'))
  return 1
}

/**
 * Run every provenance leg. Returns the exit code — 0 when every wired port's
 * four records agree (and, with `online`, the pin is the newest release); 1 on
 * any disagreement or unresolvable input.
 */
export async function runNpmPortProvenanceCheck(
  repoRoot: string,
  options?: NpmPortCheckOptions | undefined,
): Promise<number> {
  const opts = { __proto__: null, ...options } as NpmPortCheckOptions
  const online = opts.online === true
  const quiet = opts.quiet === true

  const manifestPath = resolveManifestRoot(repoRoot)
  if (!existsSync(manifestPath)) {
    return failMissingRecord([
      'npm-port-provenance-is-current: the lockstep manifest is missing.',
      '    What:   the port records this gate reads do not exist.',
      `    Where:  ${path.relative(repoRoot, manifestPath) || manifestPath}`,
      '    Saw:    no file',
      '    Wanted: a lockstep manifest holding one file-fork row per ported npm suite',
      '    Fix:    create .config/repo/lockstep.json — see docs/agents.md/repo/npm-port-provenance.md.',
    ])
  }
  const { merged } = loadManifestTree(manifestPath, repoRoot)
  const rows = collectNpmPortRows(merged)
  if (rows.length === 0) {
    if (!quiet) {
      logger.log(
        'npm-port-provenance-is-current: no npm port rows wired; nothing to check.',
      )
    }
    return 0
  }

  const gitmodulesPath = path.join(repoRoot, '.gitmodules')
  if (!existsSync(gitmodulesPath)) {
    return failMissingRecord([
      'npm-port-provenance-is-current: .gitmodules is missing while port rows are wired.',
      `    What:   ${rows.length} port row(s) reference upstream submodules that have no pin record.`,
      '    Where:  .gitmodules',
      '    Saw:    no file',
      '    Wanted: one shallow single-branch upstream/ block per wired upstream',
      '    Fix:    declare the blocks, then pin each with `node scripts/fleet/gen/gitmodules-hash.mts --set upstream/<name> <ref> --label <pkg>-<tag>`.',
    ])
  }

  const pins = mergeGitmodulesPins(readFileSync(gitmodulesPath, 'utf8'))
  const upstreams = merged.upstreams ?? {}
  const problems = findNpmPortProvenanceProblems({
    rows,
    upstreams,
    pins,
    readPortSource: localPath => {
      const abs = path.join(repoRoot, localPath)
      return existsSync(abs) ? readFileSync(abs, 'utf8') : undefined
    },
    devDependencies: readNpmFixtureDevDependencies(repoRoot),
    hasOverridePackage: packageName =>
      existsSync(path.join(repoRoot, 'packages', 'npm', packageName)),
  })

  if (online) {
    problems.push(...(await findNpmPortCurrencyProblems(rows, upstreams, pins)))
  }

  if (problems.length === 0) {
    if (!quiet) {
      logger.log(
        `npm-port-provenance-is-current: ${rows.length} ported npm suite(s) agree with their pins${online ? ' and are at the newest upstream release' : ''}.`,
      )
    }
    return 0
  }
  logger.fail(
    [
      `npm-port-provenance-is-current: ${problems.length} provenance disagreement(s) across ${rows.length} wired port(s).`,
      '',
      ...problems.map(formatNpmPortProblem),
      '',
      '  Doctrine: docs/agents.md/repo/npm-port-provenance.md',
    ].join('\n'),
  )
  return 1
}

/* c8 ignore start - entrypoint guard; the pure legs are covered directly. */
if (isMainModule(import.meta.url)) {
  const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..')
  runNpmPortProvenanceCheck(repoRoot, {
    online: process.argv.includes('--online'),
    quiet: process.argv.includes('--quiet'),
  })
    .then(code => {
      process.exitCode = code
    })
    .catch((e: unknown) => {
      logger.fail(`npm-port-provenance-is-current failed: ${String(e)}`)
      process.exitCode = 1
    })
}
/* c8 ignore stop */
