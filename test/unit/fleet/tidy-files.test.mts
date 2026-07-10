// vitest specs for tidy-files — the pure junk-pattern + stray-tmp predicates.

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'

import {
  findStrayTmp,
  isJunkBasename,
} from '../../../.claude/skills/fleet/tidying-files/lib/tidy-files.mts'

describe('isJunkBasename', () => {
  test('flags OS cruft', () => {
    assert.ok(isJunkBasename('.DS_Store'))
    assert.ok(isJunkBasename('Thumbs.db'))
    assert.ok(isJunkBasename('Desktop.ini'))
  })

  test('flags .DS_Store variants', () => {
    assert.ok(isJunkBasename('.DS_Store?'))
    assert.ok(isJunkBasename('._.DS_Store'))
  })

  test('flags editor / merge / build stragglers by suffix', () => {
    assert.ok(isJunkBasename('foo.orig'))
    assert.ok(isJunkBasename('bar.rej'))
    assert.ok(isJunkBasename('.index.swp'))
    assert.ok(isJunkBasename('mod.pyc'))
  })

  test('flags tilde backups', () => {
    assert.ok(isJunkBasename('config~'))
    assert.ok(!isJunkBasename('~'))
  })

  test('does NOT flag ordinary source/config files', () => {
    assert.ok(!isJunkBasename('index.mts'))
    assert.ok(!isJunkBasename('package.json'))
    assert.ok(!isJunkBasename('README.md'))
    assert.ok(!isJunkBasename('.gitignore'))
    assert.ok(!isJunkBasename('original.ts'))
  })
})

describe('findStrayTmp', () => {
  test('returns empty for a tmp dir with no scratch (missing dir → [])', () => {
    assert.deepEqual(findStrayTmp('/nonexistent-tmp-dir-xyz'), [])
  })
})
