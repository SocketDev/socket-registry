// Unit specs for the mirror-convention check's pure classifiers. Covers import
// resolution, the two blessed variants (check-by-name via a temp fixture,
// hook/rule dir unit), the shard prefix blessing, and the rename/split verdicts.
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, test } from 'vitest'

import {
  classifyTest,
  firstPartyImports,
  hasMirrorExemptMarker,
  isBlessedVariant,
  isCheckByName,
  matchesShard,
} from '../../../scripts/fleet/check/tests-are-mirror-named.mts'

const ROOT = '/repo'

describe('firstPartyImports', () => {
  test('keeps repo src/scripts imports, drops node_modules + type-only + bare', () => {
    const content = [
      `import { a } from '../../../scripts/fleet/foo.mts'`,
      `import type { T } from '../../../scripts/fleet/types.mts'`,
      `import { x } from '@socketsecurity/lib-stable/x'`,
      `import { describe } from 'vitest'`,
      `import { b } from '../../../src/bar.mts'`,
    ].join('\n')
    const imports = firstPartyImports(content, '/repo/test/unit/fleet', ROOT)
    assert.deepEqual(imports.toSorted(), [
      'scripts/fleet/foo.mts',
      'src/bar.mts',
    ])
  })
})

describe('matchesShard', () => {
  test('bare basename and <base>-<aspect> shards both match', () => {
    assert.ok(matchesShard('cover', ['cover']))
    assert.ok(matchesShard('cover-thresholds', ['cover']))
    assert.ok(matchesShard('cover-suite-failure-report', ['cover']))
    assert.ok(!matchesShard('coverage', ['cover'])) // needs the hyphen boundary
    assert.ok(!matchesShard('discovery', ['cover']))
  })
})

describe('isBlessedVariant', () => {
  test('a hook/rule dir unit test mirrors the dir name (index.mts)', () => {
    assert.ok(
      isBlessedVariant('commit-size-nudge', [
        '.claude/hooks/fleet/commit-size-nudge/index.mts',
      ]),
    )
    assert.ok(!isBlessedVariant('index', ['scripts/fleet/foo.mts']))
  })
})

describe('isCheckByName', () => {
  test('conforms when the named check script exists (not by import)', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'mirror-check-'))
    mkdirSync(path.join(root, 'scripts/fleet/check'), { recursive: true })
    writeFileSync(
      path.join(root, 'scripts/fleet/check/telemetry-deps-are-reviewed.mts'),
      '',
    )
    assert.ok(isCheckByName('check-telemetry-deps-are-reviewed', root))
    assert.ok(!isCheckByName('check-nonexistent-thing', root))
    assert.ok(!isCheckByName('not-a-check', root))
  })
})

describe('classifyTest', () => {
  test('exempt: no first-party imports, or an integration/e2e location', () => {
    assert.equal(
      classifyTest('test/unit/fleet/x.test.mts', [], ROOT).kind,
      'exempt',
    )
    assert.equal(
      classifyTest(
        'test/repo/integration/hooks/y.test.mts',
        ['scripts/fleet/y.mts'],
        ROOT,
      ).kind,
      'exempt',
    )
  })

  test('conforming: bare mirror, shard, and multi-import with a matching SUT', () => {
    assert.equal(
      classifyTest(
        'test/unit/fleet/foo.test.mts',
        ['scripts/fleet/foo.mts'],
        ROOT,
      ).kind,
      'conforming',
    )
    assert.equal(
      classifyTest(
        'test/unit/fleet/cover-thresholds.test.mts',
        ['scripts/fleet/cover.mts'],
        ROOT,
      ).kind,
      'conforming',
    )
    // SUT present among several imports → incidental helpers don't disqualify.
    assert.equal(
      classifyTest(
        'test/unit/fleet/foo.test.mts',
        ['scripts/fleet/foo.mts', 'scripts/fleet/paths.mts'],
        ROOT,
      ).kind,
      'conforming',
    )
  })

  test('rename: a single import whose basename does not match', () => {
    const c = classifyTest(
      'test/unit/fleet/wrong-name.test.mts',
      ['scripts/fleet/foo.mts'],
      ROOT,
    )
    assert.equal(c.kind, 'rename')
    assert.equal(c.detail, 'wrong-name → foo')
  })

  test('split: two-plus imports with no matching SUT', () => {
    const c = classifyTest(
      'test/unit/fleet/combined.test.mts',
      ['scripts/fleet/a.mts', 'scripts/fleet/b.mts'],
      ROOT,
    )
    assert.equal(c.kind, 'split')
  })
})

describe('hasMirrorExemptMarker', () => {
  test('matches the exact first-line marker', () => {
    assert.ok(
      hasMirrorExemptMarker(
        '// socket-lint: mirror-exempt — imports only paths.mts\n',
      ),
    )
  })

  test('rejects the marker on a non-first line', () => {
    assert.ok(
      !hasMirrorExemptMarker(
        'import x from "./x.mts"\n// socket-lint: mirror-exempt — reason\n',
      ),
    )
  })

  test('rejects missing marker', () => {
    assert.ok(!hasMirrorExemptMarker('import x from "./x.mts"\n'))
  })
})
