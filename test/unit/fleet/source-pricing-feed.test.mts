/**
 * @file Tests for the pricing feed-sourcing helper's pure plan builder. The
 *   strongest check runs the plan through the researching-recency engine's own
 *   `validatePlan`, so a malformed plan (bad label, unknown source) is caught
 *   without any network call.
 */

import { describe, expect, test } from 'vitest'

import { validatePlan } from '../../../scripts/fleet/researching-recency/lib/plan.mts'
import { buildPricingPlan } from '../../../scripts/fleet/source-pricing-feed.mts'

import type { ServiceEntry } from '../../../scripts/fleet/estimate-ai-cost.mts'

const SERVICE: ServiceEntry = {
  displayName: 'Fireworks AI',
  kind: 'metered-openai-compatible',
  models: {},
  pricingSource: 'https://docs.fireworks.ai/serverless/pricing',
  snapshot: '2026-06-20',
}

describe('buildPricingPlan', () => {
  test('produces a plan the engine validator accepts', () => {
    const plan = buildPricingPlan('fireworks', SERVICE)
    expect(() => validatePlan(plan, plan.rawTopic)).not.toThrow()
  })

  test('uses slug labels (no spaces) and non-empty source lists', () => {
    const plan = buildPricingPlan('fireworks', SERVICE)
    expect(plan.subqueries.length).toBeGreaterThan(0)
    for (const subquery of plan.subqueries) {
      expect(subquery.label).not.toMatch(/\s/)
      expect(subquery.sources.length).toBeGreaterThan(0)
    }
  })

  test('cross-checks against the vendor pricing source in its notes', () => {
    const plan = buildPricingPlan('fireworks', SERVICE)
    expect(plan.notes.join(' ')).toContain(SERVICE.pricingSource)
  })

  test('mentions the service display name in the topic', () => {
    const plan = buildPricingPlan('synthetic', {
      ...SERVICE,
      displayName: 'Synthetic',
    })
    expect(plan.rawTopic).toContain('Synthetic')
  })
})
