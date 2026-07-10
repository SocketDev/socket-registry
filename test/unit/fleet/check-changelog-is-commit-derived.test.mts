// vitest spec for check-changelog-is-commit-derived. Exercises the exported
// pure parsers — importing is side-effect-free now that main() is
// entrypoint-guarded (it no longer spawns git at module load).

import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import {
  bulletSet,
  headingVersion,
  topChangelogSection,
} from '../../../scripts/fleet/check/changelog-is-commit-derived.mts'

describe('topChangelogSection', () => {
  test('returns the first ## section, stopping before the next ##', () => {
    const cl =
      '# Changelog\n\n## [1.2.0]\n\n- feat: a\n- fix: b\n\n## [1.1.0]\n\n- old\n'
    const section = topChangelogSection(cl)
    assert.ok(section)
    assert.ok(section.startsWith('## [1.2.0]'))
    assert.ok(section.includes('- feat: a'))
    assert.ok(!section.includes('- old'))
  })

  test('returns undefined when there is no version section', () => {
    assert.equal(
      topChangelogSection('# Changelog\n\nNothing here.\n'),
      undefined,
    )
  })

  test('returns undefined for an empty string', () => {
    assert.equal(topChangelogSection(''), undefined)
  })

  test('returns the only section when there is exactly one ## block', () => {
    const cl = '## [3.0.0]\n\n- feat: only release\n'
    const section = topChangelogSection(cl)
    assert.ok(section)
    assert.ok(section.startsWith('## [3.0.0]'))
    assert.ok(section.includes('- feat: only release'))
  })

  test('trims the returned section (no leading/trailing blank lines)', () => {
    const cl = '## [1.0.0]\n\n- fix: something\n\n'
    const section = topChangelogSection(cl)
    assert.ok(section)
    assert.equal(section, section.trim())
  })

  test('does not include the next ## heading line in the returned section', () => {
    const cl = '## [2.0.0]\n- feat: new\n## [1.0.0]\n- fix: old\n'
    const section = topChangelogSection(cl)
    assert.ok(section)
    assert.ok(!section.includes('## [1.0.0]'))
  })

  test('handles a changelog with no preamble (## is first line)', () => {
    const cl = '## [5.0.0]\n- chore: bump\n\n## [4.0.0]\n- old\n'
    const section = topChangelogSection(cl)
    assert.ok(section)
    assert.ok(section.startsWith('## [5.0.0]'))
  })
})

describe('headingVersion', () => {
  test('parses [X.Y.Z] and vX.Y.Z headings', () => {
    assert.equal(headingVersion('## [1.2.0]\n- x'), '1.2.0')
    assert.equal(headingVersion('## v2.3.4 — 2026-01-01'), '2.3.4')
  })

  test('returns undefined for a non-version heading', () => {
    assert.equal(headingVersion('## Unreleased\n- x'), undefined)
  })

  test('returns undefined for an empty string', () => {
    assert.equal(headingVersion(''), undefined)
  })

  test('parses a plain semver heading with no brackets or v prefix', () => {
    // VERSION_HEADING_RE matches digits directly after "## " too
    assert.equal(headingVersion('## 0.1.0\n'), '0.1.0')
  })

  test('ignores version numbers in subsequent lines (only checks first line)', () => {
    // The function splits on \n and only checks [0], so a version number on
    // line 2 must NOT be returned.
    const version = headingVersion('## Unreleased\n## [9.9.9]')
    assert.equal(version, undefined)
  })

  test('parses version with patch zero correctly', () => {
    assert.equal(headingVersion('## [1.0.0]'), '1.0.0')
  })

  test('parses version with double-digit segments', () => {
    assert.equal(headingVersion('## [12.34.56] - 2025-01-01'), '12.34.56')
  })
})

describe('bulletSet', () => {
  test('collects trimmed bullet lines, ignoring prose', () => {
    const set = bulletSet('## [1.0.0]\n\n- feat: a\n- fix: b\n\nprose line\n')
    assert.ok(set.has('- feat: a'))
    assert.ok(set.has('- fix: b'))
    assert.equal(set.size, 2)
  })

  test('is empty when there are no bullets', () => {
    assert.equal(bulletSet('## [1.0.0]\n\nno bullets\n').size, 0)
  })

  test('is empty for an empty string', () => {
    assert.equal(bulletSet('').size, 0)
  })

  test('trims trailing whitespace from bullet lines before adding to set', () => {
    const set = bulletSet('- feat: spaces   \n- fix: tabs\t\n')
    assert.ok(set.has('- feat: spaces'), 'trailing spaces stripped')
    assert.ok(set.has('- fix: tabs'), 'trailing tabs stripped')
  })

  test('deduplicates identical bullets', () => {
    const set = bulletSet('- feat: same\n- feat: same\n')
    assert.equal(set.size, 1)
  })

  test('ignores lines starting with spaces before the dash (not flush bullets)', () => {
    // Only lines starting exactly with "- " are bullets; indented lines are prose.
    const set = bulletSet('  - not a top-level bullet\n- feat: real\n')
    assert.ok(!set.has('  - not a top-level bullet'))
    assert.ok(set.has('- feat: real'))
    assert.equal(set.size, 1)
  })

  test('handles a section with only heading and no body lines', () => {
    assert.equal(bulletSet('## [1.0.0]').size, 0)
  })

  test('collects bullets with special characters intact', () => {
    const bullet = '- feat(scope): add `foo()` — see #123'
    const set = bulletSet(`## [1.0.0]\n\n${bullet}\n`)
    assert.ok(set.has(bullet))
  })
})
