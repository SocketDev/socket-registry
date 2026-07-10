// vitest specs for the shared honesty-filler matcher. It is the single source
// for reply-prose-nudge, convo-prose-nudge, and anti-prose-guard,
// so its coverage IS the contract those three enforce: a categorical bare-word
// ban plus the framing phrases and the "Frankly," opener.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  HONESTY_FRAMING_RE,
  HONESTY_LABEL,
  HONESTY_WHY,
  matchesHonestyFraming,
} from '../../../.claude/hooks/fleet/_shared/honesty-framing.mts'

test('matches the bare word in any inflection', () => {
  for (const text of [
    'Honestly the retries are too aggressive.',
    'an honest mistake',
    'in all honesty, it was slow',
  ]) {
    assert.ok(matchesHonestyFraming(text), text)
  }
})

test('matches the framing phrases', () => {
  for (const text of [
    'To be honest, this needed a refactor.',
    "if I'm honest, the cache was wrong",
    'the honest answer is no',
    'One honest residual (recorded, not papered over)',
  ]) {
    assert.ok(matchesHonestyFraming(text), text)
  }
})

test('matches a "Frankly," opener at line start', () => {
  assert.ok(matchesHonestyFraming('Frankly, the old path was slow.'))
  assert.ok(matchesHonestyFraming('done.\nFrankly, it was slow.'))
})

test('clean prose does not trip it', () => {
  for (const text of [
    'The cache stores parsed results keyed by input path.',
    'Fixes cache invalidation: key was mtime-based.',
    'frankly speaking, no comma to anchor the opener',
  ]) {
    assert.ok(!matchesHonestyFraming(text), text)
  }
})

test('exports a label and rationale for consumers to render', () => {
  assert.match(HONESTY_LABEL, /honesty framing/i)
  assert.match(HONESTY_WHY, /honest/i)
})

test('the matcher carries no global flag (safe to reuse via .test)', () => {
  assert.equal(HONESTY_FRAMING_RE.global, false)
  // A second call on the same regex must not be stateful.
  assert.ok(matchesHonestyFraming('honestly'))
  assert.ok(matchesHonestyFraming('honestly'))
})
