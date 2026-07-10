// socket-lint: mirror-exempt — deferred rename to patch-id.test.mts (pending review)
/**
 * @file Unit tests for the auditing-history untagged-revert detector (the
 *   load-bearing, near-zero- false-positive signal). Drives the pure functions
 *   directly against synthetic WindowCommit[] — no live git, fully
 *   deterministic.
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
    subject: 'feat: x',
    authorName: 'A',
    authorEmail: 'a@example.com',
    when: '2026-06-08T01:00:00Z',
    isRevertTagged: false,
    patchId: undefined,
    ...over,
  }
}

describe('auditing-history isRevertSubject', () => {
  it('matches revert: / revert(scope): / revert!:', () => {
    expect(isRevertSubject('revert: undo the thing')).toBe(true)
    expect(isRevertSubject('revert(cli): undo')).toBe(true)
    expect(isRevertSubject('revert!: undo')).toBe(true)
    expect(isRevertSubject('  Revert: case-insensitive')).toBe(true)
  })
  it('does not match a normal subject mentioning revert', () => {
    expect(isRevertSubject('fix: stop reverting the cache')).toBe(false)
    expect(isRevertSubject('feat: add revert button')).toBe(false)
  })
})

describe('auditing-history classifyAttribution', () => {
  it('cross-author when emails differ', () => {
    const a = commit({ sha: 'a', authorEmail: 'a@x' })
    const b = commit({ sha: 'b', authorEmail: 'b@x' })
    expect(classifyAttribution(a, b)).toBe('cross-author')
  })
  it('same-session for one author within a few hours', () => {
    const a = commit({ sha: 'a', when: '2026-06-08T01:00:00Z' })
    const b = commit({ sha: 'b', when: '2026-06-08T02:00:00Z' })
    expect(classifyAttribution(a, b)).toBe('same-session')
  })
  it('cross-session for one author far apart', () => {
    const a = commit({ sha: 'a', when: '2026-06-08T01:00:00Z' })
    const b = commit({ sha: 'b', when: '2026-06-09T01:00:00Z' })
    expect(classifyAttribution(a, b)).toBe('cross-session')
  })
})

describe('auditing-history findUntaggedReverts', () => {
  it('flags an apply/undo pair sharing a patch-id when the undo is not revert-tagged', () => {
    const pairs = findUntaggedReverts([
      commit({ sha: 'apply', patchId: 'P1', subject: 'feat: set flag' }),
      commit({ sha: 'undo', patchId: 'P1', subject: 'chore: tidy' }),
    ])
    expect(pairs).toHaveLength(1)
    expect(pairs[0]!.original.sha).toBe('apply')
    expect(pairs[0]!.undo.sha).toBe('undo')
  })

  it('does NOT flag when the undo IS revert-tagged (intentional)', () => {
    expect(
      findUntaggedReverts([
        commit({ sha: 'apply', patchId: 'P1' }),
        commit({ sha: 'undo', patchId: 'P1', isRevertTagged: true }),
      ]),
    ).toHaveLength(0)
  })

  it('does NOT pair commits with different patch-ids', () => {
    expect(
      findUntaggedReverts([
        commit({ sha: 'a', patchId: 'P1' }),
        commit({ sha: 'b', patchId: 'P2' }),
      ]),
    ).toHaveLength(0)
  })

  it('ignores commits with no patch-id (empty/unparseable diff)', () => {
    expect(
      findUntaggedReverts([
        commit({ sha: 'a', patchId: undefined }),
        commit({ sha: 'b', patchId: undefined }),
      ]),
    ).toHaveLength(0)
  })

  it('carries attribution onto the pair (cross-author)', () => {
    const pairs = findUntaggedReverts([
      commit({ sha: 'a', patchId: 'P1', authorEmail: 'a@x' }),
      commit({ sha: 'b', patchId: 'P1', authorEmail: 'b@x' }),
    ])
    expect(pairs[0]!.attribution).toBe('cross-author')
  })

  it('re-arms on a third same-patch-id commit (apply, undo, re-apply)', () => {
    // apply→undo is one pair; a third re-apply has nothing to pair with (the pair was consumed).
    const pairs = findUntaggedReverts([
      commit({ sha: 'apply', patchId: 'P1' }),
      commit({ sha: 'undo', patchId: 'P1' }),
      commit({ sha: 'reapply', patchId: 'P1' }),
    ])
    expect(pairs).toHaveLength(1)
    expect(pairs[0]!.undo.sha).toBe('undo')
  })
})
