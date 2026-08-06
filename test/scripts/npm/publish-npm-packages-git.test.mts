/**
 * @file Tests for scripts/repo/npm/publish-npm-packages-git.mts checkoutCommit.
 *   The publish flow runs in checkouts shared with other sessions, so the
 *   `git reset --hard` + `git checkout <sha>` pair has two safety rails: a
 *   --dry-run preview touches the worktree not at all, and a real run over a
 *   dirty LOCAL worktree refuses instead of discarding the uncommitted work.
 *   CI's checkout is disposable, so a dirty tree there still resets.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const mockSpawn = vi.hoisted(() => vi.fn())

vi.mock(import('@socketsecurity/lib-stable/process/spawn/child'), () => ({
  spawn: mockSpawn,
}))

import { checkoutCommit } from '../../../scripts/repo/npm/publish-npm-packages-git.mts'

// Every `git` invocation the mock recorded, as a space-joined command line.
function spawnedCommands(): string[] {
  return mockSpawn.mock.calls.map(
    call => `${call[0]} ${(call[1] as string[]).join(' ')}`,
  )
}

function setWorktreeStatus(porcelain: string): void {
  mockSpawn.mockResolvedValue({ stdout: porcelain })
}

describe('checkoutCommit', () => {
  beforeEach(() => {
    mockSpawn.mockReset()
    setWorktreeStatus('')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test('a dry run touches the worktree not at all', async () => {
    vi.stubEnv('CI', '')
    setWorktreeStatus(' M some/parallel/session/file.mts\n')
    await checkoutCommit('abc1234', { dryRun: true })
    expect(spawnedCommands()).toEqual([])
  })

  test('a clean local worktree resets and checks out', async () => {
    vi.stubEnv('CI', '')
    await checkoutCommit('abc1234')
    expect(spawnedCommands()).toEqual([
      'git status --porcelain',
      'git reset --hard',
      'git checkout abc1234',
    ])
  })

  test('a dirty local worktree refuses instead of discarding the work', async () => {
    vi.stubEnv('CI', '')
    setWorktreeStatus(' M registry/src/index.ts\n?? scratch.mts\n')
    await expect(checkoutCommit('abc1234')).rejects.toThrow(
      /Refusing to reset a dirty worktree[\s\S]*2 uncommitted change\(s\)[\s\S]*Fix:/,
    )
    // The refusal happens BEFORE anything destructive runs.
    expect(spawnedCommands()).toEqual(['git status --porcelain'])
  })

  test("CI's disposable checkout still resets over a dirty tree", async () => {
    vi.stubEnv('CI', '1')
    setWorktreeStatus(' M registry/dist/index.js\n')
    await checkoutCommit('abc1234')
    expect(spawnedCommands()).toEqual([
      'git status --porcelain',
      'git reset --hard',
      'git checkout abc1234',
    ])
  })
})
