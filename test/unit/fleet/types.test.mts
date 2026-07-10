// vitest specs for the delegating-execution shared types.

import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import type { TierRoute } from '../../../scripts/fleet/lib/delegating-execution/types.mts'

// ── shared types ─────────────────────────────────────────────────────────────

describe('delegating-execution types', () => {
  test('TierRoute carries effort + model fields', () => {
    const r: TierRoute = { effort: 'high', model: 'claude-opus-4-8' }
    assert.equal(r.effort, 'high')
    assert.equal(r.model, 'claude-opus-4-8')
  })

  test('TierRoute effort may be undefined (Fable adaptive-only)', () => {
    const r: TierRoute = { effort: undefined, model: 'claude-fable-5' }
    assert.equal(r.effort, undefined)
    assert.equal(r.model, 'claude-fable-5')
  })
})
