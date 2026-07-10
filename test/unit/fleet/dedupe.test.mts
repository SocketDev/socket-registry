// vitest specs for the researching-recency near-duplicate collapser. Locks the
// trigram/token Jaccard math + the keep-earlier dedup behavior against the
// upstream last30days `dedupe.py` reference.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  dedupeItems,
  getNgrams,
  hybridSimilarity,
  itemText,
  jaccardSimilarity,
  normalizeText,
  tokenJaccard,
} from '../../../scripts/fleet/researching-recency/lib/dedupe.mts'

import type { SourceItem } from '../../../scripts/fleet/researching-recency/lib/types.mts'

function makeItem(over: Partial<SourceItem>): SourceItem {
  return {
    itemId: 'x',
    source: 'hackernews',
    title: '',
    body: '',
    url: 'https://example.test/x',
    engagement: {},
    snippet: '',
    metadata: {},
    ...over,
  }
}

// ── normalizeText ───────────────────────────────────────────────

test('normalizeText lowercases, strips punctuation, squeezes whitespace', () => {
  assert.equal(
    normalizeText('  Rolldown:  the  BUNDLER! '),
    'rolldown the bundler',
  )
})

// ── jaccardSimilarity ───────────────────────────────────────────

test('jaccardSimilarity is intersection over union, 0 on empty', () => {
  assert.equal(
    jaccardSimilarity(new Set(['a', 'b']), new Set(['b', 'c'])),
    1 / 3,
  )
  assert.equal(jaccardSimilarity(new Set(['a']), new Set(['a'])), 1)
  assert.equal(jaccardSimilarity(new Set(), new Set(['a'])), 0)
})

// ── getNgrams ───────────────────────────────────────────────────

test('getNgrams produces character trigrams of the normalized text', () => {
  assert.deepEqual([...getNgrams('abcd')], ['abc', 'bcd'])
})

test('getNgrams returns the whole token when shorter than n', () => {
  assert.deepEqual([...getNgrams('hi')], ['hi'])
})

// ── tokenJaccard / hybridSimilarity ─────────────────────────────

test('tokenJaccard ignores stopwords and single-char tokens', () => {
  // "the"/"is"/"a" are stopwords -> both reduce to {rolldown, fast}.
  assert.equal(tokenJaccard('the rolldown is fast', 'a rolldown is fast'), 1)
})

test('hybridSimilarity takes the max of trigram and token similarity', () => {
  const reordered = hybridSimilarity(
    'rolldown bundler fast',
    'fast bundler rolldown',
  )
  assert.ok(
    reordered >= 0.9,
    `reordered text should be near-identical, got ${reordered}`,
  )
  assert.equal(hybridSimilarity('rolldown', 'kubernetes networking'), 0)
})

// ── itemText ────────────────────────────────────────────────────

test('itemText concatenates title, body, author, container', () => {
  const item = makeItem({ title: 'T', body: 'B', author: 'A', container: 'C' })
  assert.equal(itemText(item), 'T B A C')
})

// ── dedupeItems ─────────────────────────────────────────────────

test('dedupeItems drops a near-duplicate and keeps the earlier item', () => {
  const items = [
    makeItem({
      itemId: 'first',
      title: 'Rolldown is the fastest bundler in 2026',
    }),
    makeItem({
      itemId: 'dup',
      title: 'Rolldown is the fastest bundler in 2026!',
    }),
    makeItem({ itemId: 'distinct', title: 'Kubernetes networking deep dive' }),
  ]
  const kept = dedupeItems(items)
  assert.deepEqual(
    kept.map(item => item.itemId),
    ['first', 'distinct'],
  )
})

test('dedupeItems passes through items with no dedup text', () => {
  const items = [
    makeItem({
      itemId: 'a',
      title: '',
      body: '',
      author: undefined,
      container: undefined,
    }),
    makeItem({
      itemId: 'b',
      title: '',
      body: '',
      author: undefined,
      container: undefined,
    }),
  ]
  assert.equal(dedupeItems(items).length, 2)
})

test('dedupeItems keeps distinct items below the threshold', () => {
  const items = [
    makeItem({ itemId: 'a', title: 'rust async runtime comparison' }),
    makeItem({ itemId: 'b', title: 'go generics tutorial walkthrough' }),
  ]
  assert.equal(dedupeItems(items).length, 2)
})
