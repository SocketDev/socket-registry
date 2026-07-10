/**
 * @file Unit tests for `scripts/fleet/auditing-history/lib/patch-id.mts` pure
 *   exports: `isRevertSubject`, `classifyAttribution`, `findUntaggedReverts`.
 *   No live git, no fs — all synthetic WindowCommit fixtures.
 */

import { describe, expect, it } from 'vitest'

import {
  classifyAttribution,
  findUntaggedReverts,
  isRevertSubject,
} from '../../../scripts/fleet/auditing-history/lib/patch-id.mts'

import type { WindowCommit } from '../../../scripts/fleet/auditing-history/lib/types.mts'

function commit(over: Partial<WindowCommit> & { sha: string }): WindowCommit {
  return {
    subject: 'feat: add thing',
    authorName: 'Dev',
    authorEmail: 'dev@example.com',
    when: '2026-06-01T10:00:00Z',
    isRevertTagged: false,
    patchId: undefined,
    ...over,
  }
}

// ---------------------------------------------------------------------------
// isRevertSubject
// ---------------------------------------------------------------------------

describe('isRevertSubject', () => {
  it('matches bare revert: prefix', () => {
    expect(isRevertSubject('revert: undo the cache reset')).toBe(true)
  })

  it('matches revert with scope', () => {
    expect(isRevertSubject('revert(cli): undo flag change')).toBe(true)
  })

  it('matches revert with breaking-change marker', () => {
    expect(isRevertSubject('revert!: undo public api')).toBe(true)
  })

  it('matches revert with scope and breaking-change marker', () => {
    expect(isRevertSubject('revert(api)!: undo endpoint')).toBe(true)
  })

  it('is case-insensitive on the type token', () => {
    expect(isRevertSubject('Revert: uppercase R')).toBe(true)
    expect(isRevertSubject('REVERT: all caps')).toBe(true)
  })

  it('matches when leading whitespace is present', () => {
    expect(isRevertSubject('  revert: leading spaces')).toBe(true)
  })

  it('does not match when revert appears mid-subject', () => {
    expect(isRevertSubject('fix: stop reverting cache')).toBe(false)
  })

  it('does not match feat/fix/chore types', () => {
    expect(isRevertSubject('feat: add revert button')).toBe(false)
    expect(isRevertSubject('chore: clean up')).toBe(false)
  })

  it('does not match empty string', () => {
    expect(isRevertSubject('')).toBe(false)
  })

  it('does not match revert without colon', () => {
    expect(isRevertSubject('revert the thing')).toBe(false)
  })

  it('does not match revert: missing a space or description after colon', () => {
    // The regex only checks for the colon — any trailing content is fine, even none
    expect(isRevertSubject('revert:')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// classifyAttribution
// ---------------------------------------------------------------------------

describe('classifyAttribution', () => {
  it('returns cross-author when emails differ', () => {
    const a = commit({ sha: 'a', authorEmail: 'alice@x' })
    const b = commit({ sha: 'b', authorEmail: 'bob@x' })
    expect(classifyAttribution(a, b)).toBe('cross-author')
  })

  it('returns same-session for same author within 6 hours', () => {
    const a = commit({ sha: 'a', when: '2026-06-01T10:00:00Z' })
    const b = commit({ sha: 'b', when: '2026-06-01T15:59:59Z' })
    expect(classifyAttribution(a, b)).toBe('same-session')
  })

  it('returns cross-session for same author beyond 6 hours', () => {
    const a = commit({ sha: 'a', when: '2026-06-01T10:00:00Z' })
    const b = commit({ sha: 'b', when: '2026-06-01T16:00:01Z' })
    expect(classifyAttribution(a, b)).toBe('cross-session')
  })

  it('returns cross-session for same author exactly at 6-hour boundary + 1ms', () => {
    const base = Date.parse('2026-06-01T10:00:00Z')
    const sixHoursMs = 6 * 60 * 60 * 1000
    const a = commit({ sha: 'a', when: new Date(base).toISOString() })
    const b = commit({
      sha: 'b',
      when: new Date(base + sixHoursMs + 1).toISOString(),
    })
    expect(classifyAttribution(a, b)).toBe('cross-session')
  })

  it('returns same-session when the gap is exactly 6 hours (not strictly greater)', () => {
    const base = Date.parse('2026-06-01T10:00:00Z')
    const sixHoursMs = 6 * 60 * 60 * 1000
    const a = commit({ sha: 'a', when: new Date(base).toISOString() })
    const b = commit({
      sha: 'b',
      when: new Date(base + sixHoursMs).toISOString(),
    })
    expect(classifyAttribution(a, b)).toBe('same-session')
  })

  it('gap is absolute — b before a gives same result as a before b', () => {
    const a = commit({ sha: 'a', when: '2026-06-02T10:00:00Z' })
    const b = commit({ sha: 'b', when: '2026-06-01T10:00:00Z' })
    // 24 hours apart, same author → cross-session
    expect(classifyAttribution(a, b)).toBe('cross-session')
  })

  it('same commit time (zero gap) → same-session', () => {
    const a = commit({ sha: 'a', when: '2026-06-01T10:00:00Z' })
    const b = commit({ sha: 'b', when: '2026-06-01T10:00:00Z' })
    expect(classifyAttribution(a, b)).toBe('same-session')
  })
})

// ---------------------------------------------------------------------------
// findUntaggedReverts
// ---------------------------------------------------------------------------

describe('findUntaggedReverts', () => {
  it('returns an empty array for an empty window', () => {
    expect(findUntaggedReverts([])).toHaveLength(0)
  })

  it('returns empty for a single commit', () => {
    expect(
      findUntaggedReverts([commit({ sha: 'a', patchId: 'P1' })]),
    ).toHaveLength(0)
  })

  it('flags an apply/undo pair that shares a patch-id and the undo is untagged', () => {
    const pairs = findUntaggedReverts([
      commit({ sha: 'apply', patchId: 'P1', subject: 'feat: flip flag' }),
      commit({ sha: 'undo', patchId: 'P1', subject: 'chore: tidy' }),
    ])
    expect(pairs).toHaveLength(1)
    expect(pairs[0]!.kind).toBe('untagged-revert')
    expect(pairs[0]!.original.sha).toBe('apply')
    expect(pairs[0]!.undo.sha).toBe('undo')
  })

  it('does NOT flag when the undo is revert-tagged', () => {
    const pairs = findUntaggedReverts([
      commit({ sha: 'apply', patchId: 'P1' }),
      commit({ sha: 'undo', patchId: 'P1', isRevertTagged: true }),
    ])
    expect(pairs).toHaveLength(0)
  })

  it('does not pair commits with different patch-ids', () => {
    expect(
      findUntaggedReverts([
        commit({ sha: 'a', patchId: 'P1' }),
        commit({ sha: 'b', patchId: 'P2' }),
      ]),
    ).toHaveLength(0)
  })

  it('ignores commits with no patchId', () => {
    expect(
      findUntaggedReverts([
        commit({ sha: 'a', patchId: undefined }),
        commit({ sha: 'b', patchId: undefined }),
      ]),
    ).toHaveLength(0)
  })

  it('ignores a commit with no patchId even when a matching one exists', () => {
    const pairs = findUntaggedReverts([
      commit({ sha: 'a', patchId: 'P1' }),
      commit({ sha: 'b', patchId: undefined }),
    ])
    expect(pairs).toHaveLength(0)
  })

  it('attaches cross-author attribution when emails differ', () => {
    const pairs = findUntaggedReverts([
      commit({ sha: 'a', patchId: 'P1', authorEmail: 'alice@x' }),
      commit({ sha: 'b', patchId: 'P1', authorEmail: 'bob@x' }),
    ])
    expect(pairs[0]!.attribution).toBe('cross-author')
  })

  it('attaches same-session attribution when same author, same day', () => {
    const pairs = findUntaggedReverts([
      commit({ sha: 'a', patchId: 'P1', when: '2026-06-01T10:00:00Z' }),
      commit({ sha: 'b', patchId: 'P1', when: '2026-06-01T11:00:00Z' }),
    ])
    expect(pairs[0]!.attribution).toBe('same-session')
  })

  it('attaches cross-session attribution when same author, next day', () => {
    const pairs = findUntaggedReverts([
      commit({ sha: 'a', patchId: 'P1', when: '2026-06-01T10:00:00Z' }),
      commit({ sha: 'b', patchId: 'P1', when: '2026-06-02T10:00:00Z' }),
    ])
    expect(pairs[0]!.attribution).toBe('cross-session')
  })

  it('re-arms on a third same-patch-id commit (apply, undo, re-apply)', () => {
    // apply+undo is one pair (consumed); re-apply has nothing to pair with.
    const pairs = findUntaggedReverts([
      commit({ sha: 'apply', patchId: 'P1' }),
      commit({ sha: 'undo', patchId: 'P1' }),
      commit({ sha: 'reapply', patchId: 'P1' }),
    ])
    expect(pairs).toHaveLength(1)
    expect(pairs[0]!.undo.sha).toBe('undo')
  })

  it('handles multiple independent patch-ids producing multiple pairs', () => {
    const pairs = findUntaggedReverts([
      commit({ sha: 'a1', patchId: 'PA' }),
      commit({ sha: 'b1', patchId: 'PB' }),
      commit({ sha: 'a2', patchId: 'PA' }),
      commit({ sha: 'b2', patchId: 'PB' }),
    ])
    expect(pairs).toHaveLength(2)
    const undoShas = pairs.map(p => p.undo.sha).toSorted()
    expect(undoShas).toEqual(['a2', 'b2'])
  })

  it('skips the pair when the tagged undo consumes the slot, leaving re-apply unpaired', () => {
    const pairs = findUntaggedReverts([
      commit({ sha: 'apply', patchId: 'P1' }),
      commit({ sha: 'tagged-undo', patchId: 'P1', isRevertTagged: true }),
      commit({ sha: 'reapply', patchId: 'P1' }),
    ])
    // tagged undo consumes apply→tagged-undo (no pair emitted); reapply then arms as pending
    expect(pairs).toHaveLength(0)
  })

  it('the pair object carries the full original and undo commit shapes', () => {
    const apply = commit({
      sha: 'apply',
      patchId: 'P1',
      subject: 'feat: original',
    })
    const undo = commit({
      sha: 'undo',
      patchId: 'P1',
      subject: 'chore: silent undo',
    })
    const pairs = findUntaggedReverts([apply, undo])
    expect(pairs[0]!.original).toEqual(apply)
    expect(pairs[0]!.undo).toEqual(undo)
  })
})
