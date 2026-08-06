#!/usr/bin/env node
/*
 * @file Enforce the two laws of `scripts/`. Ownership decides placement, and
 *   the two answers have different homes:
 *
 *   1. SEGMENTATION. `scripts/` holds exactly two directories. `fleet/` is
 *      cascade-owned machinery authored in the wheelhouse template, and
 *      `repo/` is this repo's own scripts. A third top-level directory, or a
 *      loose file directly under `scripts/`, sits outside both ownership
 *      tiers: nobody can say whether the cascade owns it, so it drifts.
 *      Underscore-prefixed names (`_shared/`) are the documented internals
 *      escape hatch and pass.
 *   2. THIN PAYLOAD. A fleet MEMBER never tracks anything under
 *      `scripts/fleet/`. That tree arrives from the fleet-pack release at
 *      bootstrap; tracking it duplicates state that then drifts silently, and
 *      answering "is this member behind?" needs a diff instead of a version.
 *      The wheelhouse itself is exempt — it AUTHORS the payload.
 *
 *   The member-side fix for a wrongly-placed file follows ownership: a
 *   repo-owned script moves to `scripts/repo/`; a fleet script is deleted,
 *   because the pack serves it.
 *
 *   Usage: node scripts/fleet/check/scripts-are-segmented.mts [--quiet]
 */

import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { spawnSync } from '@socketsecurity/lib-stable/process/spawn/child'

import { isMainModule } from '../_shared/is-main-module.mts'
import { REPO_ROOT } from '../paths.mts'
import { runMain } from '../_shared/run-main.mts'

import type { ScriptMeta } from '../_shared/run-main.mts'

const logger = getDefaultLogger()

/**
 * The only two ownership tiers `scripts/` may contain.
 */
export const SEGMENT_DIRS: ReadonlySet<string> = new Set(['fleet', 'repo'])

/**
 * Entries directly under `scripts/` that belong to neither tier: any
 * directory that is not `fleet`/`repo`, plus any loose file. Dot- and
 * underscore-prefixed names pass — the latter is the documented internals
 * convention. Pure over the filesystem — exported for tests.
 */
export function findUnsegmentedEntries(scriptsDir: string): string[] {
  if (!existsSync(scriptsDir)) {
    return []
  }
  const violations: string[] = []
  const entries = readdirSync(scriptsDir, { withFileTypes: true })
  for (let i = 0, { length } = entries; i < length; i += 1) {
    const entry = entries[i]!
    const { name } = entry
    if (name.startsWith('.') || name.startsWith('_')) {
      continue
    }
    if (entry.isDirectory() && SEGMENT_DIRS.has(name)) {
      continue
    }
    violations.push(entry.isDirectory() ? `${name}/` : name)
  }
  return violations.toSorted()
}

/**
 * Whether this repo AUTHORS the fleet payload rather than consuming it. The
 * wheelhouse tracks `template/base/scripts/fleet/` by definition, and its own
 * live mirror with it; every other repo is a member and must not.
 */
export function isPayloadAuthor(repoRoot: string): boolean {
  return existsSync(path.join(repoRoot, 'template', 'base', 'scripts', 'fleet'))
}

/**
 * Paths tracked under `scripts/fleet/`, or an empty list when the tree is
 * untracked as it should be. Reads git's index rather than the filesystem:
 * the payload is PRESENT on disk in a bootstrapped checkout, so only the
 * index distinguishes a thin repo from a fat one.
 */
export function trackedFleetPaths(repoRoot: string): string[] {
  const result = spawnSync('git', ['ls-files', '--', 'scripts/fleet'], {
    cwd: repoRoot,
    stdioString: true,
  })
  if (result.status !== 0) {
    return []
  }
  return String(result.stdout ?? '')
    .split('\n')
    .filter(line => line !== '')
}

export function main(): void {
  const quiet = process.argv.includes('--quiet')
  const scriptsDir = path.join(REPO_ROOT, 'scripts')
  const unsegmented = findUnsegmentedEntries(scriptsDir)
  const author = isPayloadAuthor(REPO_ROOT)
  const tracked = author ? [] : trackedFleetPaths(REPO_ROOT)
  if (unsegmented.length === 0 && tracked.length === 0) {
    if (!quiet) {
      logger.success(
        author
          ? 'scripts/ is segmented into fleet/ + repo/ (payload author, fleet tree tracked by design).'
          : 'scripts/ is segmented into fleet/ + repo/, and the fleet payload is untracked.',
      )
    }
    return
  }
  if (unsegmented.length) {
    logger.fail(
      `scripts/ has ${unsegmented.length} unsegmented entr${unsegmented.length === 1 ? 'y' : 'ies'}: ${unsegmented.join(', ')}.`,
    )
    logger.error(
      '  Every script lives under scripts/fleet/ (cascade-owned) or ' +
        'scripts/repo/ (repo-owned) — an entry outside both belongs to ' +
        'nobody and drifts.',
    )
    logger.error(
      '  Fix: `git mv scripts/<name> scripts/repo/<name>` for a repo-owned ' +
        'script, then repoint its references (relative import depth changes). ' +
        'A fleet script is authored in the wheelhouse template and cascaded — ' +
        'delete the local copy instead of moving it.',
    )
  }
  if (tracked.length) {
    logger.fail(
      `scripts/fleet/ has ${tracked.length} TRACKED path(s) — the fleet payload must not be committed.`,
    )
    logger.error(
      '  That tree arrives from the fleet-pack release at bootstrap. Tracking ' +
        'it duplicates state the cascade owns, so the copies drift and ' +
        '"is this member behind?" needs a diff instead of a version.',
    )
    logger.error(
      '  Fix: `git rm -r --cached scripts/fleet` (files stay on disk) and add ' +
        'the payload to .gitignore. FIRST diff the tree against the template: ' +
        'a file that exists only here is repo-owned and moves to ' +
        'scripts/repo/ — untracking it would delete real content.',
    )
  }
  process.exitCode = 1
}

const SCRIPT_META: ScriptMeta = {
  describe:
    'checks that scripts/ is segmented into fleet/ + repo/ and that the fleet payload is untracked',
  help: `Usage: node scripts/fleet/check/scripts-are-segmented.mts [--quiet]

  --quiet   print nothing when the repo is clean`,
}

if (isMainModule(import.meta.url)) {
  runMain(main, SCRIPT_META)
}
