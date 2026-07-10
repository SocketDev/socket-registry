/**
 * @file Tests for the AI cost estimator's pure calculator. The headline check
 *   reproduces the vendor pricing page's own worked example, so a future
 *   pricing-data edit that breaks the math is caught. v2 pricing is
 *   per-service: the fixture carries a metered first-party service (anthropic)
 *   plus a flat-rate, plan-billed one (synthetic) to exercise cross-service
 *   resolution.
 */

import { describe, expect, test } from 'vitest'

import {
  daysOld,
  EFFORT_OUTPUT_MULTIPLIER,
  estimateCost,
  findModelPricing,
  WORKLOAD_PROFILES,
} from '../../../scripts/fleet/estimate-ai-cost.mts'
import type { PricingData } from '../../../scripts/fleet/estimate-ai-cost.mts'

// A v2 fixture mirroring the vendor numbers (so the test doesn't depend on the
// committed JSON's exact snapshot). anthropic = metered per-token; synthetic =
// flat-rate plan-billed (no per-token price), plus an alias.
const PRICING: PricingData = {
  currency: 'USD',
  schemaVersion: 2,
  services: {
    anthropic: {
      displayName: 'Anthropic / Claude',
      kind: 'first-party',
      models: {
        'claude-haiku-4-5': {
          contextWindow: 200_000,
          inputPerMtok: 1.0,
          outputPerMtok: 5.0,
        },
        'claude-opus-4-8': {
          contextWindow: 1_000_000,
          inputPerMtok: 5.0,
          outputPerMtok: 25.0,
        },
      },
      multipliers: {
        batch: 0.5,
        cacheRead: 0.1,
        cacheWrite1h: 2.0,
        cacheWrite5m: 1.25,
      },
      pricingSource: 'https://platform.claude.com/docs/en/about-claude/pricing',
      snapshot: '2026-06-14',
    },
    synthetic: {
      aliases: { 'syn:large:text': 'hf:zai-org/GLM-5.2' },
      displayName: 'Synthetic',
      kind: 'flat-rate-openai-compatible',
      models: {
        'hf:zai-org/GLM-5.2': { billing: 'plan', contextWindow: 512_000 },
      },
      pricingSource: 'https://synthetic.new/pricing',
      snapshot: '2026-06-20',
    },
  },
  unit: 'per-Mtok',
}

describe('estimateCost', () => {
  test("matches the vendor's worked example (Opus 50k in / 15k out = $0.625)", () => {
    const r = estimateCost(PRICING, {
      inputTokens: 50_000,
      model: 'claude-opus-4-8',
      outputTokens: 15_000,
    })
    expect(r.usd).toBeCloseTo(0.625, 6)
    expect(r.inputUsd).toBeCloseTo(0.25, 6)
    expect(r.outputUsd).toBeCloseTo(0.375, 6)
    expect(r.service).toBe('anthropic')
  })

  test('haiku weekly-update profile is cents, not the 1500 cap', () => {
    // 80k in × $1/Mtok + 12k out × $5/Mtok = $0.08 + $0.06 = $0.14
    const r = estimateCost(PRICING, {
      inputTokens: 80_000,
      model: 'claude-haiku-4-5',
      outputTokens: 12_000,
    })
    expect(r.usd).toBeCloseTo(0.14, 6)
  })

  test('--batch halves the cost (Batch API 50%)', () => {
    const r = estimateCost(PRICING, {
      batch: true,
      inputTokens: 50_000,
      model: 'claude-opus-4-8',
      outputTokens: 15_000,
    })
    expect(r.usd).toBeCloseTo(0.3125, 6)
  })

  test('cache-read tokens bill at 0.1x input', () => {
    // 50k in, 40k of it cache-read: 10k×$5 + 40k×$5×0.1 = 0.05 + 0.02 = $0.07 input
    const r = estimateCost(PRICING, {
      cacheReadTokens: 40_000,
      inputTokens: 50_000,
      model: 'claude-opus-4-8',
      outputTokens: 0,
    })
    expect(r.inputUsd).toBeCloseTo(0.07, 6)
  })

  test('unknown model throws naming the known set', () => {
    expect(() =>
      estimateCost(PRICING, {
        inputTokens: 1,
        model: 'no-such-model',
        outputTokens: 1,
      }),
    ).toThrow(/unknown model/)
  })

  test('a plan-billed model (no per-token price) throws, not a $0 estimate', () => {
    expect(() =>
      estimateCost(PRICING, {
        inputTokens: 1000,
        model: 'hf:zai-org/GLM-5.2',
        outputTokens: 1000,
      }),
    ).toThrow(/plan-billed/)
  })
})

describe('findModelPricing', () => {
  test('resolves a model in any service and reports the owning service', () => {
    const found = findModelPricing(PRICING, 'claude-opus-4-8')
    expect(found?.service).toBe('anthropic')
    expect(found?.model.inputPerMtok).toBe(5.0)
  })

  test('resolves a flat-rate model in a non-first service', () => {
    const found = findModelPricing(PRICING, 'hf:zai-org/GLM-5.2')
    expect(found?.service).toBe('synthetic')
    expect(found?.model.billing).toBe('plan')
  })

  test('resolves an alias to its target model', () => {
    const found = findModelPricing(PRICING, 'syn:large:text')
    expect(found?.service).toBe('synthetic')
    expect(found?.model.contextWindow).toBe(512_000)
  })

  test('resolves a <service>/<model> prefix form', () => {
    const found = findModelPricing(PRICING, 'anthropic/claude-haiku-4-5')
    expect(found?.service).toBe('anthropic')
    expect(found?.model.outputPerMtok).toBe(5.0)
  })

  test('returns undefined for an unknown model', () => {
    expect(findModelPricing(PRICING, 'no-such-model')).toBeUndefined()
  })
})

describe('daysOld', () => {
  test('counts whole days from snapshot to now', () => {
    expect(daysOld('2026-06-14', new Date('2026-06-14T00:00:00Z'))).toBe(0)
    expect(daysOld('2026-06-14', new Date('2026-06-24T12:00:00Z'))).toBe(10)
  })
})

describe('profiles + effort', () => {
  test('the gh-aw workloads have profiles', () => {
    expect(WORKLOAD_PROFILES['weekly-update']).toBeDefined()
    expect(WORKLOAD_PROFILES['fix-test-failures']).toBeDefined()
  })

  test('effort scales output (low < medium < high < xhigh)', () => {
    expect(EFFORT_OUTPUT_MULTIPLIER['low']!).toBeLessThan(
      EFFORT_OUTPUT_MULTIPLIER['medium']!,
    )
    expect(EFFORT_OUTPUT_MULTIPLIER['high']!).toBeLessThan(
      EFFORT_OUTPUT_MULTIPLIER['xhigh']!,
    )
  })
})
