// vitest specs for the codify-guidance surface/tier/model/effort constants and tierFor().

import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import {
  CODIFY_SURFACES,
  SURFACE_GUIDANCE,
  SURFACE_TIER,
  TIER_EFFORT,
  TIER_MODEL,
  tierFor,
} from '../../../scripts/fleet/ai-codify/codify-guidance.mts'

// ── CODIFY_SURFACES ──────────────────────────────────────────────────────────

describe('CODIFY_SURFACES', () => {
  test('is a ReadonlySet with the five known surface names', () => {
    assert.ok(CODIFY_SURFACES instanceof Set)
    assert.deepEqual([...CODIFY_SURFACES].toSorted(), [
      'agents-doc',
      'check',
      'hook-guard',
      'hook-nudge',
      'lint-rule',
    ])
  })

  test('has() returns true for every surface', () => {
    for (const s of [
      'agents-doc',
      'check',
      'hook-guard',
      'hook-nudge',
      'lint-rule',
    ] as const) {
      assert.ok(
        CODIFY_SURFACES.has(s),
        `expected ${s} to be in CODIFY_SURFACES`,
      )
    }
  })

  test('has() returns false for an unknown string', () => {
    assert.ok(!CODIFY_SURFACES.has('unknown' as 'check'))
  })
})

// ── SURFACE_TIER ─────────────────────────────────────────────────────────────

describe('SURFACE_TIER', () => {
  test('agents-doc → sonnet', () => {
    assert.equal(SURFACE_TIER['agents-doc'], 'sonnet')
  })

  test('check → sonnet', () => {
    assert.equal(SURFACE_TIER['check'], 'sonnet')
  })

  test('hook-guard → opus', () => {
    assert.equal(SURFACE_TIER['hook-guard'], 'opus')
  })

  test('hook-nudge → opus', () => {
    assert.equal(SURFACE_TIER['hook-nudge'], 'opus')
  })

  test('lint-rule → opus', () => {
    assert.equal(SURFACE_TIER['lint-rule'], 'opus')
  })

  test('every CODIFY_SURFACES entry has a SURFACE_TIER entry', () => {
    for (const s of CODIFY_SURFACES) {
      assert.ok(
        SURFACE_TIER[s] !== undefined,
        `SURFACE_TIER missing entry for surface: ${s}`,
      )
    }
  })
})

// ── TIER_MODEL ───────────────────────────────────────────────────────────────

describe('TIER_MODEL', () => {
  test('haiku → claude-haiku-4-5', () => {
    assert.equal(TIER_MODEL['haiku'], 'claude-haiku-4-5')
  })

  test('sonnet → claude-sonnet-4-6', () => {
    assert.equal(TIER_MODEL['sonnet'], 'claude-sonnet-4-6')
  })

  test('opus → claude-opus-4-8', () => {
    assert.equal(TIER_MODEL['opus'], 'claude-opus-4-8')
  })

  test('has exactly three tier keys', () => {
    assert.deepEqual(Object.keys(TIER_MODEL).toSorted(), [
      'haiku',
      'opus',
      'sonnet',
    ])
  })
})

// ── TIER_EFFORT ──────────────────────────────────────────────────────────────

describe('TIER_EFFORT', () => {
  test('haiku → low', () => {
    assert.equal(TIER_EFFORT['haiku'], 'low')
  })

  test('sonnet → medium', () => {
    assert.equal(TIER_EFFORT['sonnet'], 'medium')
  })

  test('opus → high', () => {
    assert.equal(TIER_EFFORT['opus'], 'high')
  })

  test('has exactly three tier keys', () => {
    assert.deepEqual(Object.keys(TIER_EFFORT).toSorted(), [
      'haiku',
      'opus',
      'sonnet',
    ])
  })
})

// ── tierFor ──────────────────────────────────────────────────────────────────

describe('tierFor', () => {
  test('agents-doc → { tier: sonnet, model: claude-sonnet-4-6, effort: medium }', () => {
    assert.deepEqual(tierFor('agents-doc'), {
      effort: 'medium',
      model: 'claude-sonnet-4-6',
      tier: 'sonnet',
    })
  })

  test('check → { tier: sonnet, model: claude-sonnet-4-6, effort: medium }', () => {
    assert.deepEqual(tierFor('check'), {
      effort: 'medium',
      model: 'claude-sonnet-4-6',
      tier: 'sonnet',
    })
  })

  test('hook-guard → { tier: opus, model: claude-opus-4-8, effort: high }', () => {
    assert.deepEqual(tierFor('hook-guard'), {
      effort: 'high',
      model: 'claude-opus-4-8',
      tier: 'opus',
    })
  })

  test('hook-nudge → { tier: opus, model: claude-opus-4-8, effort: high }', () => {
    assert.deepEqual(tierFor('hook-nudge'), {
      effort: 'high',
      model: 'claude-opus-4-8',
      tier: 'opus',
    })
  })

  test('lint-rule → { tier: opus, model: claude-opus-4-8, effort: high }', () => {
    assert.deepEqual(tierFor('lint-rule'), {
      effort: 'high',
      model: 'claude-opus-4-8',
      tier: 'opus',
    })
  })

  test('unknown surface falls back to sonnet tier', () => {
    // The source comment says: "Unknown surface → sonnet (the historical default)"
    const result = tierFor('unknown' as 'check')
    assert.deepEqual(result, {
      effort: 'medium',
      model: 'claude-sonnet-4-6',
      tier: 'sonnet',
    })
  })

  test('every CODIFY_SURFACES surface resolves consistently with SURFACE_TIER + TIER_MODEL + TIER_EFFORT', () => {
    for (const s of CODIFY_SURFACES) {
      const { effort, model, tier } = tierFor(s)
      assert.equal(tier, SURFACE_TIER[s])
      assert.equal(model, TIER_MODEL[tier])
      assert.equal(effort, TIER_EFFORT[tier])
    }
  })
})

// ── SURFACE_GUIDANCE ─────────────────────────────────────────────────────────

describe('SURFACE_GUIDANCE', () => {
  test('every CODIFY_SURFACES entry has a non-empty guidance string', () => {
    for (const s of CODIFY_SURFACES) {
      const g = SURFACE_GUIDANCE[s]
      assert.ok(
        typeof g === 'string' && g.length > 0,
        `SURFACE_GUIDANCE[${s}] is empty or missing`,
      )
    }
  })

  test('agents-doc guidance tells the agent to stop and report (routing guard text)', () => {
    assert.ok(
      SURFACE_GUIDANCE['agents-doc'].includes('stop and report'),
      'agents-doc guidance should contain "stop and report"',
    )
  })

  test('check guidance references the assertion naming convention', () => {
    assert.ok(
      SURFACE_GUIDANCE['check'].includes('<thing>-is-<property>'),
      'check guidance should contain the assertion naming pattern',
    )
  })

  test('hook-guard guidance mentions BLOCKING', () => {
    assert.ok(
      SURFACE_GUIDANCE['hook-guard'].includes('BLOCKING'),
      'hook-guard guidance should mention BLOCKING',
    )
  })

  test('hook-nudge guidance says exit 0 always', () => {
    assert.ok(
      SURFACE_GUIDANCE['hook-nudge'].includes('exits 0'),
      'hook-nudge guidance should mention exits 0',
    )
  })

  test('lint-rule guidance mentions "error" default', () => {
    assert.ok(
      SURFACE_GUIDANCE['lint-rule'].includes('"error"'),
      'lint-rule guidance should reference "error" default',
    )
  })

  test('no guidance string is undefined', () => {
    for (const s of CODIFY_SURFACES) {
      assert.notEqual(SURFACE_GUIDANCE[s], undefined)
    }
  })
})
