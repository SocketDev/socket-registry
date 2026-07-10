// Unit tests for scripts/fleet/_shared/git-porcelain.mts
// Focuses on parsePorcelain — the pure function that is hardest to get right
// and easiest to regress (leading-space status char survives, rename resolves).

import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import { parsePorcelain } from '../../../scripts/fleet/_shared/git-porcelain.mts'

describe('git-porcelain / parsePorcelain', () => {
  test('extracts status at columns 0–1 and path at column 3', () => {
    const entries = parsePorcelain('?? scripts/x.mts\n')
    assert.equal(entries.length, 1)
    assert.equal(entries[0]!.status, '??')
    assert.equal(entries[0]!.path, 'scripts/x.mts')
  })

  test('leading-space status char survives (worktree-modified)', () => {
    const entries = parsePorcelain(' M CLAUDE.md\n')
    assert.equal(entries.length, 1)
    assert.equal(entries[0]!.status, ' M')
    assert.equal(entries[0]!.path, 'CLAUDE.md')
  })

  test('leading-space status on first line survives multi-line output', () => {
    const entries = parsePorcelain(' M CLAUDE.md\n?? scripts/x.mts\n')
    assert.equal(entries.length, 2)
    assert.equal(entries[0]!.status, ' M')
    assert.equal(entries[0]!.path, 'CLAUDE.md')
    assert.equal(entries[1]!.status, '??')
    assert.equal(entries[1]!.path, 'scripts/x.mts')
  })

  test('rename entry resolves to the new path', () => {
    const entries = parsePorcelain('R  old/a.mts -> new/b.mts\n')
    assert.equal(entries.length, 1)
    assert.equal(entries[0]!.status, 'R ')
    assert.equal(entries[0]!.path, 'new/b.mts')
  })

  test('blank lines are skipped', () => {
    assert.equal(parsePorcelain('\n\n').length, 0)
  })

  test('empty string returns empty array', () => {
    assert.equal(parsePorcelain('').length, 0)
  })

  test('staged + unstaged (MM) entry', () => {
    const entries = parsePorcelain('MM src/index.mts\n')
    assert.equal(entries.length, 1)
    assert.equal(entries[0]!.status, 'MM')
    assert.equal(entries[0]!.path, 'src/index.mts')
  })

  test('untracked file', () => {
    const entries = parsePorcelain('?? new-file.mts\n')
    assert.equal(entries[0]!.status, '??')
    assert.equal(entries[0]!.path, 'new-file.mts')
  })
})
