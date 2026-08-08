/**
 * @file Unit tests for the rankings generator's pure core: rank mapping from
 *   the three npm-high-impact lists, dash cells for uncharted overrides,
 *   headline arithmetic, and render determinism - all on synthetic data so
 *   the suite never depends on the real dataset's contents. The live check
 *   runs in `pnpm run check` and byte-compares the committed doc against the
 *   render; here its verdict paths are covered through the exported render.
 */

import { describe, expect, it } from 'vitest'

import { normalizeMarkdownTables } from '../../../../scripts/repo/check/npm-rankings-doc-is-current.mts'
import {
  collectOverrideRankings,
  renderHighImpactRankings,
} from '../../../../scripts/repo/npm/gen-high-impact-rankings.mts'

const DATA = {
  npmHighImpact: ['alpha', 'beta', 'gamma', 'delta'],
  npmTopDependents: ['beta', 'delta'],
  npmTopDownloads: ['alpha', 'beta', 'gamma'],
  version: '9.9.9',
}

describe('scripts/repo/npm/gen-high-impact-rankings', () => {
  it('maps 1-based ranks across all three lists', () => {
    const rows = collectOverrideRankings(DATA, ['beta', 'unlisted'])
    expect(rows).toEqual([
      { dependentsRank: 1, downloadsRank: 2, impactRank: 2, name: 'beta' },
      {
        dependentsRank: undefined,
        downloadsRank: undefined,
        impactRank: undefined,
        name: 'unlisted',
      },
    ])
  })

  it('renders headline counts and dash cells from the data', () => {
    const doc = renderHighImpactRankings(DATA, ['alpha', 'beta', 'unlisted'])
    expect(doc).toContain('npm-high-impact 9.9.9')
    expect(doc).toContain(
      '- 2 of 3 overrides (66.7%) appear in `npmHighImpact`.',
    )
    expect(doc).toContain('The highest-impact override is `alpha` at rank 1')
    expect(doc).toContain('| 1 | `alpha` | - |')
    expect(doc).toContain('| 2 | `beta` | 1 |')
    expect(doc).not.toContain('unlisted')
  })

  it('renders deterministically for the same inputs', () => {
    const names = ['gamma', 'alpha', 'beta']
    expect(renderHighImpactRankings(DATA, names)).toBe(
      renderHighImpactRankings(DATA, names),
    )
  })

  it('normalizes formatter-padded tables to compact form', () => {
    const padded = [
      '| Rank | Package |',
      '| --------------: | :------ |',
      '| 1    | `alpha` |',
      'prose | untouched',
    ].join('\n')
    expect(normalizeMarkdownTables(padded)).toBe(
      [
        '| Rank | Package |',
        '| ---: | :--- |',
        '| 1 | `alpha` |',
        'prose | untouched',
      ].join('\n'),
    )
  })
})
