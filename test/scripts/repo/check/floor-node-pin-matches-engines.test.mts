/**
 * @file Unit tests for the floor-pin ↔ engines lock-step law's pure core:
 *   both arms of each classification (in-step, drifted range, missing or
 *   unresolvable engines). Directory scanning stays in the caller, so the
 *   suite runs on synthetic fixtures with no repo coupling.
 */

import { describe, expect, it } from 'vitest'

import { findFloorDrift } from '../../../../scripts/repo/check/floor-node-pin-matches-engines.mts'

const FLOOR = '24.0.0'

describe('scripts/repo/check/floor-node-pin-matches-engines', () => {
  it('passes when every override floors exactly at the pin', () => {
    expect(
      findFloorDrift(
        [
          { name: 'a', enginesNode: '>=24' },
          { name: 'b', enginesNode: '>=24.0.0' },
          { name: 'c', enginesNode: '^24.0.0 || >=25' },
        ],
        FLOOR,
      ),
    ).toEqual([])
  })

  it('flags a range whose floor drifted above or below the pin', () => {
    const above = findFloorDrift([{ name: 'a', enginesNode: '>=26' }], FLOOR)
    expect(above).toHaveLength(1)
    expect(above[0]).toContain('floors at 26.0.0')
    expect(above[0]).toContain('proves 24.0.0')
    const below = findFloorDrift([{ name: 'b', enginesNode: '>=18.19' }], FLOOR)
    expect(below).toHaveLength(1)
    expect(below[0]).toContain('floors at 18.19.0')
  })

  it('flags a missing engines.node — the gate premise breaks silently', () => {
    const findings = findFloorDrift(
      [{ name: 'a', enginesNode: undefined }],
      FLOOR,
    )
    expect(findings).toHaveLength(1)
    expect(findings[0]).toContain('no engines.node')
  })

  it('flags an unresolvable range instead of crashing', () => {
    const findings = findFloorDrift(
      [{ name: 'a', enginesNode: 'not-a-range' }],
      FLOOR,
    )
    expect(findings).toHaveLength(1)
    expect(findings[0]).toContain('no resolvable minimum')
  })

  it('reports every drifted override, not just the first', () => {
    expect(
      findFloorDrift(
        [
          { name: 'a', enginesNode: '>=26' },
          { name: 'b', enginesNode: '>=24' },
          { name: 'c', enginesNode: undefined },
        ],
        FLOOR,
      ),
    ).toHaveLength(2)
  })
})
