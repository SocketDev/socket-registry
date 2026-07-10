// vitest specs for the delegating-execution tier routing.

import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import {
  MECHANICAL_PHASES,
  MECHANICAL_ROUTE,
  PHASES,
  routeTierForTask,
  SENSITIVITIES,
  TIER_TABLE,
} from '../../../scripts/fleet/lib/delegating-execution/route.mts'

// ── routeTierForTask — full phase × sensitivity matrix ──────────────────────

describe('routeTierForTask — full phase × sensitivity matrix', () => {
  const expected: Record<
    string,
    Record<string, { effort: string | undefined; model: string }>
  > = {
    execute: {
      benign: { effort: 'medium', model: 'claude-sonnet-4-6' },
      security: { effort: 'medium', model: 'claude-sonnet-4-6' },
    },
    followup: {
      benign: { effort: 'medium', model: 'claude-sonnet-4-6' },
      security: { effort: 'medium', model: 'claude-sonnet-4-6' },
    },
    plan: {
      benign: { effort: undefined, model: 'claude-fable-5' },
      security: { effort: 'high', model: 'claude-opus-4-8' },
    },
    review: {
      benign: { effort: undefined, model: 'claude-fable-5' },
      security: { effort: 'high', model: 'claude-opus-4-8' },
    },
  }

  for (const phase of PHASES) {
    for (const sensitivity of SENSITIVITIES) {
      test(`${phase}/${sensitivity}`, () => {
        const route = routeTierForTask({ phase, sensitivity })
        assert.deepEqual(route, expected[phase]![sensitivity]!)
      })
    }
  }

  test('plan/benign → Fable with undefined effort', () => {
    const route = routeTierForTask({ phase: 'plan', sensitivity: 'benign' })
    assert.deepEqual(route, { effort: undefined, model: 'claude-fable-5' })
  })

  test('review/benign → Fable with undefined effort', () => {
    const route = routeTierForTask({ phase: 'review', sensitivity: 'benign' })
    assert.deepEqual(route, { effort: undefined, model: 'claude-fable-5' })
  })

  test('plan/security → Opus 4.8 directly', () => {
    const route = routeTierForTask({ phase: 'plan', sensitivity: 'security' })
    assert.deepEqual(route, { effort: 'high', model: 'claude-opus-4-8' })
  })

  test('review/security → Opus 4.8 directly', () => {
    const route = routeTierForTask({ phase: 'review', sensitivity: 'security' })
    assert.deepEqual(route, { effort: 'high', model: 'claude-opus-4-8' })
  })

  test('execute/benign → sonnet/medium floor', () => {
    const route = routeTierForTask({ phase: 'execute', sensitivity: 'benign' })
    assert.deepEqual(route, { effort: 'medium', model: 'claude-sonnet-4-6' })
  })

  test('execute/security → sonnet/medium floor', () => {
    const route = routeTierForTask({
      phase: 'execute',
      sensitivity: 'security',
    })
    assert.deepEqual(route, { effort: 'medium', model: 'claude-sonnet-4-6' })
  })

  test('followup/benign → sonnet/medium floor', () => {
    const route = routeTierForTask({ phase: 'followup', sensitivity: 'benign' })
    assert.deepEqual(route, { effort: 'medium', model: 'claude-sonnet-4-6' })
  })

  test('followup/security → sonnet/medium floor', () => {
    const route = routeTierForTask({
      phase: 'followup',
      sensitivity: 'security',
    })
    assert.deepEqual(route, { effort: 'medium', model: 'claude-sonnet-4-6' })
  })
})

// ── routeTierForTask — validation ────────────────────────────────────────────

describe('routeTierForTask — validation', () => {
  test('throws on unknown phase with Fix: in message', () => {
    assert.throws(
      () =>
        routeTierForTask({ phase: 'unknown' as 'plan', sensitivity: 'benign' }),
      (err: unknown) => {
        assert.ok(err instanceof Error)
        assert.ok(
          err.message.includes('Fix:'),
          `expected Fix: in: ${err.message}`,
        )
        return true
      },
    )
  })

  test('throws on unknown sensitivity with Fix: in message', () => {
    assert.throws(
      () =>
        routeTierForTask({ phase: 'plan', sensitivity: 'unknown' as 'benign' }),
      (err: unknown) => {
        assert.ok(err instanceof Error)
        assert.ok(
          err.message.includes('Fix:'),
          `expected Fix: in: ${err.message}`,
        )
        return true
      },
    )
  })
})

// ── routeTierForTask — mechanical flag ───────────────────────────────────────

describe('routeTierForTask — mechanical flag', () => {
  test('MECHANICAL_ROUTE is the haiku/low floor', () => {
    assert.deepEqual(MECHANICAL_ROUTE, {
      effort: 'low',
      model: 'claude-haiku-4-5',
    })
  })

  test('MECHANICAL_PHASES is ASCII-sorted and covers only execute/followup', () => {
    assert.deepEqual([...MECHANICAL_PHASES], ['execute', 'followup'])
  })

  for (const phase of ['execute', 'followup'] as const) {
    for (const sensitivity of SENSITIVITIES) {
      test(`mechanical downgrades ${phase}/${sensitivity} to the floor`, () => {
        const route = routeTierForTask({ mechanical: true, phase, sensitivity })
        assert.deepEqual(route, MECHANICAL_ROUTE)
      })
    }
  }

  for (const phase of ['plan', 'review'] as const) {
    test(`mechanical is ignored for ${phase} (apex judgment tier)`, () => {
      const withFlag = routeTierForTask({
        mechanical: true,
        phase,
        sensitivity: 'security',
      })
      const without = routeTierForTask({ phase, sensitivity: 'security' })
      assert.deepEqual(withFlag, without)
    })
  }

  test('mechanical:false is the same as omitting it', () => {
    assert.deepEqual(
      routeTierForTask({
        mechanical: false,
        phase: 'execute',
        sensitivity: 'benign',
      }),
      routeTierForTask({ phase: 'execute', sensitivity: 'benign' }),
    )
  })
})

// ── exported const arrays ────────────────────────────────────────────────────

describe('exported const arrays', () => {
  test('PHASES is ASCII-sorted and complete', () => {
    assert.deepEqual([...PHASES], ['execute', 'followup', 'plan', 'review'])
  })

  test('SENSITIVITIES is ASCII-sorted and complete', () => {
    assert.deepEqual([...SENSITIVITIES], ['benign', 'security'])
  })

  test('TIER_TABLE phase keys match PHASES', () => {
    assert.deepEqual(Object.keys(TIER_TABLE).toSorted(), [...PHASES])
  })

  test('every TIER_TABLE row has exactly SENSITIVITIES as keys', () => {
    for (const phase of PHASES) {
      assert.deepEqual(Object.keys(TIER_TABLE[phase]).toSorted(), [
        ...SENSITIVITIES,
      ])
    }
  })
})
