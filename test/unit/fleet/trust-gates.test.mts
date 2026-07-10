import assert from 'node:assert/strict'
import { describe, test } from 'vitest'

import {
  checkGateFloors,
  detectNpmrcMinReleaseAgeDowngrade,
  MIN_RELEASE_AGE_DAYS,
  MIN_RELEASE_AGE_MINUTES,
} from '../../../.claude/hooks/fleet/_shared/trust-gates.mts'

describe('checkGateFloors', () => {
  const STRONG = `minimumReleaseAge: ${MIN_RELEASE_AGE_MINUTES}
trustPolicy: no-downgrade
blockExoticSubdeps: true
`

  test('a fully-strong pnpm-workspace.yaml has no violations', () => {
    assert.deepEqual(checkGateFloors(STRONG, undefined), [])
  })

  test('flags a lowered minimumReleaseAge', () => {
    const v = checkGateFloors(STRONG.replace('10080', '60'), undefined)
    assert.equal(v.length, 1)
    assert.equal(v[0]!.gate, 'minimumReleaseAge')
    assert.equal(v[0]!.saw, '60')
  })

  test('flags an absent minimumReleaseAge', () => {
    const v = checkGateFloors(
      'trustPolicy: no-downgrade\nblockExoticSubdeps: true\n',
      undefined,
    )
    assert.ok(v.some(x => x.gate === 'minimumReleaseAge' && x.saw === 'absent'))
  })

  test('flags a non-no-downgrade trustPolicy', () => {
    const v = checkGateFloors(
      STRONG.replace('no-downgrade', 'trust-all'),
      undefined,
    )
    assert.ok(v.some(x => x.gate === 'trustPolicy' && x.saw === 'trust-all'))
  })

  test('flags blockExoticSubdeps flipped to false', () => {
    const v = checkGateFloors(STRONG.replace('true', 'false'), undefined)
    assert.ok(v.some(x => x.gate === 'blockExoticSubdeps' && x.saw === 'false'))
  })

  test('flags .npmrc min-release-age below the day floor', () => {
    const v = checkGateFloors(STRONG, 'min-release-age=1\n')
    assert.ok(v.some(x => x.gate === 'min-release-age' && x.saw === '1'))
  })

  test('an absent .npmrc min-release-age is allowed (pnpm gate is primary)', () => {
    assert.deepEqual(checkGateFloors(STRONG, 'ignore-scripts=true\n'), [])
  })
})

describe('detectNpmrcMinReleaseAgeDowngrade', () => {
  test('flags lowering below the floor', () => {
    assert.ok(
      detectNpmrcMinReleaseAgeDowngrade(
        'min-release-age=7',
        'min-release-age=0',
      ),
    )
  })

  test('flags removing the key', () => {
    assert.ok(
      detectNpmrcMinReleaseAgeDowngrade(
        'min-release-age=7',
        'ignore-scripts=true',
      ),
    )
  })

  test('allows raising the value', () => {
    assert.equal(
      detectNpmrcMinReleaseAgeDowngrade(
        'min-release-age=7',
        'min-release-age=14',
      ),
      undefined,
    )
  })

  test('allows the floor value', () => {
    assert.equal(
      detectNpmrcMinReleaseAgeDowngrade(
        '',
        `min-release-age=${MIN_RELEASE_AGE_DAYS}`,
      ),
      undefined,
    )
  })
})
