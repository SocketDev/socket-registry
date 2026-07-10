// vitest specs for the shared git-default-branch resolver. Builds real temp
// git repos (origin + clone) so resolveDefaultBranch exercises the actual
// symbolic-ref / show-ref probes, not a mock. The vitest setup pins git config
// to /dev/null, so every `git` spawn carries an explicit local identity.

// Strip the inherited GIT_* discovery vars before any `git` spawn so the temp
// fixtures below can't escape onto the live repo (vitest's setup also does this;
// the explicit import keeps the fixture isolated under the pre-commit hook too).
import '../../../.git-hooks/_shared/isolate-git-env.mts'

import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { spawnSync } from '@socketsecurity/lib-stable/process/spawn/child'
import { test } from 'vitest'

import { resolveDefaultBranch } from '../../../.claude/skills/fleet/_shared/scripts/git-default-branch.mts'

const ID = [
  '-c',
  'user.email=test@example.com',
  '-c',
  'user.name=Test',
  '-c',
  'commit.gpgsign=false',
]

function git(cwd: string, args: readonly string[]): void {
  const r = spawnSync('git', [...ID, ...args], { cwd, stdioString: true })
  assert.equal(r.status, 0, `git ${args.join(' ')} failed: ${String(r.stderr)}`)
}

// Build a bare origin whose default branch is `branch`, plus a clone of it.
function makeClone(branch: string): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'git-default-branch-'))
  const origin = path.join(root, 'origin.git')
  const work = path.join(root, 'work')
  git(root, ['init', '--quiet', `--initial-branch=${branch}`, '--bare', origin])
  git(root, ['init', '--quiet', `--initial-branch=${branch}`, work])
  writeFileSync(path.join(work, 'README.md'), '# x\n')
  git(work, ['add', 'README.md'])
  git(work, ['commit', '--quiet', '-m', 'chore: initial commit'])
  git(work, ['remote', 'add', 'origin', origin])
  git(work, ['push', '--quiet', '-u', 'origin', branch])
  // Point origin/HEAD at the default branch so symbolic-ref resolves.
  git(work, ['remote', 'set-head', 'origin', branch])
  return work
}

test('resolveDefaultBranch resolves main via origin/HEAD', async () => {
  const work = makeClone('main')
  assert.equal(await resolveDefaultBranch({ cwd: work }), 'main')
})

test('resolveDefaultBranch resolves a master-default repo', async () => {
  const work = makeClone('master')
  assert.equal(await resolveDefaultBranch({ cwd: work }), 'master')
})

test('resolveDefaultBranch falls back to main outside any repo', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'git-default-branch-none-'))
  // No git repo here — every probe fails, last-resort fallback is main.
  assert.equal(await resolveDefaultBranch({ cwd: dir }), 'main')
})
