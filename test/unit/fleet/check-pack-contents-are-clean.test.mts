// vitest specs for pack-contents-are-clean's pure logic — the files-field
// release gate that inspects real `pnpm pack` output. Covers the classifier
// (scaffolding / hidden / outside-files / clean) and the files-field coverage
// matcher; the pack-and-list path is exercised by the release pipeline.

import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import {
  classifyPackEntries,
  isCoveredByFiles,
} from '../../../scripts/fleet/check/pack-contents-are-clean.mts'

describe('pack-contents / isCoveredByFiles', () => {
  test('empty or missing files field covers everything', () => {
    assert.equal(isCoveredByFiles('lib/x.js', undefined), true)
    assert.equal(isCoveredByFiles('lib/x.js', []), true)
  })

  test('listed directory covers nested entries; others are outside', () => {
    assert.equal(isCoveredByFiles('lib/deep/x.js', ['lib']), true)
    assert.equal(isCoveredByFiles('lib/deep/x.js', ['lib/']), true)
    assert.equal(isCoveredByFiles('src/x.js', ['lib']), false)
  })

  test('exact file entries and one-level globs match', () => {
    assert.equal(isCoveredByFiles('index.mjs', ['index.mjs']), true)
    assert.equal(isCoveredByFiles('lib/a.js', ['lib/*.js']), true)
    assert.equal(isCoveredByFiles('lib/a.ts', ['lib/*.js']), false)
  })
})

describe('pack-contents / classifyPackEntries', () => {
  test('scaffolding prefixes are flagged regardless of files field', () => {
    const c = classifyPackEntries(
      ['.claude/settings.json', 'scripts/fleet/lint.mts', 'template/base/x'],
      undefined,
    )
    assert.equal(c.scaffolding.length, 3)
    assert.equal(c.clean.length, 0)
  })

  test('hidden files + logs are flagged; .npmignore is allowed', () => {
    const c = classifyPackEntries(
      ['.env.local', 'sub/.DS_Store', 'debug.log', '.npmignore'],
      undefined,
    )
    assert.deepEqual(c.hidden.toSorted(), [
      '.env.local',
      'debug.log',
      'sub/.DS_Store',
    ])
    assert.deepEqual(c.clean, ['.npmignore'])
  })

  test('always-allowed root files pass even with a tight files field', () => {
    const c = classifyPackEntries(
      ['package.json', 'README.md', 'LICENSE', 'CHANGELOG.md', 'lib/i.js'],
      ['lib'],
    )
    assert.equal(c.outsideFiles.length, 0)
    assert.equal(c.clean.length, 5)
  })

  test('entries outside the files contract are flagged', () => {
    const c = classifyPackEntries(['lib/i.js', 'stray.js'], ['lib'])
    assert.deepEqual(c.outsideFiles, ['stray.js'])
    assert.deepEqual(c.clean, ['lib/i.js'])
  })

  test('a realistic clean tarball classifies fully clean', () => {
    const c = classifyPackEntries(
      ['package.json', 'README.md', 'lib/index.mjs', 'wasm/acorn.wasm'],
      ['README.md', 'lib/index.mjs', 'wasm/acorn.wasm'],
    )
    assert.equal(
      c.scaffolding.length + c.hidden.length + c.outsideFiles.length,
      0,
    )
  })
})
