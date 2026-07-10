// vitest specs for scripts/fleet/lib/doctor/stranded-cascade-gap.mts

import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import {
  detectStrandedCascade,
  formatStrandedCascadeFinding,
  parseStrandedOutput,
} from '../../../scripts/fleet/lib/doctor/stranded-cascade-gap.mts'

// ── parseStrandedOutput ───────────────────────────────────────────────────────

describe('parseStrandedOutput', () => {
  test('returns empty report for "no stranded artifacts found" output', () => {
    const out = 'no stranded cascade artifacts found.\n'
    const r = parseStrandedOutput(out)
    assert.deepEqual(r.strandedCommits, [])
    assert.deepEqual(r.strandedWorktrees, [])
    assert.equal(r.bailReason, undefined)
  })

  test('returns empty report for dry-run nothing-applied output', () => {
    const out = '[socket-repo] --dry-run: nothing applied.\n'
    const r = parseStrandedOutput(out)
    assert.deepEqual(r.strandedCommits, [])
    assert.deepEqual(r.strandedWorktrees, [])
    assert.equal(r.bailReason, undefined)
  })

  test('captures stranded commits from dry-run output', () => {
    const out = [
      '[socket-repo] stranded local commits (1):',
      '  abc123def456  chore(wheelhouse): cascade template@aabbccdd',
      '[socket-repo] --dry-run: nothing applied.',
    ].join('\n')
    const r = parseStrandedOutput(out)
    assert.equal(r.strandedCommits.length, 1)
    assert.ok(r.strandedCommits[0]?.includes('abc123def456'))
    assert.ok(r.strandedCommits[0]?.includes('chore(wheelhouse)'))
    assert.deepEqual(r.strandedWorktrees, [])
    assert.equal(r.bailReason, undefined)
  })

  test('captures stranded worktrees from dry-run output', () => {
    const out = [
      '[socket-repo] stranded worktrees (1):',
      '  chore/wheelhouse-abc123  /tmp/wt-one',
      '[socket-repo] --dry-run: nothing applied.',
    ].join('\n')
    const r = parseStrandedOutput(out)
    assert.deepEqual(r.strandedCommits, [])
    assert.equal(r.strandedWorktrees.length, 1)
    assert.ok(r.strandedWorktrees[0]?.includes('chore/wheelhouse-abc123'))
    assert.equal(r.bailReason, undefined)
  })

  test('captures both commits and worktrees', () => {
    const out = [
      '[socket-repo] stranded local commits (2):',
      '  abc123def456  chore(wheelhouse): cascade template@aabbccdd',
      '  fedcba654321  chore(wheelhouse): cascade template@eeff0011',
      '[socket-repo] stranded worktrees (1):',
      '  chore/wheelhouse-abc123  /tmp/wt-one',
      '[socket-repo] --dry-run: nothing applied.',
    ].join('\n')
    const r = parseStrandedOutput(out)
    assert.equal(r.strandedCommits.length, 2)
    assert.equal(r.strandedWorktrees.length, 1)
    assert.equal(r.bailReason, undefined)
  })

  test('captures bail reason', () => {
    const out =
      '[socket-repo] not cleaning up: commit abc123 authored by user@example.com (not in trusted set)\n'
    const r = parseStrandedOutput(out)
    assert.deepEqual(r.strandedCommits, [])
    assert.deepEqual(r.strandedWorktrees, [])
    assert.ok(r.bailReason?.includes('not in trusted set'))
  })

  test('returns empty report for empty output', () => {
    const r = parseStrandedOutput('')
    assert.deepEqual(r.strandedCommits, [])
    assert.deepEqual(r.strandedWorktrees, [])
    assert.equal(r.bailReason, undefined)
  })

  // Real logger output: getDefaultLogger() prepends `ℹ ` (info) or `⚠ ` (warn)
  // followed by ANSI colour codes. The parser must strip the prefix so that
  // regexes match and `saw` entries are free of glyph noise.

  test('handles logger-prefixed info lines (commits section)', () => {
    // Simulates raw logger output with glyph prefix on every line.
    const out = [
      'ℹ [socket-repo] stranded local commits (1):',
      'ℹ   abc123def456  chore(wheelhouse): cascade template@aabbccdd',
      'ℹ [socket-repo] --dry-run: nothing applied.',
    ].join('\n')
    const r = parseStrandedOutput(out)
    assert.equal(r.strandedCommits.length, 1)
    assert.ok(r.strandedCommits[0]?.includes('abc123def456'))
    assert.ok(r.strandedCommits[0]?.includes('chore(wheelhouse)'))
    assert.ok(!r.strandedCommits[0]?.startsWith('ℹ'), 'glyph stripped from saw')
    assert.deepEqual(r.strandedWorktrees, [])
    assert.equal(r.bailReason, undefined)
  })

  test('handles logger-prefixed warn lines (bail case)', () => {
    const out =
      '⚠ [socket-repo] not cleaning up: commit abc123 authored by user@example.com (not in trusted set)'
    const r = parseStrandedOutput(out)
    assert.deepEqual(r.strandedCommits, [])
    assert.deepEqual(r.strandedWorktrees, [])
    assert.ok(r.bailReason?.includes('not in trusted set'))
  })

  test('handles logger-prefixed worktrees section', () => {
    const out = [
      'ℹ [socket-repo] stranded worktrees (1):',
      'ℹ   chore/wheelhouse-abc123  /tmp/wt-one',
      'ℹ [socket-repo] --dry-run: nothing applied.',
    ].join('\n')
    const r = parseStrandedOutput(out)
    assert.deepEqual(r.strandedCommits, [])
    assert.equal(r.strandedWorktrees.length, 1)
    assert.ok(r.strandedWorktrees[0]?.includes('chore/wheelhouse-abc123'))
    assert.ok(
      !r.strandedWorktrees[0]?.startsWith('ℹ'),
      'glyph stripped from saw',
    )
  })

  test('handles logger-prefixed nothing-found line', () => {
    const out = 'ℹ no stranded cascade artifacts found.'
    const r = parseStrandedOutput(out)
    assert.deepEqual(r.strandedCommits, [])
    assert.deepEqual(r.strandedWorktrees, [])
    assert.equal(r.bailReason, undefined)
  })

  test('handles ANSI-coloured logger output (commits)', () => {
    // Simulate ANSI-coded output: \x1b[94mℹ\x1b[39m prefix.
    const ansiInfo = '\x1b[94mℹ\x1b[39m'
    const out = [
      `${ansiInfo} [socket-repo] stranded local commits (1):`,
      `${ansiInfo}   abc123def456  chore(wheelhouse): cascade template@aabbccdd`,
      `${ansiInfo} [socket-repo] --dry-run: nothing applied.`,
    ].join('\n')
    const r = parseStrandedOutput(out)
    assert.equal(r.strandedCommits.length, 1)
    assert.ok(r.strandedCommits[0]?.includes('abc123def456'))
  })
})

// ── detectStrandedCascade ─────────────────────────────────────────────────────

describe('detectStrandedCascade', () => {
  test('returns undefined when no artifacts found', () => {
    const out = 'no stranded cascade artifacts found.\n'
    assert.equal(detectStrandedCascade(out), undefined)
  })

  test('returns undefined when nothing applied (dry-run clean run)', () => {
    const out = '[socket-repo] --dry-run: nothing applied.\n'
    assert.equal(detectStrandedCascade(out), undefined)
  })

  test('returns undefined when bailed (non-cascade commits present)', () => {
    const out =
      '[socket-repo] not cleaning up: non-cascade commit abc123 present locally\n'
    assert.equal(detectStrandedCascade(out), undefined)
  })

  test('returns a finding when stranded commits are detected', () => {
    const out = [
      '[socket-repo] stranded local commits (1):',
      '  abc123def456  chore(wheelhouse): cascade template@aabbccdd',
      '[socket-repo] --dry-run: nothing applied.',
    ].join('\n')
    const f = detectStrandedCascade(out)
    assert.ok(f, 'should produce a finding')
    assert.equal(f.fixable, false)
  })

  test('returns a finding when stranded worktrees are detected', () => {
    const out = [
      '[socket-repo] stranded worktrees (1):',
      '  chore/wheelhouse-abc123  /tmp/wt-one',
      '[socket-repo] --dry-run: nothing applied.',
    ].join('\n')
    const f = detectStrandedCascade(out)
    assert.ok(f)
    assert.equal(f.fixable, false)
  })
})

// ── formatStrandedCascadeFinding ──────────────────────────────────────────────

describe('formatStrandedCascadeFinding', () => {
  test('all four finding ingredients are non-empty for commits-only', () => {
    const f = formatStrandedCascadeFinding({
      bailReason: undefined,
      strandedCommits: ['abc123def456  chore(wheelhouse): cascade template@aa'],
      strandedWorktrees: [],
    })
    assert.ok(f.what.length > 0)
    assert.ok(f.where.length > 0)
    assert.ok(f.saw.length > 0)
    assert.ok(f.fix.length > 0)
  })

  test('fixable is false', () => {
    const f = formatStrandedCascadeFinding({
      bailReason: undefined,
      strandedCommits: ['abc123'],
      strandedWorktrees: [],
    })
    assert.equal(f.fixable, false)
  })

  test('fix contains cleanup-stranded bare invocation (apply mode) and --dry-run preview', () => {
    const f = formatStrandedCascadeFinding({
      bailReason: undefined,
      strandedCommits: ['abc123'],
      strandedWorktrees: [],
    })
    assert.ok(f.fix.includes('cleanup-stranded'))
    assert.ok(f.fix.includes('--dry-run'), 'dry-run preview present')
    assert.ok(
      f.fix.includes('--target .') && !f.fix.includes('--apply'),
      'bare apply invocation present; no spurious --apply flag',
    )
  })

  test('what includes commit and worktree counts', () => {
    const f = formatStrandedCascadeFinding({
      bailReason: undefined,
      strandedCommits: ['abc123', 'def456'],
      strandedWorktrees: ['wt-one'],
    })
    assert.ok(f.what.includes('2'))
    assert.ok(f.what.includes('1'))
  })

  test('saw includes commit entries', () => {
    const f = formatStrandedCascadeFinding({
      bailReason: undefined,
      strandedCommits: ['abc123def456  chore(wheelhouse): cascade template@aa'],
      strandedWorktrees: [],
    })
    assert.ok(f.saw.includes('abc123def456'))
  })

  test('saw includes worktree entries', () => {
    const f = formatStrandedCascadeFinding({
      bailReason: undefined,
      strandedCommits: [],
      strandedWorktrees: ['chore/wheelhouse-abc123  /tmp/wt-one'],
    })
    assert.ok(f.saw.includes('chore/wheelhouse-abc123'))
    assert.ok(f.saw.includes('/tmp/wt-one'))
  })

  test('all four ingredients non-empty for worktrees-only', () => {
    const f = formatStrandedCascadeFinding({
      bailReason: undefined,
      strandedCommits: [],
      strandedWorktrees: ['chore/wheelhouse-abc  /tmp/wt'],
    })
    assert.ok(f.what.length > 0)
    assert.ok(f.where.length > 0)
    assert.ok(f.saw.length > 0)
    assert.ok(f.fix.length > 0)
  })
})
