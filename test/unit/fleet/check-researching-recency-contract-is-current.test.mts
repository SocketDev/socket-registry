// vitest specs for the researching-recency contract check. Verifies it flags a
// SKILL.md that drops an engine output marker, passes one that quotes them all,
// and skips gracefully when the SKILL.md is absent (a downstream repo that
// hasn't taken the skill).

import assert from 'node:assert/strict'

import { test } from 'vitest'

import { checkContract } from '../../../scripts/fleet/check/researching-recency-contract-is-current.mts'
import { CONTRACT_MARKERS } from '../../../scripts/fleet/researching-recency/lib/markers.mts'

// A SKILL.md body that quotes every contract marker.
const COMPLETE = CONTRACT_MARKERS.join('\n\n')

test('passes when the SKILL.md quotes every engine marker', () => {
  const result = checkContract(COMPLETE)
  assert.equal(result.skillFound, true)
  assert.deepEqual(result.missing, [])
})

test('flags each marker the SKILL.md drops', () => {
  // Quote all but the first marker.
  const partial = CONTRACT_MARKERS.slice(1).join('\n\n')
  const result = checkContract(partial)
  assert.equal(result.skillFound, true)
  assert.deepEqual(result.missing, [CONTRACT_MARKERS[0]])
})

test('reports every missing marker, not just the first', () => {
  const result = checkContract('nothing relevant here')
  assert.equal(result.missing.length, CONTRACT_MARKERS.length)
})

test('skips gracefully when the SKILL.md is absent', () => {
  const result = checkContract(undefined)
  assert.equal(result.skillFound, false)
  assert.deepEqual(result.missing, [])
})
