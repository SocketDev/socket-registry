// vitest specs for the driving-cursor-bugbot plumbing. The GitHub calls go
// through the `gh` CLI; these specs drive a fake `gh` on PATH so the
// JSON-parsing + Bugbot-author filtering (inventory) and the URL→PR derivation
// (prForComment) are exercised offline. gitCommitsTouchingSince runs against a
// real temp git repo.

// Isolate git fixtures from the live repo (vitest setup also does this).
import '../../../.git-hooks/_shared/isolate-git-env.mts'

import assert from 'node:assert/strict'
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { spawnSync } from '@socketsecurity/lib-stable/process/spawn/child'
import { test } from 'vitest'

const BUGBOT_MTS = fileURLToPath(
  new URL(
    '../../../.claude/skills/fleet/driving-cursor-bugbot/lib/bugbot.mts',
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

// A fake `gh` on PATH that pattern-matches the script's gh calls. `repo view`
// returns owner/repo; `api …/comments` returns `comments`; `api …/comments/<id>`
// returns the pull_request_url.
function ghShimDir(options: {
  comments: unknown
  pullRequestUrl: string
}): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'bugbot-ghshim-'))
  const gh = path.join(dir, 'gh')
  const script = `#!/bin/sh
ALL="$*"
case "$ALL" in
  *"repo view"*)
    printf '%s' '{"owner":"SocketDev","repo":"socket-wheelhouse"}'
    ;;
  *"pulls/comments/"*)
    # gh api repos/.../pulls/comments/<id> --jq .pull_request_url
    printf '%s' ${JSON.stringify(options.pullRequestUrl)}
    ;;
  *comments*)
    printf '%s' ${JSON.stringify(JSON.stringify(options.comments))}
    ;;
esac
exit 0
`
  writeFileSync(gh, script)
  chmodSync(gh, 0o755)
  return dir
}

function withGhPath(dir: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: `${dir}${path.delimiter}${process.env['PATH'] ?? ''}`,
  }
}

test('inventory keeps only Bugbot/Cursor-authored comments', () => {
  const dir = ghShimDir({
    pullRequestUrl: '',
    comments: [
      {
        body: 'real bug',
        commit_id: 'abc',
        id: 1,
        line: 10,
        path: 'src/a.ts',
        user: { login: 'cursor[bot]' },
      },
      {
        body: 'human nit',
        commit_id: 'def',
        id: 2,
        line: 20,
        path: 'src/b.ts',
        user: { login: 'octocat' },
      },
    ],
  })
  const driver = `
    import { inventory } from ${JSON.stringify(BUGBOT_MTS)}
    process.stdout.write(JSON.stringify(await inventory(123)))
  `
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', driver], {
    env: withGhPath(dir),
    stdioString: true,
  })
  assert.equal(r.status, 0, `driver failed: ${String(r.stderr)}`)
  const findings = JSON.parse(String(r.stdout)) as Array<{
    id: number
    path: string
  }>
  assert.equal(findings.length, 1)
  assert.equal(findings[0]!.id, 1)
  assert.equal(findings[0]!.path, 'src/a.ts')
})

test('prForComment derives the PR number from pull_request_url', () => {
  const dir = ghShimDir({
    comments: [],
    pullRequestUrl:
      'https://api.github.com/repos/SocketDev/socket-wheelhouse/pulls/456',
  })
  const driver = `
    import { prForComment } from ${JSON.stringify(BUGBOT_MTS)}
    const n = await prForComment({ owner: 'SocketDev', repo: 'socket-wheelhouse', comment: 789 })
    process.stdout.write(String(n))
  `
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', driver], {
    env: withGhPath(dir),
    stdioString: true,
  })
  assert.equal(r.status, 0, `driver failed: ${String(r.stderr)}`)
  assert.equal(String(r.stdout).trim(), '456')
})

test('prForComment throws when the URL has no /pulls/<n> suffix', () => {
  const dir = ghShimDir({ comments: [], pullRequestUrl: 'not-a-pull-url' })
  const driver = `
    import { prForComment } from ${JSON.stringify(BUGBOT_MTS)}
    try {
      await prForComment({ owner: 'o', repo: 'r', comment: 1 })
      process.stdout.write('NO_THROW')
    } catch (e) {
      process.stdout.write('THREW')
    }
  `
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', driver], {
    env: withGhPath(dir),
    stdioString: true,
  })
  assert.equal(String(r.stdout).trim(), 'THREW')
})

test('gitCommitsTouchingSince lists commits after a SHA that touch a path', () => {
  const cwd = mkdtempSync(path.join(os.tmpdir(), 'bugbot-gitlog-'))
  git(cwd, ['init', '--quiet', '--initial-branch=main', cwd])
  writeFileSync(path.join(cwd, 'a.ts'), '1\n')
  git(cwd, ['add', 'a.ts'])
  git(cwd, ['commit', '--quiet', '-m', 'chore: base'])
  const base = git(cwd, ['rev-parse', 'HEAD'])
  // A later commit that touches a.ts.
  writeFileSync(path.join(cwd, 'a.ts'), '2\n')
  git(cwd, ['add', 'a.ts'])
  git(cwd, ['commit', '--quiet', '-m', 'fix: a'])
  // A later commit that does NOT touch a.ts.
  writeFileSync(path.join(cwd, 'b.ts'), 'x\n')
  git(cwd, ['add', 'b.ts'])
  git(cwd, ['commit', '--quiet', '-m', 'chore: b'])

  // The driver runs with cwd = the temp repo (spawn `cwd` below); bugbot's
  // `git log` spawn inherits that cwd, so no process.chdir is needed.
  const driver = `
    const { gitCommitsTouchingSince } = await import(${JSON.stringify(BUGBOT_MTS)})
    process.stdout.write(JSON.stringify(await gitCommitsTouchingSince(${JSON.stringify(base)}, 'a.ts')))
  `
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', driver], {
    cwd,
    env: { ...process.env },
    stdioString: true,
  })
  assert.equal(r.status, 0, `driver failed: ${String(r.stderr)}`)
  const commits = JSON.parse(String(r.stdout)) as string[]
  // Exactly the one later commit that touched a.ts.
  assert.equal(commits.length, 1)
})
