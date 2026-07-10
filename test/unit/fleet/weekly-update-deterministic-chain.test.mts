// socket-lint: mirror-exempt — deferred rename to deterministic-chain.test.mts (pending review)
// vitest specs for the weekly-update deterministic chain's pure helpers:
// resolveLockstepManifestPath (root vs .config/ lockup), parseLockstepReport
// (the --json drift-report extractor), and noteSubmoduleRemainder (the explicit
// step-2 skip note). The chain's mutating steps shell out to real tools and are
// integration-level.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  noteSubmoduleRemainder,
  parseLockstepReport,
  resolveLockstepManifestPath,
} from '../../../scripts/fleet/weekly-update/deterministic-chain.mts'

test('resolveLockstepManifestPath returns undefined when no manifest exists', () => {
  // A throwaway path with neither lockstep.json nor .config/lockstep.json.
  assert.equal(
    resolveLockstepManifestPath('/nonexistent-repo-root-xyz'),
    undefined,
  )
})

test('parseLockstepReport extracts the reports array from --json output', () => {
  const stdout = [
    'lockstep: checking…',
    '{"reports":[{"id":"x","kind":"version-pin","severity":"behind"}]}',
  ].join('\n')
  const reports = parseLockstepReport(stdout)
  assert.ok(reports)
  assert.equal(reports!.length, 1)
  assert.equal(reports![0]!.id, 'x')
})

test('parseLockstepReport returns undefined when there is no JSON object', () => {
  assert.equal(parseLockstepReport('no json here'), undefined)
})

test('parseLockstepReport returns undefined on malformed JSON', () => {
  assert.equal(parseLockstepReport('{ not valid json'), undefined)
})

test('noteSubmoduleRemainder always returns an ok step with a note', () => {
  const step = noteSubmoduleRemainder()
  assert.equal(step.name, 'submodules')
  assert.equal(step.ok, true)
  assert.ok(typeof step.note === 'string' && step.note.length > 0)
})
