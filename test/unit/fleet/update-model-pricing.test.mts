/**
 * @file Tests for the model-pricing reconciler's pure core: a per-service
 *   refresh restamps that service's snapshot and merges sourced prices without
 *   dropping unpriced models, losing model metadata, or disturbing other
 *   services; an unknown service throws; and the routing-doc marker restamp is
 *   a precise in-place edit.
 */

import { describe, expect, test } from 'vitest'

import type { PricingData } from '../../../scripts/fleet/estimate-ai-cost.mts'
import {
  applyPricingUpdate,
  readSourcedPrices,
  restampDocMarker,
} from '../../../scripts/fleet/update-model-pricing.mts'

const CURRENT: PricingData = {
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
      multipliers: { batch: 0.5, cacheRead: 0.1 },
      pricingSource: 'https://platform.claude.com/docs/en/about-claude/pricing',
      snapshot: '2026-06-14',
    },
    fireworks: {
      displayName: 'Fireworks AI',
      kind: 'metered-openai-compatible',
      models: {
        'accounts/fireworks/models/glm-5.2': {
          inputPerMtok: 1.4,
          outputPerMtok: 4.4,
        },
      },
      pricingSource: 'https://docs.fireworks.ai/serverless/pricing',
      snapshot: '2026-06-10',
    },
  },
  unit: 'per-Mtok',
}

describe('applyPricingUpdate', () => {
  test("restamps only the targeted service's snapshot", () => {
    const next = applyPricingUpdate(CURRENT, {
      date: '2026-07-01',
      prices: {},
      service: 'anthropic',
    })
    expect(next.services['anthropic']?.snapshot).toBe('2026-07-01')
    // The other service is untouched.
    expect(next.services['fireworks']?.snapshot).toBe('2026-06-10')
  })

  test('merges sourced prices over the targeted service, preserving metadata', () => {
    const next = applyPricingUpdate(CURRENT, {
      date: '2026-07-01',
      prices: { 'claude-opus-4-8': { inputPerMtok: 6, outputPerMtok: 30 } },
      service: 'anthropic',
    })
    // Rates updated; contextWindow (metadata not in the refresh) preserved.
    expect(next.services['anthropic']?.models['claude-opus-4-8']).toEqual({
      contextWindow: 1_000_000,
      inputPerMtok: 6,
      outputPerMtok: 30,
    })
  })

  test('a partial refresh keeps unpriced models, never drops them', () => {
    const next = applyPricingUpdate(CURRENT, {
      date: '2026-07-01',
      prices: { 'claude-opus-4-8': { inputPerMtok: 6, outputPerMtok: 30 } },
      service: 'anthropic',
    })
    expect(next.services['anthropic']?.models['claude-haiku-4-5']).toEqual(
      CURRENT.services['anthropic']?.models['claude-haiku-4-5'],
    )
    expect(Object.keys(next.services['anthropic']?.models ?? {})).toHaveLength(
      2,
    )
  })

  test('leaves the targeted service multipliers untouched', () => {
    const next = applyPricingUpdate(CURRENT, {
      date: '2026-07-01',
      prices: {},
      service: 'anthropic',
    })
    expect(next.services['anthropic']?.multipliers).toEqual(
      CURRENT.services['anthropic']?.multipliers,
    )
  })

  test("--source overrides the targeted service's pricingSource", () => {
    const next = applyPricingUpdate(CURRENT, {
      date: '2026-07-01',
      prices: {},
      service: 'fireworks',
      source: 'https://example.com/prices',
    })
    expect(next.services['fireworks']?.pricingSource).toBe(
      'https://example.com/prices',
    )
  })

  test('keeps the current pricingSource when none is given', () => {
    const next = applyPricingUpdate(CURRENT, {
      date: '2026-07-01',
      prices: {},
      service: 'anthropic',
    })
    expect(next.services['anthropic']?.pricingSource).toBe(
      CURRENT.services['anthropic']?.pricingSource,
    )
  })

  test('throws on an unknown service, naming the known set', () => {
    expect(() =>
      applyPricingUpdate(CURRENT, {
        date: '2026-07-01',
        prices: {},
        service: 'no-such-service',
      }),
    ).toThrow(/unknown service/)
  })

  test('--replace rewrites the models block wholesale, dropping renamed keys', () => {
    // The migration path: the dotted `glm-5.2` key is replaced by the canonical
    // `glm-5p2` id — a merge could never drop the old key.
    const next = applyPricingUpdate(CURRENT, {
      date: '2026-07-01',
      prices: {
        'accounts/fireworks/models/glm-5p2': {
          contextWindow: 1_000_000,
          inputPerMtok: 1.4,
          outputPerMtok: 4.4,
        },
      },
      replace: true,
      service: 'fireworks',
    })
    const models = next.services['fireworks']?.models ?? {}
    expect(Object.keys(models)).toStrictEqual([
      'accounts/fireworks/models/glm-5p2',
    ])
    expect(models['accounts/fireworks/models/glm-5.2']).toBeUndefined()
  })

  test('--aliases replaces the targeted service alias map', () => {
    const next = applyPricingUpdate(CURRENT, {
      aliases: { 'syn:large:text': 'hf:zai-org/GLM-5.1' },
      date: '2026-07-01',
      prices: {},
      service: 'fireworks',
    })
    expect(next.services['fireworks']?.aliases).toEqual({
      'syn:large:text': 'hf:zai-org/GLM-5.1',
    })
  })

  test('a normal (non-replace) refresh leaves the alias map absent when none is given', () => {
    const next = applyPricingUpdate(CURRENT, {
      date: '2026-07-01',
      prices: {},
      service: 'fireworks',
    })
    expect(next.services['fireworks']?.aliases).toBeUndefined()
  })
})

describe('restampDocMarker', () => {
  test('rewrites the snapshot marker date in place, keeping the note', () => {
    const doc =
      'x <!-- MODEL-PRICING-SNAPSHOT: 2026-06-11 -- machine anchor --> y'
    const out = restampDocMarker(doc, '2026-07-01')
    expect(out).toContain('MODEL-PRICING-SNAPSHOT: 2026-07-01')
    expect(out).toContain('-- machine anchor --')
  })

  test('leaves text without the marker unchanged', () => {
    expect(restampDocMarker('no marker here', '2026-07-01')).toBe(
      'no marker here',
    )
  })
})

describe('readSourcedPrices', () => {
  test('reads prices from the --prices flag', () => {
    const prices = readSourcedPrices(
      ['--prices', '{"x":{"inputPerMtok":1,"outputPerMtok":2}}'],
      '',
    )
    expect(prices['x']).toEqual({ inputPerMtok: 1, outputPerMtok: 2 })
  })

  test('falls back to stdin when --prices is absent', () => {
    const prices = readSourcedPrices(
      [],
      '{"y":{"inputPerMtok":3,"outputPerMtok":4}}',
    )
    expect(prices['y']).toEqual({ inputPerMtok: 3, outputPerMtok: 4 })
  })

  test('returns empty when neither flag nor stdin supplies prices', () => {
    expect(Object.keys(readSourcedPrices([], ''))).toHaveLength(0)
  })
})
