// vitest specs for _shared/scripts/fleet-roster.mts — the single canonical
// owner of the fleet roster path + reader (four sibling libs re-export it).

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'

import {
  FLEET_REPOS_FILE,
  readRoster,
} from '../../../.claude/skills/fleet/_shared/scripts/fleet-roster.mts'

describe('FLEET_REPOS_FILE', () => {
  test('points at the canonical cascading-fleet roster file', () => {
    assert.ok(
      FLEET_REPOS_FILE.endsWith('cascading-fleet/lib/fleet-repos.txt'),
      `expected the path to end at cascading-fleet/lib/fleet-repos.txt, saw ${FLEET_REPOS_FILE}`,
    )
  })
})

describe('readRoster', () => {
  test('returns the non-empty fleet roster in file order', () => {
    const roster = readRoster()
    assert.ok(roster.length > 0, 'roster should not be empty')
    // The grouping convention: socket-* members first (alphabetically), so the
    // first entry is a socket-* repo and the bare-prefix members come later.
    assert.ok(
      roster[0]!.startsWith('socket-'),
      `expected the first roster entry to be a socket-* member, saw ${roster[0]}`,
    )
  })

  test('drops blank lines and # comments', () => {
    const roster = readRoster()
    for (const entry of roster) {
      assert.notEqual(entry, '', 'no blank entries')
      assert.ok(!entry.startsWith('#'), `no comment entries, saw ${entry}`)
      assert.equal(entry, entry.trim(), `entries are trimmed, saw "${entry}"`)
    }
  })

  test('preserves the deliberate three-tier grouping (no sort)', () => {
    const roster = readRoster()
    // socket-wheelhouse, when present, is the dogfooding source and sorts last
    // by convention — a naive alpha sort would hoist it into the socket-* block.
    const wheelhouseIdx = roster.indexOf('socket-wheelhouse')
    if (wheelhouseIdx !== -1) {
      assert.equal(
        wheelhouseIdx,
        roster.length - 1,
        'socket-wheelhouse is last by the grouping convention',
      )
    }
  })
})
