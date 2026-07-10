// vitest specs for check-hooks-have-no-guard-nudge-overlap.

import { test } from 'vitest'
import assert from 'node:assert/strict'

import {
  findOverlap,
  sharedPrefixSegments,
} from '../../../scripts/fleet/check/hooks-have-no-guard-nudge-overlap.mts'

test('sharedPrefixSegments counts the common leading run', () => {
  assert.equal(
    sharedPrefixSegments(['claude', 'md', 'size'], ['claude', 'md', 'prefer']),
    2,
  )
  assert.equal(sharedPrefixSegments(['path'], ['path', 'regex', 'x']), 1)
  assert.equal(sharedPrefixSegments(['a', 'b'], ['x', 'y']), 0)
})

test('flags an exact base-name collision as an error', () => {
  // Synthetic pair — real hook names get rewritten by rename sweeps, which
  // silently breaks the fixture (a guard base must EQUAL the nudge base).
  const { exactCollisions } = findOverlap([
    'sample-topic-guard',
    'sample-topic-nudge',
  ])
  assert.deepEqual(exactCollisions, ['sample-topic'])
})

test('no collision when only a guard or only a nudge exists', () => {
  const { exactCollisions } = findOverlap([
    'anti-prose-guard',
    'reply-prose-nudge',
  ])
  assert.equal(exactCollisions.length, 0)
})

test('a 2-segment shared prefix is an advisory pair, not an error', () => {
  const report = findOverlap([
    'claude-md-size-guard',
    'claude-md-defer-detail-nudge',
  ])
  assert.equal(report.exactCollisions.length, 0)
  assert.equal(report.prefixPairs.length, 1)
  assert.equal(report.prefixPairs[0]!.prefix, 'claude-md')
})

test('a single shared segment is NOT flagged (too coarse)', () => {
  // path-guard / path-regex-normalize-nudge share only "path".
  const { prefixPairs } = findOverlap([
    'path-guard',
    'path-regex-normalize-nudge',
  ])
  assert.equal(prefixPairs.length, 0)
})

test('an exact collision is not also reported as a prefix pair', () => {
  const { exactCollisions, prefixPairs } = findOverlap([
    'foo-bar-guard',
    'foo-bar-nudge',
  ])
  assert.deepEqual(exactCollisions, ['foo-bar'])
  assert.equal(prefixPairs.length, 0)
})

test('ignores non-guard/nudge hook names', () => {
  const report = findOverlap([
    'setup-firewall',
    'headroom-proxy-start',
    'sweep-ds-store',
  ])
  assert.equal(report.exactCollisions.length, 0)
  assert.equal(report.prefixPairs.length, 0)
})
