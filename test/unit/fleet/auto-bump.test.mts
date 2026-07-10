import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  classifyTarget,
  compareSemVer,
  isStableTag,
  isSuspectBackward,
  parseTag,
  planFromReport,
  resolveTarget,
  writePinnedFields,
} from '../../../scripts/fleet/lockstep/auto-bump.mts'
import type { Report } from '../../../scripts/fleet/lockstep/types.mts'

describe('isStableTag', () => {
  test('rejects pre-release / nightly / preview suffixes', () => {
    assert.equal(isStableTag('v1.2.3'), true)
    assert.equal(isStableTag('v1.2.3-rc.1'), false)
    assert.equal(isStableTag('1.2.0-beta'), false)
    assert.equal(isStableTag('1.2.0-alpha.4'), false)
    assert.equal(isStableTag('foo-1.2.3-nightly'), false)
    assert.equal(isStableTag('v2.0.0-dev'), false)
  })
})

describe('parseTag — the four schemes', () => {
  test('v-prefixed semver', () => {
    const p = parseTag('v1.2.3')!
    assert.deepEqual(p.version, { major: 1, minor: 2, patch: 3 })
    assert.equal(p.prefix, '')
  })
  test('bare semver', () => {
    assert.deepEqual(parseTag('1.2.3')!.version, {
      major: 1,
      minor: 2,
      patch: 3,
    })
  })
  test('project-prefixed', () => {
    const p = parseTag('openssl-3.2.1')!
    assert.equal(p.prefix, 'openssl')
    assert.deepEqual(p.version, { major: 3, minor: 2, patch: 1 })
  })
  test('underscore style', () => {
    const p = parseTag('curl_8_5_0')!
    assert.equal(p.prefix, 'curl')
    assert.deepEqual(p.version, { major: 8, minor: 5, patch: 0 })
  })
  test('undefined when no semver triple', () => {
    assert.equal(parseTag('not-a-version'), undefined)
    assert.equal(parseTag('main'), undefined)
  })
})

describe('parseTag — two-component schemes', () => {
  test('postgres-style REL_17_9 parses with patch 0', () => {
    const p = parseTag('REL_17_9')!
    assert.equal(p.prefix, 'REL')
    assert.deepEqual(p.version, { major: 17, minor: 9, patch: 0 })
  })
  test('dotted two-component liburing-2.15 parses with patch 0', () => {
    const p = parseTag('liburing-2.15')!
    assert.equal(p.prefix, 'liburing')
    assert.deepEqual(p.version, { major: 2, minor: 15, patch: 0 })
  })
})

describe('compareSemVer', () => {
  test('orders by major, then minor, then patch', () => {
    assert.ok(
      compareSemVer(
        { major: 1, minor: 0, patch: 0 },
        { major: 2, minor: 0, patch: 0 },
      ) < 0,
    )
    assert.ok(
      compareSemVer(
        { major: 1, minor: 3, patch: 0 },
        { major: 1, minor: 2, patch: 9 },
      ) > 0,
    )
    assert.equal(
      compareSemVer(
        { major: 1, minor: 2, patch: 3 },
        { major: 1, minor: 2, patch: 3 },
      ),
      0,
    )
  })
})

describe('resolveTarget', () => {
  test('track-latest picks the newest same-prefix stable tag, skipping pre-release', () => {
    assert.equal(
      resolveTarget(
        'v1.2.3',
        ['v1.2.3', 'v1.3.0', 'v1.3.0-rc.1', 'v2.0.0'],
        'track-latest',
      ).targetTag,
      'v2.0.0',
    )
  })
  test('major-gate blocks a major jump but allows minor/patch', () => {
    const blocked = resolveTarget('v1.2.3', ['v1.3.0', 'v2.0.0'], 'major-gate')
    assert.equal(blocked.targetTag, undefined)
    assert.ok(blocked.skipReason?.includes('major'))
    assert.equal(
      resolveTarget('v1.2.3', ['v1.3.0', 'v1.4.5'], 'major-gate').targetTag,
      'v1.4.5',
    )
  })
  test('locked never bumps', () => {
    const r = resolveTarget('v1.2.3', ['v2.0.0'], 'locked')
    assert.equal(r.targetTag, undefined)
    assert.ok(r.skipReason?.includes('locked'))
  })
  test('already-at-latest skips', () => {
    assert.ok(
      resolveTarget(
        'v2.0.0',
        ['v1.0.0', 'v2.0.0'],
        'track-latest',
      ).skipReason?.includes('already'),
    )
  })
  test('prefix isolation: a v-pin never jumps to a different-prefix tag', () => {
    assert.equal(
      resolveTarget('v1.2.3', ['v1.5.0', 'openssl-9.9.9'], 'track-latest')
        .targetTag,
      'v1.5.0',
    )
  })
})

describe('resolveTarget — downgrade-vector guards', () => {
  test('REGRESSION: REL_17_9 resolves forward to REL_17_10, never REL9_6_24', () => {
    const r = resolveTarget(
      'REL_17_9',
      ['REL9_6_24', 'REL_17_10', 'REL_17_9'],
      'major-gate',
    )
    assert.equal(r.targetTag, 'REL_17_10')
  })
  test('a present-but-unparseable pinned tag is advisory, never unconstrained', () => {
    const r = resolveTarget(
      'epochs/three_hourly/2026-02-24_21H',
      ['v1.0.0', 'v2.0.0'],
      'track-latest',
    )
    assert.equal(r.targetTag, undefined)
    assert.ok(r.skipReason?.includes('does not parse'))
  })
})

describe('resolveTarget — sha-pinned multi-epoch tag sets', () => {
  test('REGRESSION: multi-scheme tag sets are ambiguous for sha-pins (Go release.r60.3 case)', () => {
    const r = resolveTarget(
      undefined,
      ['go1.26.4', 'release.r60.3', 'weekly.2011-11-09'],
      'track-latest',
    )
    assert.equal(r.targetTag, undefined)
    assert.ok(r.skipReason?.includes('ambiguous'))
  })
  test('single-scheme tag sets still resolve for sha-pins (quick-xml case)', () => {
    const r = resolveTarget(undefined, ['v0.40.1', 'v0.41.0'], 'track-latest')
    assert.equal(r.targetTag, 'v0.41.0')
  })
})

function vpReport(over: Record<string, unknown>): Report {
  return {
    area: 'a',
    drift_count: 1,
    head_sha: 'b',
    id: 'vp',
    kind: 'version-pin',
    messages: [],
    pinned_sha: 'a',
    pinned_tag: 'v1.0.0',
    severity: 'drift',
    upgrade_policy: 'track-latest',
    upstream: 'u',
    ...over,
  } as Report
}

describe('planFromReport', () => {
  test('partitions auto (resolvable version-pin) from advisory', () => {
    const reports: Report[] = [
      vpReport({ id: 'a', upstream: 'u1', pinned_tag: 'v1.0.0' }),
      vpReport({ id: 'locked', upstream: 'u2', upgrade_policy: 'locked' }),
      vpReport({ id: 'ok', upstream: 'u3', severity: 'ok' }),
    ]
    const plan = planFromReport(reports, { u1: ['v1.0.0', 'v1.2.0'] })
    assert.equal(plan.auto.length, 1)
    assert.equal(plan.auto[0]!.id, 'a')
    assert.equal(plan.auto[0]!.targetTag, 'v1.2.0')
    assert.ok(plan.advisory.some(r => r.id === 'locked'))
    assert.ok(!plan.advisory.some(r => r.id === 'ok'))
  })
  test('a tag-bearing pin already at/past the latest tag stays advisory (no HEAD hop)', () => {
    const plan = planFromReport(
      [vpReport({ id: 'x', upstream: 'u', pinned_tag: 'v2.0.0' })],
      { u: ['v1.0.0', 'v2.0.0'] },
      { u: 'remote-tip' },
    )
    assert.equal(plan.auto.length, 0)
    assert.ok(plan.advisory.some(r => r.id === 'x'))
  })
  test('tagless track-latest takes the HEAD leg (targetSha from the origin/HEAD map)', () => {
    const plan = planFromReport(
      [vpReport({ id: 'nt', upstream: 'u', pinned_tag: undefined })],
      { u: [] },
      { u: 'remote-tip' },
    )
    assert.equal(plan.auto.length, 1)
    assert.equal(plan.auto[0]!.targetTag, undefined)
    assert.equal(plan.auto[0]!.targetSha, 'remote-tip')
  })
  test('major-gate never HEAD-hops — tagless stays advisory', () => {
    const plan = planFromReport(
      [
        vpReport({
          id: 'mg',
          upgrade_policy: 'major-gate',
          upstream: 'u',
          pinned_tag: undefined,
        }),
      ],
      { u: [] },
      { u: 'remote-tip' },
    )
    assert.equal(plan.auto.length, 0)
    assert.ok(plan.advisory.some(r => r.id === 'mg'))
  })
  test('HEAD leg requires an origin/HEAD that differs from the pin', () => {
    const plan = planFromReport(
      [
        vpReport({
          id: 'same',
          pinned_sha: 'a',
          pinned_tag: undefined,
          upstream: 'u',
        }),
      ],
      { u: [] },
      { u: 'a' },
    )
    assert.equal(plan.auto.length, 0)
    assert.ok(plan.advisory.some(r => r.id === 'same'))
  })
  test('the checkout head_sha in the report is IGNORED (it equals the pin)', () => {
    const plan = planFromReport(
      [
        vpReport({
          head_sha: 'b',
          id: 'no-map',
          pinned_tag: undefined,
          upstream: 'u',
        }),
      ],
      { u: [] },
    )
    assert.equal(plan.auto.length, 0)
    assert.ok(plan.advisory.some(r => r.id === 'no-map'))
  })
})

describe('classifyTarget', () => {
  test('same SHA → already-at-target', () => {
    assert.equal(
      classifyTarget('aaa', 'aaa', () => false),
      'already-at-target',
    )
  })
  test('target is an ancestor of the pin → target-behind-pin', () => {
    assert.equal(
      classifyTarget('pin', 'old', () => true),
      'target-behind-pin',
    )
  })
  test('non-ancestor target → forward', () => {
    assert.equal(
      classifyTarget('pin', 'new', () => false),
      'forward',
    )
  })
  test('unknowable ancestry (shallow clone) proceeds forward', () => {
    assert.equal(
      classifyTarget('pin', 'new', () => undefined),
      'forward',
    )
  })
})

describe('writePinnedFields', () => {
  function tmpManifest(row: Record<string, unknown>): string {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'lockstep-test-'))
    const file = path.join(dir, 'lockstep.json')
    writeFileSync(file, `${JSON.stringify({ rows: [row] }, undefined, 2)}\n`)
    return file
  }
  test('tag bump rewrites pinned_sha + pinned_tag', () => {
    const file = tmpManifest({
      id: 'r',
      kind: 'version-pin',
      pinned_sha: 'a'.repeat(40),
      pinned_tag: 'v1.0.0',
      upgrade_policy: 'track-latest',
      upstream: 'u',
    })
    writePinnedFields(file, 'r', {
      pinnedSha: 'b'.repeat(40),
      pinnedTag: 'v2.0.0',
    })
    const row = JSON.parse(readFileSync(file, 'utf8')).rows[0]
    assert.equal(row.pinned_sha, 'b'.repeat(40))
    assert.equal(row.pinned_tag, 'v2.0.0')
  })
  test('SHA bump DELETES pinned_tag (a SHA pin has no release label)', () => {
    const file = tmpManifest({
      id: 'r',
      kind: 'version-pin',
      pinned_sha: 'a'.repeat(40),
      pinned_tag: 'v1.0.0',
      upgrade_policy: 'track-latest',
      upstream: 'u',
    })
    writePinnedFields(file, 'r', {
      pinnedSha: 'c'.repeat(40),
      pinnedTag: undefined,
    })
    const row = JSON.parse(readFileSync(file, 'utf8')).rows[0]
    assert.equal(row.pinned_sha, 'c'.repeat(40))
    assert.ok(!('pinned_tag' in row))
  })
})

describe('isSuspectBackward — shallow-graft downgrade belt', () => {
  const day = 86_400
  test('a target much older than the pin is suspect', () => {
    assert.equal(isSuspectBackward(1000 * day, 900 * day), true)
  })
  test('a newer target is not suspect', () => {
    assert.equal(isSuspectBackward(1000 * day, 1001 * day), false)
  })
  test('same-day skew is tolerated (rebase timestamps)', () => {
    assert.equal(isSuspectBackward(1000 * day, 1000 * day - day / 2), false)
  })
})
