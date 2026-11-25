import { describe, expect, it } from 'vitest'

import { resolveNodeEntry } from '../../../scripts/npm/floor-node-smoke.mts'

describe('scripts/npm/floor-node-smoke', () => {
  it('resolves a direct string entry', () => {
    expect(resolveNodeEntry('./index.js')).toBe('./index.js')
  })

  it('prefers node conditions and descends through nested conditions', () => {
    expect(
      resolveNodeEntry({
        import: './generic.js',
        node: { import: './node.mjs' },
        default: './fallback.js',
      }),
    ).toBe('./node.mjs')
  })

  it('uses the next supported condition when node is absent', () => {
    expect(resolveNodeEntry({ require: './index.cjs' })).toBe('./index.cjs')
  })

  it('returns undefined when there is no resolvable entry', () => {
    expect(resolveNodeEntry(undefined)).toBeUndefined()
    expect(resolveNodeEntry({ types: './index.d.ts' })).toBeUndefined()
  })
})
