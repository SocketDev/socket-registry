/**
 * @file Tests for the network currency leg — how far a pin trails its
 *   upstream's newest release, and the three ways currency can be unknown. The
 *   tag reader is injected, so nothing here touches the network.
 */

import { describe, expect, test } from 'vitest'

import { findNpmPortCurrencyProblems } from '../../../../../scripts/repo/check/npm-port-provenance/currency.mts'

import { makePins, makeRow, UPSTREAMS } from './fixtures.mts'

const rows = [makeRow()]
const pins = makePins()

describe('findNpmPortCurrencyProblems', () => {
  test('reports nothing when the pin is the newest release', async () => {
    await expect(
      findNpmPortCurrencyProblems(rows, UPSTREAMS, pins, {
        listTags: async () => ['v0.3.4', 'v0.3.5'],
      }),
    ).resolves.toEqual([])
  })

  test('reports how many releases the pin trails', async () => {
    const problems = await findNpmPortCurrencyProblems(rows, UPSTREAMS, pins, {
      listTags: async () => ['v0.3.5', 'v0.3.6', 'v0.4.0'],
    })
    expect(problems[0]?.what).toBe(
      "the pinned release trails the upstream's newest release.",
    )
    expect(problems[0]?.saw).toBe('pinned v0.3.5, 2 release(s) behind v0.4.0')
  })

  test('fails loudly when the upstream remote cannot be read', async () => {
    const problems = await findNpmPortCurrencyProblems(rows, UPSTREAMS, pins, {
      listTags: async () => {
        throw new Error('network unreachable')
      },
    })
    expect(problems[0]?.what).toBe(
      'the upstream release list could not be read, so currency is unknown.',
    )
    expect(problems[0]?.saw).toContain('network unreachable')
  })

  test('fails when the upstream publishes no release tags', async () => {
    const problems = await findNpmPortCurrencyProblems(rows, UPSTREAMS, pins, {
      listTags: async () => ['nightly'],
    })
    expect(problems[0]?.what).toBe(
      'the upstream publishes no release tags, so the pin cannot be release-anchored.',
    )
  })

  test('fails when the pinned tag is not one of the upstream releases', async () => {
    const problems = await findNpmPortCurrencyProblems(rows, UPSTREAMS, pins, {
      listTags: async () => ['v1.0.0'],
    })
    expect(problems[0]?.what).toBe(
      "the pinned tag is not among the upstream's release tags.",
    )
  })
})
