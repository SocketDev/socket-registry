// vitest spec for check-tests-are-mirror-named. The enforcer's pure
// classification (firstPartyImports / isBlessedVariant / classifyTest) is
// exercised directly; scanRepo runs over a mkdtemp fixture tree. Importing the
// check is side-effect-free (main() is entrypoint-guarded).

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
  scanRepo,
} from '../../../scripts/fleet/check/tests-are-mirror-named.mts'

describe('firstPartyImports', () => {
  const repoRoot = '/repo'
  const testDir = '/repo/test/unit/fleet'

  test('resolves relative imports under a source root', () => {
    const content = "import { x } from '../../../scripts/fleet/check/foo.mts'\n"
    assert.deepEqual(firstPartyImports(content, testDir, repoRoot), [
      'scripts/fleet/check/foo.mts',
    ])
  })

  test('drops bare specifiers, node builtins, and escaping paths', () => {
    const content = [
      "import path from 'node:path'",
      "import { test } from 'vitest'",
      "import { y } from '../../../../sibling-repo/src/a.mts'",
      "import { z } from '../../../docs/thing.mts'",
    ].join('\n')
    assert.deepEqual(firstPartyImports(content, testDir, repoRoot), [])
  })

  test('type-only imports never count as a source', () => {
    const content = [
      "import type { T } from '../../../scripts/fleet/check/foo.mts'",
      "export type { U } from '../../../src/bar.mts'",
    ].join('\n')
    assert.deepEqual(firstPartyImports(content, testDir, repoRoot), [])
  })

  test('dynamic import() specifiers count', () => {
    const content = "const m = await import('../../../src/lazy.mts')\n"
    assert.deepEqual(firstPartyImports(content, testDir, repoRoot), [
      'src/lazy.mts',
    ])
  })

  test('duplicate imports of one source dedupe', () => {
    const content = [
      "import { a } from '../../../src/one.mts'",
      "import { b } from '../../../src/one.mts'",
    ].join('\n')
    assert.deepEqual(firstPartyImports(content, testDir, repoRoot), [
      'src/one.mts',
    ])
  })
})

describe('isBlessedVariant', () => {
  test('<dir> blesses a <dir>/index.mts unit', () => {
    assert.equal(
      isBlessedVariant('my-guard', ['.claude/hooks/fleet/my-guard/index.mts']),
      true,
    )
  })

  test('unrelated basenames are not blessed', () => {
    assert.equal(
      isBlessedVariant('other', ['scripts/fleet/check/foo.mts']),
      false,
    )
    assert.equal(
      isBlessedVariant('check-bar', ['scripts/fleet/foo.mts']),
      false,
    )
  })
})

describe('classifyTest', () => {
  const root = '/repo'

  test('zero first-party imports → exempt', () => {
    assert.equal(classifyTest('test/unit/x.test.mts', [], root).kind, 'exempt')
  })

  test('integration/e2e locations → exempt regardless of imports', () => {
    assert.equal(
      classifyTest('test/integration/x.test.mts', ['src/a.mts'], root).kind,
      'exempt',
    )
    assert.equal(
      classifyTest('test/e2e/y.test.mts', ['src/a.mts'], root).kind,
      'exempt',
    )
  })

  test('basename match on one of several imports → conforming', () => {
    const c = classifyTest(
      'test/unit/foo.test.mts',
      ['src/helpers.mts', 'src/foo.mts'],
      root,
    )
    assert.equal(c.kind, 'conforming')
  })

  test('blessed check- variant → conforming (enforcer file exists)', () => {
    const tmpRoot = mkdtempSync(path.join(os.tmpdir(), 'classify-check-'))
    mkdirSync(path.join(tmpRoot, 'scripts/fleet/check'), { recursive: true })
    writeFileSync(path.join(tmpRoot, 'scripts/fleet/check/foo.mts'), '')
    const c = classifyTest(
      'test/unit/fleet/check-foo.test.mts',
      ['scripts/fleet/check/foo.mts'],
      tmpRoot,
    )
    assert.equal(c.kind, 'conforming')
  })

  test('single mismatched import → rename with the target basename', () => {
    const c = classifyTest('test/unit/wrong.test.mts', ['src/right.mts'], root)
    assert.equal(c.kind, 'rename')
    assert.equal(c.detail, 'wrong → right')
  })

  test('multiple imports, none matching → split naming the sources', () => {
    const c = classifyTest(
      'test/unit/combo.test.mts',
      ['src/a.mts', 'src/b.mts'],
      root,
    )
    assert.equal(c.kind, 'split')
    assert.equal(c.detail, 'src/a.mts, src/b.mts')
  })
})

describe('hasMirrorExemptMarker', () => {
  test('returns true when the first line is the exact marker', () => {
    assert.ok(
      hasMirrorExemptMarker(
        '// socket-lint: mirror-exempt — imports only paths.mts, a broadly-shared util\nimport …',
      ),
    )
  })

  test('returns false when the marker is on a later line', () => {
    assert.ok(
      !hasMirrorExemptMarker(
        '// other comment\n// socket-lint: mirror-exempt — reason\n',
      ),
    )
  })

  test('returns false for a file with no marker', () => {
    assert.ok(!hasMirrorExemptMarker("import { x } from '../src/x.mts'\n"))
  })

  test('returns false for an empty file', () => {
    assert.ok(!hasMirrorExemptMarker(''))
  })
})

describe('scanRepo', () => {
  test('reports rename/split violations, skips conforming + exempt', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'mirror-check-'))
    mkdirSync(path.join(root, 'src'), { recursive: true })
    mkdirSync(path.join(root, 'test', 'unit'), { recursive: true })
    writeFileSync(path.join(root, 'src', 'good.mts'), 'export const g = 1\n')
    writeFileSync(path.join(root, 'src', 'other.mts'), 'export const o = 1\n')
    // Conforming: mirrors its import's basename.
    writeFileSync(
      path.join(root, 'test', 'unit', 'good.test.mts'),
      "import { g } from '../../src/good.mts'\n",
    )
    // Rename: single import, wrong basename.
    writeFileSync(
      path.join(root, 'test', 'unit', 'misnamed.test.mts'),
      "import { o } from '../../src/other.mts'\n",
    )
    // Exempt: no first-party imports.
    writeFileSync(
      path.join(root, 'test', 'unit', 'smoke.test.mts'),
      "import { test } from 'vitest'\n",
    )
    // Mirror-exempt marker: would be a violation but is explicitly excused.
    writeFileSync(
      path.join(root, 'test', 'unit', 'exempt-by-marker.test.mts'),
      "// socket-lint: mirror-exempt — imports only broadly-shared paths util\nimport { o } from '../../src/other.mts'\n",
    )
    const violations = scanRepo(root)
    assert.equal(violations.length, 1)
    assert.equal(violations[0]!.kind, 'rename')
    assert.ok(violations[0]!.testPath.endsWith('misnamed.test.mts'))
  })
})
