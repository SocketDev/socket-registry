// vitest specs for scripts/fleet/lib/doctor/git-gap.mts

import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import {
  detectDivergedMain,
  detectRemovableWorktrees,
  detectUnsignedCommits,
  formatDivergedMainFinding,
  formatRemovableWorktreesFinding,
  formatUnsignedCommitsFinding,
  parseWorktrees,
} from '../../../scripts/fleet/lib/doctor/git-gap.mts'

// ── detectUnsignedCommits ────────────────────────────────────────────────────

describe('detectUnsignedCommits', () => {
  test('returns undefined when all commits are signed (G code)', () => {
    const log = ['abc123def456\tG', 'deadbeef0001\tG'].join('\n')
    assert.equal(detectUnsignedCommits(log), undefined)
  })

  test('returns undefined when all commits have untrusted-but-present sig (U/X/Y/R)', () => {
    const log = [
      'abc123def456\tU',
      'deadbeef0001\tX',
      'cafebabe0001\tY',
      'f00df00d0001\tR',
    ].join('\n')
    assert.equal(detectUnsignedCommits(log), undefined)
  })

  test('returns undefined when log is empty (nothing unpushed)', () => {
    assert.equal(detectUnsignedCommits(''), undefined)
    assert.equal(detectUnsignedCommits('\n\n'), undefined)
  })

  test('detects unsigned commit with N code', () => {
    const log = 'abc123def456\tN\n'
    const finding = detectUnsignedCommits(log)
    assert.ok(finding, 'should produce a finding')
    assert.equal(finding.fixable, false)
    assert.ok(finding.saw.includes('abc123def456'))
  })

  test('detects unsigned commit with E code', () => {
    const log = 'abc123def456\tE\n'
    const finding = detectUnsignedCommits(log)
    assert.ok(finding)
    assert.ok(finding.saw.includes('abc123def456'))
  })

  test('detects unsigned commit with B code', () => {
    const log = 'abc123def456\tB\n'
    const finding = detectUnsignedCommits(log)
    assert.ok(finding)
    assert.ok(finding.saw.includes('abc123def456'))
  })

  test('collects multiple unsigned SHAs and skips signed ones', () => {
    const log = ['aaabbbcccddd\tN', 'eeefffggghhh\tG', '111222333444\tB'].join(
      '\n',
    )
    const finding = detectUnsignedCommits(log)
    assert.ok(finding)
    assert.ok(finding.saw.includes('aaabbbcccddd'))
    assert.ok(finding.saw.includes('111222333444'))
    assert.ok(
      !finding.saw.includes('eeefffggghhh'),
      'signed commit must not appear',
    )
  })

  test('truncates SHAs to 12 characters', () => {
    const log = 'abcdef123456789012\tN\n'
    const finding = detectUnsignedCommits(log)
    assert.ok(finding)
    assert.ok(finding.saw.includes('abcdef123456'))
    assert.ok(
      !finding.saw.includes('abcdef1234567'),
      'should not include more than 12 chars',
    )
  })
})

// ── formatUnsignedCommitsFinding ─────────────────────────────────────────────

describe('formatUnsignedCommitsFinding', () => {
  test('all four finding ingredients are non-empty', () => {
    const f = formatUnsignedCommitsFinding(['abc123def456'])
    assert.ok(f.what.length > 0)
    assert.ok(f.where.length > 0)
    assert.ok(f.saw.length > 0)
    assert.ok(f.fix.length > 0)
  })

  test('fixable is false', () => {
    const f = formatUnsignedCommitsFinding(['abc123def456'])
    assert.equal(f.fixable, false)
  })

  test('fix contains the rebase --exec sign command', () => {
    const f = formatUnsignedCommitsFinding(['abc123def456'])
    assert.ok(f.fix.includes('git rebase --exec'))
    assert.ok(f.fix.includes('--amend -S'))
  })

  test('what includes the count', () => {
    const f = formatUnsignedCommitsFinding(['aaa', 'bbb', 'ccc'])
    assert.ok(f.what.includes('3'))
  })

  test('saw lists each unsigned SHA', () => {
    const f = formatUnsignedCommitsFinding(['sha1', 'sha2'])
    assert.ok(f.saw.includes('sha1'))
    assert.ok(f.saw.includes('sha2'))
  })
})

// ── detectDivergedMain ───────────────────────────────────────────────────────

describe('detectDivergedMain', () => {
  test('returns undefined when 0 behind (clean)', () => {
    assert.equal(detectDivergedMain(0, 0), undefined)
  })

  test('returns undefined when ahead-only (behind=0)', () => {
    assert.equal(detectDivergedMain(5, 0), undefined)
  })

  test('returns a finding when behind > 0', () => {
    const f = detectDivergedMain(2, 3)
    assert.ok(f, 'should produce a finding')
    assert.equal(f.fixable, false)
  })

  test('returns a finding even when ahead=0 and behind>0', () => {
    const f = detectDivergedMain(0, 1)
    assert.ok(f)
    assert.equal(f.fixable, false)
  })
})

// ── formatDivergedMainFinding ─────────────────────────────────────────────────

describe('formatDivergedMainFinding', () => {
  test('all four finding ingredients are non-empty', () => {
    const f = formatDivergedMainFinding(2, 3)
    assert.ok(f.what.length > 0)
    assert.ok(f.where.length > 0)
    assert.ok(f.saw.length > 0)
    assert.ok(f.fix.length > 0)
  })

  test('fixable is false', () => {
    const f = formatDivergedMainFinding(2, 3)
    assert.equal(f.fixable, false)
  })

  test('saw includes ahead and behind counts', () => {
    const f = formatDivergedMainFinding(2, 3)
    assert.ok(f.saw.includes('2'))
    assert.ok(f.saw.includes('3'))
  })

  test('what includes behind count', () => {
    const f = formatDivergedMainFinding(0, 7)
    assert.ok(f.what.includes('7'))
  })

  test('fix includes the managing-worktrees land command', () => {
    const f = formatDivergedMainFinding(1, 1)
    assert.ok(f.fix.includes('managing-worktrees'))
    assert.ok(f.fix.includes('land'))
  })
})

// ── parseWorktrees ────────────────────────────────────────────────────────────

describe('parseWorktrees', () => {
  test('returns empty array for empty input', () => {
    assert.deepEqual(parseWorktrees(''), [])
  })

  test('skips the main worktree (first stanza)', () => {
    const porcelain = [
      'worktree /opt/repo/socket-repo',
      'HEAD abcdef123456',
      'branch refs/heads/main',
      '',
    ].join('\n')
    assert.deepEqual(parseWorktrees(porcelain), [])
  })

  test('returns secondary worktrees with branch and path', () => {
    const porcelain = [
      'worktree /opt/repo/socket-repo',
      'HEAD abcdef123456',
      'branch refs/heads/main',
      '',
      'worktree /tmp/wt-feature',
      'HEAD cafebabe0001',
      'branch refs/heads/feature/my-feature',
      '',
    ].join('\n')
    const wts = parseWorktrees(porcelain)
    assert.equal(wts.length, 1)
    assert.equal(wts[0]?.path, '/tmp/wt-feature')
    assert.equal(wts[0]?.branch, 'feature/my-feature')
  })

  test('skips detached HEAD worktrees (detached line, no branch)', () => {
    const porcelain = [
      'worktree /opt/repo/socket-repo',
      'HEAD abcdef123456',
      'branch refs/heads/main',
      '',
      'worktree /tmp/wt-detached',
      'HEAD deadbeef0001',
      'detached',
      '',
    ].join('\n')
    const wts = parseWorktrees(porcelain)
    assert.equal(wts.length, 0)
  })

  test('returns multiple secondary worktrees', () => {
    const porcelain = [
      'worktree /opt/repo/socket-repo',
      'HEAD aaaa',
      'branch refs/heads/main',
      '',
      'worktree /tmp/wt-one',
      'HEAD bbbb',
      'branch refs/heads/chore/wheelhouse-abc123',
      '',
      'worktree /tmp/wt-two',
      'HEAD cccc',
      'branch refs/heads/chore/wheelhouse-def456',
      '',
    ].join('\n')
    const wts = parseWorktrees(porcelain)
    assert.equal(wts.length, 2)
  })
})

// ── detectRemovableWorktrees ──────────────────────────────────────────────────

describe('detectRemovableWorktrees', () => {
  test('returns undefined when no worktrees present (main only)', () => {
    const porcelain = [
      'worktree /opt/repo/socket-repo',
      'HEAD abcdef123456',
      'branch refs/heads/main',
      '',
    ].join('\n')
    assert.equal(detectRemovableWorktrees(porcelain), undefined)
  })

  test('returns undefined for non-cascade secondary worktrees', () => {
    const porcelain = [
      'worktree /opt/repo/socket-repo',
      'HEAD aaaa',
      'branch refs/heads/main',
      '',
      'worktree /tmp/wt-feature',
      'HEAD bbbb',
      'branch refs/heads/feature/cool-feature',
      '',
    ].join('\n')
    assert.equal(detectRemovableWorktrees(porcelain), undefined)
  })

  test('detects a cascade worktree (chore/wheelhouse-<sha>)', () => {
    const porcelain = [
      'worktree /opt/repo/socket-repo',
      'HEAD aaaa',
      'branch refs/heads/main',
      '',
      'worktree /tmp/wt-cascade',
      'HEAD bbbb',
      'branch refs/heads/chore/wheelhouse-abc123ef',
      '',
    ].join('\n')
    const f = detectRemovableWorktrees(porcelain)
    assert.ok(f, 'should produce a finding')
    assert.equal(f.fixable, false)
  })

  test('detects multiple cascade worktrees', () => {
    const porcelain = [
      'worktree /opt/repo/socket-repo',
      'HEAD aaaa',
      'branch refs/heads/main',
      '',
      'worktree /tmp/wt-one',
      'HEAD bbbb',
      'branch refs/heads/chore/wheelhouse-abc123',
      '',
      'worktree /tmp/wt-two',
      'HEAD cccc',
      'branch refs/heads/chore/wheelhouse-def456',
      '',
    ].join('\n')
    const f = detectRemovableWorktrees(porcelain)
    assert.ok(f)
    assert.ok(f.what.includes('2'))
  })
})

// ── formatRemovableWorktreesFinding ──────────────────────────────────────────

describe('formatRemovableWorktreesFinding', () => {
  const entries = [
    { branch: 'chore/wheelhouse-abc123', path: '/tmp/wt-one' },
    { branch: 'chore/wheelhouse-def456', path: '/tmp/wt-two' },
  ]

  test('all four finding ingredients are non-empty', () => {
    const f = formatRemovableWorktreesFinding(entries)
    assert.ok(f.what.length > 0)
    assert.ok(f.where.length > 0)
    assert.ok(f.saw.length > 0)
    assert.ok(f.fix.length > 0)
  })

  test('fixable is false', () => {
    const f = formatRemovableWorktreesFinding(entries)
    assert.equal(f.fixable, false)
  })

  test('fix contains cleanup-stranded command', () => {
    const f = formatRemovableWorktreesFinding(entries)
    assert.ok(f.fix.includes('cleanup-stranded'))
  })

  test('saw lists each worktree branch and path', () => {
    const f = formatRemovableWorktreesFinding(entries)
    assert.ok(f.saw.includes('chore/wheelhouse-abc123'))
    assert.ok(f.saw.includes('/tmp/wt-one'))
    assert.ok(f.saw.includes('chore/wheelhouse-def456'))
    assert.ok(f.saw.includes('/tmp/wt-two'))
  })

  test('what includes the count', () => {
    const f = formatRemovableWorktreesFinding(entries)
    assert.ok(f.what.includes('2'))
  })
})
