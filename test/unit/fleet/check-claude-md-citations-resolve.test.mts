// vitest specs for the CLAUDE.md citation extractors. Focused on citedSkills —
// the `/fleet:<name>` skill-citation shape added so the Agents & skills bullets
// are verified to resolve to a real SKILL.md (they previously weren't checked).

import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  citedSkills,
  expandNames,
} from '../../../scripts/fleet/check/claude-md-citations-resolve.mts'

// ── citedSkills ─────────────────────────────────────────────────

test('citedSkills extracts /fleet:<name> citations, backticked or bare', () => {
  const md = [
    '- `/fleet:researching-recency` — recent dev research',
    '- `/fleet:scanning-quality` → report',
    'inline mention of /fleet:looping-quality in prose',
  ].join('\n')
  assert.deepEqual(citedSkills(md).toSorted(), [
    'looping-quality',
    'researching-recency',
    'scanning-quality',
  ])
})

test('citedSkills de-duplicates repeated citations', () => {
  const md = '`/fleet:scanning-quality` and again `/fleet:scanning-quality`'
  assert.deepEqual(citedSkills(md), ['scanning-quality'])
})

test('citedSkills returns nothing when no skill is cited', () => {
  assert.deepEqual(citedSkills('no skills here, just `socket/some-rule`'), [])
})

// ── expandNames (existing helper, sanity) ───────────────────────

test('expandNames expands a brace group and passes a bare name through', () => {
  assert.deepEqual(expandNames('{a,b,c}'), ['a', 'b', 'c'])
  assert.deepEqual(expandNames('foo'), ['foo'])
})
