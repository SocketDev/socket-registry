/**
 * @file Unit tests for `scripts/fleet/check/package-files-are-allowlisted.mts`.
 *   Uses in-memory fixtures (no real `npm pack` round-trip) to exercise the
 *   pure-function detection logic: forbidden patterns, undershoot matching,
 *   missing essentials.
 */

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  checkPackage,
  computeCanonicalFiles,
  ESSENTIAL_FILES,
  FORBIDDEN_PUBLISHED_PATTERNS,
  matchesAny,
} from '../../../scripts/fleet/check/package-files-are-allowlisted.mts'
import type {
  Finding,
  PackageJson,
  PackOutput,
} from '../../../scripts/fleet/check/package-files-are-allowlisted.mts'

function pack(paths: string[]): PackOutput {
  return {
    files: paths.map(p => ({ path: p, size: 0, mode: 0o644 })),
  }
}

describe('matchesAny', () => {
  test('bare name matches dir + nested paths', () => {
    assert.equal(matchesAny(['dist/index.js'], 'dist'), true)
    assert.equal(matchesAny(['dist'], 'dist'), true)
  })

  test('trailing-slash dir form matches like the bare name (npm treats them identically)', () => {
    assert.equal(matchesAny(['bin/.gitkeep'], 'bin/'), true)
    assert.equal(matchesAny(['bin'], 'bin/'), true)
    assert.equal(matchesAny(['src/index.js'], 'bin/'), false)
  })

  test('bare name does not match unrelated paths', () => {
    assert.equal(matchesAny(['src/index.js'], 'dist'), false)
  })

  test('star glob matches matching extension', () => {
    assert.equal(matchesAny(['README.md', 'index.js'], '*.md'), true)
    assert.equal(matchesAny(['index.js'], '*.md'), false)
  })

  test('directory star matches nested', () => {
    assert.equal(matchesAny(['dist/foo.js'], 'dist/*'), true)
  })
})

describe('checkPackage — overshoot', () => {
  test('test/ path triggers overshoot finding', () => {
    const findings: Finding[] = []
    const pkg: PackageJson = { name: 'p', files: ['lib', 'test'] }
    const out = pack([
      'lib/index.js',
      'test/foo.test.js',
      'README.md',
      'LICENSE',
    ])
    checkPackage('/tmp/p', pkg, out, findings)
    const overshoot = findings.filter(f => f.kind === 'overshoot')
    assert.ok(overshoot.length >= 1, 'expected at least one overshoot finding')
    assert.ok(overshoot.some(f => f.message.includes('test/')))
  })

  test('scripts/ path triggers overshoot finding', () => {
    const findings: Finding[] = []
    const pkg: PackageJson = { name: 'p' }
    const out = pack(['scripts/build.mts', 'README.md', 'LICENSE'])
    checkPackage('/tmp/p', pkg, out, findings)
    assert.ok(
      findings.some(
        f => f.kind === 'overshoot' && f.message.includes('scripts/'),
      ),
    )
  })

  test('clean publish surface emits zero overshoot findings', () => {
    const findings: Finding[] = []
    const pkg: PackageJson = { name: 'p', files: ['dist'] }
    const out = pack(['dist/index.js', 'package.json', 'README.md', 'LICENSE'])
    checkPackage('/tmp/p', pkg, out, findings)
    assert.equal(findings.filter(f => f.kind === 'overshoot').length, 0)
  })
})

describe('checkPackage — undershoot', () => {
  test('files entry with no match triggers undershoot', () => {
    const findings: Finding[] = []
    const pkg: PackageJson = { name: 'p', files: ['dist', 'missing-dir'] }
    const out = pack(['dist/index.js', 'README.md', 'LICENSE'])
    checkPackage('/tmp/p', pkg, out, findings)
    const u = findings.find(f => f.kind === 'undershoot')
    assert.ok(u, 'expected undershoot finding')
    assert.ok(u!.message.includes('missing-dir'))
  })

  test('all files entries matched → no undershoot', () => {
    const findings: Finding[] = []
    const pkg: PackageJson = { name: 'p', files: ['dist', '*.md'] }
    const out = pack(['dist/index.js', 'README.md', 'CHANGELOG.md', 'LICENSE'])
    checkPackage('/tmp/p', pkg, out, findings)
    assert.equal(findings.filter(f => f.kind === 'undershoot').length, 0)
  })

  test('build-output entry that matches nothing in an UNBUILT checkout is skipped', () => {
    // `files: ["dist"]` legitimately matches nothing when dist/ was never
    // built (CI's check job runs without a guaranteed build). Skip it when the
    // dir is absent on disk — pkgDir has no dist/ here.
    const findings: Finding[] = []
    const pkg: PackageJson = { name: 'p', files: ['dist'] }
    const out = pack(['README.md', 'LICENSE']) // no dist/* — unbuilt
    checkPackage('/tmp/nonexistent-unbuilt-pkg', pkg, out, findings)
    assert.equal(findings.filter(f => f.kind === 'undershoot').length, 0)
  })

  test('build-output entry still undershoots when the dir EXISTS but is empty', () => {
    // A present-but-empty dist/ (built, but the entry shipped nothing) is a
    // real undershoot — only the unbuilt (absent) case is exempt.
    const dir = mkdtempSync(path.join(os.tmpdir(), 'pkgfiles-'))
    mkdirSync(path.join(dir, 'dist'), { recursive: true })
    const findings: Finding[] = []
    const pkg: PackageJson = { name: 'p', files: ['dist'] }
    const out = pack(['README.md', 'LICENSE']) // dist/ exists but pack has none
    checkPackage(dir, pkg, out, findings)
    const u = findings.find(f => f.kind === 'undershoot')
    assert.ok(u, 'expected undershoot when dist exists but ships nothing')
  })

  test('a non-build-output entry that matches nothing always undershoots', () => {
    // `lib` is not a build-output dir, so the unbuilt exemption never applies.
    const findings: Finding[] = []
    const pkg: PackageJson = { name: 'p', files: ['lib'] }
    const out = pack(['README.md', 'LICENSE'])
    checkPackage('/tmp/nonexistent-pkg', pkg, out, findings)
    assert.ok(findings.some(f => f.kind === 'undershoot'))
  })
})

describe('checkPackage — missing essentials', () => {
  test('no README triggers missing_essential', () => {
    const findings: Finding[] = []
    const pkg: PackageJson = { name: 'p' }
    const out = pack(['dist/index.js', 'LICENSE'])
    checkPackage('/tmp/p', pkg, out, findings)
    assert.ok(findings.some(f => f.kind === 'missing_essential'))
  })

  test('no LICENSE triggers missing_essential', () => {
    const findings: Finding[] = []
    const pkg: PackageJson = { name: 'p' }
    const out = pack(['dist/index.js', 'README.md'])
    checkPackage('/tmp/p', pkg, out, findings)
    assert.ok(findings.some(f => f.kind === 'missing_essential'))
  })

  test('README + LICENSE present → no missing_essential', () => {
    const findings: Finding[] = []
    const pkg: PackageJson = { name: 'p' }
    const out = pack(['dist/index.js', 'README.md', 'LICENSE'])
    checkPackage('/tmp/p', pkg, out, findings)
    assert.equal(findings.filter(f => f.kind === 'missing_essential').length, 0)
  })

  test('README.markdown variant accepted', () => {
    const findings: Finding[] = []
    const pkg: PackageJson = { name: 'p' }
    const out = pack(['dist/index.js', 'README.md', 'LICENSE.txt'])
    checkPackage('/tmp/p', pkg, out, findings)
    assert.equal(findings.filter(f => f.kind === 'missing_essential').length, 0)
  })
})

describe('FORBIDDEN_PUBLISHED_PATTERNS', () => {
  test('matches expected dev surfaces', () => {
    const examples = [
      'test/foo.js',
      'tests/bar.js',
      'src/foo.test.mts',
      'lib/bar.spec.ts',
      'scripts/build.mts',
      '.config/fleet/oxlintrc.json',
      '.github/workflows/ci.yml',
      '.claude/settings.json',
      'pnpm-lock.yaml',
    ]
    for (let i = 0, { length } = examples; i < length; i += 1) {
      const ex = examples[i]!
      assert.ok(
        FORBIDDEN_PUBLISHED_PATTERNS.some(re => re.test(ex)),
        `expected pattern hit for ${ex}`,
      )
    }
  })

  test('does not match legitimate publish surfaces', () => {
    const examples = [
      'dist/index.js',
      'lib/foo.mjs',
      'src/index.ts',
      'README.md',
      'LICENSE',
      'package.json',
    ]
    for (let i = 0, { length } = examples; i < length; i += 1) {
      const ex = examples[i]!
      assert.ok(
        !FORBIDDEN_PUBLISHED_PATTERNS.some(re => re.test(ex)),
        `did not expect pattern hit for ${ex}`,
      )
    }
  })
})

describe('ESSENTIAL_FILES', () => {
  test('matches case-insensitive variants', () => {
    const matched = (name: string): boolean =>
      ESSENTIAL_FILES.some(re => re.test(name))
    assert.equal(matched('README'), true)
    assert.equal(matched('README.md'), true)
    assert.equal(matched('readme.md'), true)
    assert.equal(matched('LICENSE'), true)
    assert.equal(matched('LICENSE.md'), true)
    assert.equal(matched('License.txt'), true)
  })
})

describe('computeCanonicalFiles', () => {
  const packArgs = (...paths: string[]) => ({
    files: paths.map(p => ({ path: p, size: 0, mode: 0 })),
  })

  test('collapses shipped directories to a single entry + lists top files', () => {
    const out = computeCanonicalFiles(
      packArgs(
        'dist/index.js',
        'dist/arrays/sort.js',
        'types/index.d.ts',
        'data.json',
      ),
    )
    assert.deepEqual(out, ['data.json', 'dist', 'types'])
  })

  test('omits always-published essentials (package.json/README/LICENSE/CHANGELOG)', () => {
    const out = computeCanonicalFiles(
      packArgs(
        'package.json',
        'README.md',
        'LICENSE',
        'CHANGELOG.md',
        'dist/x.js',
      ),
    )
    assert.deepEqual(out, ['dist'])
  })

  test('drops forbidden dev/test content', () => {
    const out = computeCanonicalFiles(
      packArgs(
        'dist/x.js',
        'test/x.test.js',
        'scripts/build.mjs',
        '.github/ci.yml',
      ),
    )
    assert.deepEqual(out, ['dist'])
  })

  test('result is ASCII-sorted (dirs + files together)', () => {
    const out = computeCanonicalFiles(
      packArgs('zed.js', 'dist/x.js', 'alpha.mjs'),
    )
    assert.deepEqual(out, ['alpha.mjs', 'dist', 'zed.js'])
  })
})
