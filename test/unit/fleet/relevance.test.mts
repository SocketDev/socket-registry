// vitest specs for the researching-recency relevance scorer. Locks the
// token-overlap math + synonym expansion against the upstream last30days
// `relevance.py` reference so a refactor can't silently drift the ranking.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  LOW_SIGNAL_QUERY_TOKENS,
  normalizePhrase,
  prepareQuery,
  STOPWORDS,
  SYNONYMS,
  tokenize,
  tokenOverlapRelevance,
} from '../../../scripts/fleet/researching-recency/lib/relevance.mts'

// ── tokenize ────────────────────────────────────────────────────

test('tokenize lowercases, strips punctuation, drops stopwords + 1-char tokens', () => {
  assert.deepEqual([...tokenize('The Rolldown, a JS bundler!')].toSorted(), [
    'bundler',
    'javascript',
    'js',
    'rolldown',
  ])
})

test('tokenize expands programming synonyms bidirectionally', () => {
  assert.deepEqual([...tokenize('typescript')].toSorted(), ['ts', 'typescript'])
  assert.deepEqual([...tokenize('ts')].toSorted(), ['ts', 'typescript'])
  assert.deepEqual([...tokenize('react')].toSorted(), ['react', 'reactjs'])
})

test('tokenize drops single-char tokens and pure stopwords', () => {
  assert.equal(tokenize('a b c').size, 0)
  assert.equal(tokenize('the and with').size, 0)
})

test('tokenize is safe on Object.prototype key names (no synonym lookup poisoning)', () => {
  // "constructor"/"toString"/"valueOf" must not resolve to prototype members
  // during synonym expansion — they should just tokenize as plain words.
  const tokens = tokenize('the constructor calls toString and valueOf')
  assert.ok(tokens.has('constructor'))
  assert.ok(tokens.has('tostring'))
  assert.ok(tokens.has('valueof'))
})

// ── normalizePhrase ─────────────────────────────────────────────

test('normalizePhrase collapses punctuation + whitespace runs', () => {
  assert.equal(
    normalizePhrase('  Rolldown:  the   bundler! '),
    'rolldown the bundler',
  )
})

// ── prepareQuery ────────────────────────────────────────────────

test('prepareQuery separates informative from low-signal tokens', () => {
  const prepared = prepareQuery('rolldown review')
  assert.ok(prepared.informativeQueryTokens.has('rolldown'))
  assert.ok(!prepared.informativeQueryTokens.has('review'))
})

test('prepareQuery falls back to all tokens when query is all low-signal', () => {
  const prepared = prepareQuery('review guide tips')
  // The informative set would be empty -> falls back to the full token set.
  assert.equal(prepared.informativeQueryTokens.size, prepared.queryTokens.size)
})

// ── tokenOverlapRelevance ───────────────────────────────────────

test('exact multi-word phrase match scores at the ceiling', () => {
  assert.equal(
    tokenOverlapRelevance(
      'rolldown bundler',
      'rolldown bundler is fast and modern',
    ),
    1,
  )
})

test('generic-token-only match is capped at 0.24', () => {
  assert.equal(
    tokenOverlapRelevance('rolldown review', 'this is a great review'),
    0.24,
  )
})

test('zero token overlap scores 0', () => {
  assert.equal(
    tokenOverlapRelevance('rolldown', 'completely unrelated text'),
    0,
  )
})

test('empty / stopword-only query returns the 0.5 neutral fallback', () => {
  assert.equal(tokenOverlapRelevance('the a an', 'anything at all'), 0.5)
})

test('synonym bridge: a "js" query matches "javascript" text', () => {
  assert.equal(tokenOverlapRelevance('js', 'javascript tooling roundup'), 0.9)
})

test('concatenated hashtag matches a query token', () => {
  const score = tokenOverlapRelevance('claude', 'a post', ['claudecode'])
  assert.ok(score > 0, `expected hashtag-split match, got ${score}`)
})

test('a PreparedQuery and its raw string score identically', () => {
  const text = 'rolldown bundler benchmark'
  assert.equal(
    tokenOverlapRelevance('rolldown bundler', text),
    tokenOverlapRelevance(prepareQuery('rolldown bundler'), text),
  )
})

// ── exported tables (sanity) ────────────────────────────────────

test('synonym + stopword tables are populated', () => {
  assert.ok(STOPWORDS.has('the'))
  assert.ok(LOW_SIGNAL_QUERY_TOKENS.has('review'))
  assert.deepEqual(SYNONYMS['typescript'], ['ts'])
})
