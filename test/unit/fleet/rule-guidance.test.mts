/**
 * @file Tests for the pure exports of rule-guidance.mts: the data constants
 *   and the `escalateTier` escalation function. All assertions are
 *   self-contained — no fs, no network, no spawning.
 */

import { describe, expect, test } from 'vitest'

import {
  AI_HANDLED_RULES,
  escalateTier,
  RULE_GUIDANCE,
  RULE_MODEL_TIER,
  TIER_EFFORT,
  TIER_MODEL,
} from '../../../scripts/fleet/ai-lint-fix/rule-guidance.mts'

describe('AI_HANDLED_RULES', () => {
  test('is a non-empty Set', () => {
    expect(AI_HANDLED_RULES).toBeInstanceOf(Set)
    expect(AI_HANDLED_RULES.size).toBeGreaterThan(0)
  })

  test('contains known rules', () => {
    expect(AI_HANDLED_RULES.has('socket/max-file-lines')).toBe(true)
    expect(AI_HANDLED_RULES.has('socket/prefer-async-spawn')).toBe(true)
    expect(AI_HANDLED_RULES.has('socket/no-fetch-prefer-http-request')).toBe(
      true,
    )
    expect(AI_HANDLED_RULES.has('socket/prefer-undefined-over-null')).toBe(true)
  })

  test('does not contain an unknown rule', () => {
    expect(AI_HANDLED_RULES.has('socket/no-such-rule')).toBe(false)
  })
})

describe('RULE_MODEL_TIER', () => {
  test('every AI_HANDLED_RULES entry has a tier', () => {
    for (const rule of AI_HANDLED_RULES) {
      expect(RULE_MODEL_TIER[rule], `missing tier for ${rule}`).toMatch(
        /^(?:haiku|sonnet|opus)$/,
      )
    }
  })

  test('max-file-lines is opus (module decomposition)', () => {
    expect(RULE_MODEL_TIER['socket/max-file-lines']).toBe('opus')
  })

  test('prefer-async-spawn is sonnet (caller-chain rewrite)', () => {
    expect(RULE_MODEL_TIER['socket/prefer-async-spawn']).toBe('sonnet')
  })

  test('inclusive-language is haiku (identifier rename)', () => {
    expect(RULE_MODEL_TIER['socket/inclusive-language']).toBe('haiku')
  })

  test('no rule has an unknown tier value', () => {
    const valid = new Set(['haiku', 'opus', 'sonnet'])
    for (const [rule, tier] of Object.entries(RULE_MODEL_TIER)) {
      expect(
        valid.has(tier as string),
        `unexpected tier "${tier}" for ${rule}`,
      ).toBe(true)
    }
  })
})

describe('TIER_MODEL', () => {
  test('maps all three tiers to a model string', () => {
    expect(typeof TIER_MODEL['haiku']).toBe('string')
    expect(typeof TIER_MODEL['sonnet']).toBe('string')
    expect(typeof TIER_MODEL['opus']).toBe('string')
  })

  test('haiku maps to claude-haiku-4-5', () => {
    expect(TIER_MODEL['haiku']).toBe('claude-haiku-4-5')
  })

  test('sonnet maps to claude-sonnet-4-6', () => {
    expect(TIER_MODEL['sonnet']).toBe('claude-sonnet-4-6')
  })

  test('opus maps to claude-opus-4-8', () => {
    expect(TIER_MODEL['opus']).toBe('claude-opus-4-8')
  })
})

describe('TIER_EFFORT', () => {
  test('maps all three tiers to an effort string', () => {
    expect(typeof TIER_EFFORT['haiku']).toBe('string')
    expect(typeof TIER_EFFORT['sonnet']).toBe('string')
    expect(typeof TIER_EFFORT['opus']).toBe('string')
  })

  test('haiku effort is low', () => {
    expect(TIER_EFFORT['haiku']).toBe('low')
  })

  test('sonnet effort is medium', () => {
    expect(TIER_EFFORT['sonnet']).toBe('medium')
  })

  test('opus effort is high', () => {
    expect(TIER_EFFORT['opus']).toBe('high')
  })
})

describe('RULE_GUIDANCE', () => {
  test('is a non-empty object', () => {
    expect(typeof RULE_GUIDANCE).toBe('object')
    expect(Object.keys(RULE_GUIDANCE).length).toBeGreaterThan(0)
  })

  test('every AI_HANDLED_RULES entry has a guidance string', () => {
    for (const rule of AI_HANDLED_RULES) {
      expect(typeof RULE_GUIDANCE[rule], `missing guidance for ${rule}`).toBe(
        'string',
      )
      expect(
        RULE_GUIDANCE[rule]!.length,
        `empty guidance for ${rule}`,
      ).toBeGreaterThan(0)
    }
  })

  test('max-file-lines guidance mentions splitting', () => {
    expect(RULE_GUIDANCE['socket/max-file-lines']).toContain('Split')
  })

  test('prefer-undefined-over-null guidance mentions type annotation', () => {
    expect(RULE_GUIDANCE['socket/prefer-undefined-over-null']).toContain(
      'annotation',
    )
  })

  test('no-malformed-bypass-marker guidance mentions reason', () => {
    expect(RULE_GUIDANCE['socket/no-malformed-bypass-marker']).toContain(
      'reason',
    )
  })
})

describe('escalateTier', () => {
  test('empty array returns sonnet (no-rules default)', () => {
    expect(escalateTier([])).toBe('sonnet')
  })

  test('all-unrecognized rules returns sonnet (historical default)', () => {
    expect(escalateTier(['unknown/rule', 'another/unknown'])).toBe('sonnet')
  })

  test('single haiku rule returns haiku', () => {
    expect(escalateTier(['socket/inclusive-language'])).toBe('haiku')
  })

  test('single sonnet rule returns sonnet', () => {
    expect(escalateTier(['socket/prefer-async-spawn'])).toBe('sonnet')
  })

  test('single opus rule returns opus immediately', () => {
    expect(escalateTier(['socket/max-file-lines'])).toBe('opus')
  })

  test('haiku + sonnet mix escalates to sonnet', () => {
    expect(
      escalateTier(['socket/inclusive-language', 'socket/prefer-async-spawn']),
    ).toBe('sonnet')
  })

  test('haiku + opus mix escalates to opus', () => {
    expect(
      escalateTier(['socket/inclusive-language', 'socket/max-file-lines']),
    ).toBe('opus')
  })

  test('sonnet + opus mix escalates to opus', () => {
    expect(
      escalateTier(['socket/prefer-async-spawn', 'socket/max-file-lines']),
    ).toBe('opus')
  })

  test('opus short-circuits — remaining rules after opus are skipped', () => {
    // opus is first; the function should return 'opus' immediately.
    expect(
      escalateTier([
        'socket/max-file-lines',
        'socket/inclusive-language',
        'socket/prefer-async-spawn',
      ]),
    ).toBe('opus')
  })

  test('mixed known + unknown rules uses known tier only', () => {
    expect(escalateTier(['unknown/rule', 'socket/inclusive-language'])).toBe(
      'haiku',
    )
  })

  test('order does not matter for haiku vs sonnet escalation', () => {
    const asc = escalateTier([
      'socket/inclusive-language',
      'socket/prefer-async-spawn',
    ])
    const desc = escalateTier([
      'socket/prefer-async-spawn',
      'socket/inclusive-language',
    ])
    expect(asc).toBe('sonnet')
    expect(desc).toBe('sonnet')
  })

  test('all haiku rules stay at haiku', () => {
    expect(
      escalateTier([
        'socket/inclusive-language',
        'socket/no-malformed-bypass-marker',
        'socket/no-namespace-import',
        'socket/no-placeholders',
        'socket/personal-path-placeholders',
        'socket/prefer-node-builtin-imports',
        'socket/prefer-undefined-over-null',
      ]),
    ).toBe('haiku')
  })

  test('duplicate rules do not change the result', () => {
    expect(
      escalateTier([
        'socket/inclusive-language',
        'socket/inclusive-language',
        'socket/inclusive-language',
      ]),
    ).toBe('haiku')
  })
})
