// vitest specs for the reordering-release-bump runner. Exercises the pure
// helpers (findBumpCommit, verifyBumpIsCleanBump) against real temp git repos,
// and asserts the tree-identity HARD-fail path: when re-positioning the bump
// would change the tree (a later commit re-touched package.json), the integrity
// gate must process.exit non-zero. Run as a dry-run (no --apply) so nothing is
// pushed; the integrity check runs BEFORE any push.

// Isolate git fixtures from the live repo (vitest setup also does this).
import '../../../.git-hooks/_shared/isolate-git-env.mts'

import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { spawnSync } from '@socketsecurity/lib-stable/process/spawn/child'
import { test } from 'vitest'

import {
  findBumpCommit,
  verifyBumpIsCleanBump,
} from '../../../.claude/skills/fleet/reordering-release-bump/lib/reorder-bump.mts'

const REORDER_MTS = fileURLToPath(
  new URL(
    '../../../.claude/skills/fleet/reordering-release-bump/lib/reorder-bump.mts',
    import.meta.url,
  ),
)

const ID = [
  '-c',
  'user.email=test@example.com',
  '-c',
  'user.name=Test',
  '-c',
  'commit.gpgsign=false',
]

function git(cwd: string, args: readonly string[]): string {
  const r = spawnSync('git', [...ID, ...args], { cwd, stdioString: true })
  assert.equal(r.status, 0, `git ${args.join(' ')} failed: ${String(r.stderr)}`)
  return String(r.stdout).trim()
}

function write(cwd: string, file: string, body: string): void {
  writeFileSync(path.join(cwd, file), body)
}

function commit(cwd: string, msg: string): string {
  git(cwd, ['add', '-A'])
  git(cwd, ['commit', '--quiet', '-m', msg])
  return git(cwd, ['rev-parse', 'HEAD'])
}

function pkg(version: string): string {
  return `${JSON.stringify({ name: 'fixture', version }, undefined, 2)}\n`
}

// Build origin + a clone whose origin/main is: base → bump(1.0.0) → feature.
// `bumpAlsoEditedLater` makes the feature commit ALSO change package.json
// (to 1.0.1), so re-positioning the bump (1.0.0) on top would diverge from
// origTip — the integrity-gate trip we assert.
function makeRepo(options: { bumpAlsoEditedLater: boolean }): {
  work: string
} {
  const root = mkdtempSync(path.join(os.tmpdir(), 'reorder-bump-'))
  const origin = path.join(root, 'origin.git')
  const work = path.join(root, 'work')
  git(root, ['init', '--quiet', '--initial-branch=main', '--bare', origin])
  git(root, ['init', '--quiet', '--initial-branch=main', work])

  write(work, 'package.json', pkg('0.9.0'))
  write(work, 'CHANGELOG.md', '# Changelog\n')
  commit(work, 'chore: base')

  write(work, 'package.json', pkg('1.0.0'))
  write(work, 'CHANGELOG.md', '# Changelog\n\n## 1.0.0\n')
  commit(work, 'chore: bump version to 1.0.0')

  // A feature landed ON TOP of the bump.
  write(work, 'feature.txt', 'new feature\n')
  if (options.bumpAlsoEditedLater) {
    // The later commit re-touches package.json — re-positioning the 1.0.0 bump
    // to the tip would overwrite this, diverging from origTip.
    write(work, 'package.json', pkg('1.0.1'))
  }
  commit(work, 'feat: add feature')

  git(work, ['remote', 'add', 'origin', origin])
  git(work, ['push', '--quiet', '-u', 'origin', 'main'])
  git(work, ['remote', 'set-head', 'origin', 'main'])
  return { work }
}

test('findBumpCommit locates the bump and reads its version', async () => {
  const { work } = makeRepo({ bumpAlsoEditedLater: false })
  const bump = await findBumpCommit('main', work)
  assert.ok(bump, 'expected a bump commit')
  assert.equal(bump!.version, '1.0.0')
  assert.match(bump!.sha, /^[0-9a-f]{7,40}$/)
})

test('findBumpCommit returns undefined when no bump commit exists', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'reorder-nobump-'))
  const origin = path.join(root, 'origin.git')
  const work = path.join(root, 'work')
  git(root, ['init', '--quiet', '--initial-branch=main', '--bare', origin])
  git(root, ['init', '--quiet', '--initial-branch=main', work])
  write(work, 'package.json', pkg('1.0.0'))
  commit(work, 'chore: no bump here')
  git(work, ['remote', 'add', 'origin', origin])
  git(work, ['push', '--quiet', '-u', 'origin', 'main'])
  git(work, ['remote', 'set-head', 'origin', 'main'])
  assert.equal(await findBumpCommit('main', work), undefined)
})

test('verifyBumpIsCleanBump passes for a package.json+CHANGELOG bump', async () => {
  const { work } = makeRepo({ bumpAlsoEditedLater: false })
  const bump = await findBumpCommit('main', work)
  await assert.doesNotReject(() => verifyBumpIsCleanBump(bump!.sha, work))
})

test('verifyBumpIsCleanBump throws when the bump touches other files', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'reorder-dirtybump-'))
  const work = path.join(root, 'work')
  git(root, ['init', '--quiet', '--initial-branch=main', work])
  write(work, 'package.json', pkg('0.9.0'))
  commit(work, 'chore: base')
  write(work, 'package.json', pkg('1.0.0'))
  write(work, 'src.ts', 'extra file in the bump\n')
  const dirty = commit(work, 'chore: bump version to 1.0.0')
  await assert.rejects(
    verifyBumpIsCleanBump(dirty, work),
    /not a clean package\.json\+CHANGELOG bump/,
  )
})

test('reorder HARD-fails (exit non-zero) when re-positioning the bump would change the tree', () => {
  const { work } = makeRepo({ bumpAlsoEditedLater: true })
  // Dry-run: no --apply, so nothing is pushed; the failure surfaces BEFORE any
  // push. A later commit re-touched package.json, so splicing the 1.0.0 bump out
  // and replaying it onto the tip cannot reproduce the origin tree — the reorder
  // must abort non-zero (either the rebase/cherry-pick refuses, or the integrity
  // diff trips), never silently rewrite history with a changed tree.
  const r = spawnSync(process.execPath, [REORDER_MTS, work], {
    cwd: work,
    env: { ...process.env },
    stdioString: true,
  })
  assert.notEqual(r.status, 0, 'expected the reorder to abort non-zero')
  const combined = `${String(r.stdout)}\n${String(r.stderr)}`
  // It must NOT have reported a successful relocation.
  assert.doesNotMatch(combined, /relocated to the tip/i)
})

test('a non-git path exits non-zero', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'reorder-notgit-'))
  const r = spawnSync(process.execPath, [REORDER_MTS, dir], {
    cwd: dir,
    env: { ...process.env },
    stdioString: true,
  })
  assert.notEqual(r.status, 0)
})
