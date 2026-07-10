// vitest specs for the squashing-history runner's tree-identity integrity gate.
// squashSingleCommit() collapses a branch to one commit and HARD-fails
// (process.exit(1)) when the post-squash tree differs from the supplied
// origHead. Because the failure path is process.exit, it's exercised in a
// subprocess driver against real temp git repos — the happy path proves a clean
// squash returns the new head; the mismatch path proves the gate exits non-zero.

// Isolate git fixtures from the live repo (vitest setup also does this).
import '../../../.git-hooks/_shared/isolate-git-env.mts'

import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { spawnSync } from '@socketsecurity/lib-stable/process/spawn/child'
import { test } from 'vitest'

const RUN_MTS = fileURLToPath(
  new URL(
    '../../../.claude/skills/fleet/squashing-history/run.mts',
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

// Git env vars that mirror the -c flags above, used to propagate identity
// into subprocess drivers that spawn git internally (where the -c flags from
// the helper `git()` function do not apply).
const GIT_ID_ENV: Record<string, string> = {
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_AUTHOR_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
}

function git(cwd: string, args: readonly string[]): string {
  const r = spawnSync('git', [...ID, ...args], { cwd, stdioString: true })
  assert.equal(r.status, 0, `git ${args.join(' ')} failed: ${String(r.stderr)}`)
  return String(r.stdout).trim()
}

function commitFile(
  cwd: string,
  file: string,
  body: string,
  msg: string,
): string {
  writeFileSync(path.join(cwd, file), body)
  git(cwd, ['add', file])
  git(cwd, ['commit', '--quiet', '-m', msg])
  return git(cwd, ['rev-parse', 'HEAD'])
}

// A 3-commit worktree we can squash. Returns its path + the two head SHAs.
function makeWorktree(): { cwd: string; first: string; head: string } {
  const cwd = mkdtempSync(path.join(os.tmpdir(), 'squash-run-'))
  git(cwd, ['init', '--quiet', '--initial-branch=main', cwd])
  const first = commitFile(cwd, 'a.txt', '1\n', 'chore: a')
  commitFile(cwd, 'b.txt', '2\n', 'chore: b')
  const head = commitFile(cwd, 'c.txt', '3\n', 'chore: c')
  return { cwd, first, head }
}

// Spawn a node driver that imports squashSingleCommit and calls it with the
// given origHead, printing the JSON result on success. Returns the child.
function runSquash(worktree: string, origHead: string) {
  const driver = `
    import { squashSingleCommit } from ${JSON.stringify(RUN_MTS)}
    const r = await squashSingleCommit({
      origHead: ${JSON.stringify(origHead)},
      worktree: ${JSON.stringify(worktree)},
      message: 'chore: initial commit',
    })
    process.stdout.write(JSON.stringify(r))
  `
  return spawnSync(process.execPath, ['--input-type=module', '-e', driver], {
    cwd: worktree,
    env: { ...process.env, ...GIT_ID_ENV },
    stdioString: true,
  })
}

test('squashSingleCommit collapses to one commit when the tree matches', () => {
  const { cwd, head } = makeWorktree()
  const r = runSquash(cwd, head)
  assert.equal(r.status, 0, `driver failed: ${String(r.stderr)}`)
  const out = JSON.parse(String(r.stdout)) as { newHead: string }
  assert.match(out.newHead, /^[0-9a-f]{7,40}$/)
  // Exactly one commit remains.
  assert.equal(git(cwd, ['rev-list', '--count', 'HEAD']), '1')
})

test('squashSingleCommit HARD-fails (exit non-zero) on a tree mismatch', () => {
  const { cwd, first } = makeWorktree()
  // Pass the FIRST commit as origHead: its tree (only a.txt) differs from the
  // post-squash tree (a.txt + b.txt + c.txt), so the integrity diff is
  // non-empty and the gate must process.exit(1).
  const r = runSquash(cwd, first)
  assert.notEqual(r.status, 0, 'expected the integrity gate to exit non-zero')
  assert.match(String(r.stderr), /non-empty|aborting/i)
})
