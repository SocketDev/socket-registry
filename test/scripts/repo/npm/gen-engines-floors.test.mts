/**
 * @file Unit tests for the BCD-driven engines floor detector's pure core:
 *   syntax and builtin detection with real compat data, the typeof guard,
 *   comment stripping, and the instance-member rule that ignores names any
 *   ES5-era builtin owns while counting post-ES5 ones at their max owner
 *   version.
 */

import { describe, expect, it } from 'vitest'

import {
  detectFileFeatures,
  stripComments,
} from '../../../../scripts/repo/npm/gen-engines-floors.mts'

function floorOf(source: string): string {
  let floor = '0.0.0'
  for (const f of detectFileFeatures(source)) {
    if (
      !f.guarded &&
      f.version.localeCompare(floor, 'en', { numeric: true }) > 0
    ) {
      floor = f.version
    }
  }
  return floor
}

describe('scripts/repo/npm/gen-engines-floors', () => {
  it('strips comments so prose never raises the floor', () => {
    const src = stripComments(
      '// async Float16Array\n/* AggregateError */\nvar x = 1\n',
    )
    expect(src).not.toContain('async')
    expect(src).not.toContain('Float16Array')
    expect(detectFileFeatures('// uses Float16Array\nvar x = 1\n')).toEqual([])
  })

  it('detects bare globals through BCD', () => {
    const features = detectFileFeatures('module.exports = AggregateError\n')
    const agg = features.find(f => f.feature === 'AggregateError')
    expect(agg?.guarded).toBe(false)
    expect(agg?.version).toBe('15.0.0')
  })

  it('counts a typeof-probed feature as guarded', () => {
    const features = detectFileFeatures(
      "const HAS = typeof Float16Array === 'function'\nmodule.exports = HAS ? Float16Array : undefined\n",
    )
    const f16 = features.find(f => f.feature === 'Float16Array')
    expect(f16?.guarded).toBe(true)
  })

  it('detects static members through BCD', () => {
    const features = detectFileFeatures('module.exports = Object.hasOwn\n')
    const hasOwn = features.find(f => f.feature === 'Object.hasOwn')
    expect(hasOwn?.version).toBe('16.9.0')
  })

  it('ignores instance members any ES5 builtin owns', () => {
    expect(
      detectFileFeatures('var y = x.filter(Boolean).map(String)\n').filter(f =>
        f.feature.startsWith('.'),
      ),
    ).toEqual([])
  })

  it('counts post-ES5 instance members at their max owner version', () => {
    const features = detectFileFeatures('var y = arr.flat(depth)\n')
    const flat = features.find(f => f.feature === '.flat()')
    expect(flat).toBeDefined()
    expect(
      flat!.version.localeCompare('11.0.0', 'en', { numeric: true }),
    ).toBeGreaterThanOrEqual(0)
  })

  it('floors modern syntax through BCD data', () => {
    expect(floorOf('const f = (a) => a?.b ?? 1\n')).toBe('14.0.0')
  })
})
