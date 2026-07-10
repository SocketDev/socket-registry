// vitest spec for check-setup-is-prompt-less. The exported pure functions
// (isMac + parseTtl) are exercised directly with no I/O; main() is
// entrypoint-guarded so importing is side-effect-free.

import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import {
  isMac,
  parseTtl,
} from '../../../scripts/fleet/check/setup-is-prompt-less.mts'

describe('parseTtl', () => {
  test('parses a single directive', () => {
    assert.equal(
      parseTtl('default-cache-ttl 28800', 'default-cache-ttl'),
      28_800,
    )
  })

  test('returns undefined when directive is absent', () => {
    assert.equal(
      parseTtl('max-cache-ttl 28800', 'default-cache-ttl'),
      undefined,
    )
  })

  test('ignores comment lines', () => {
    const content = '# default-cache-ttl 9999\ndefault-cache-ttl 28800'
    assert.equal(parseTtl(content, 'default-cache-ttl'), 28_800)
  })

  test('ignores trailing inline comments', () => {
    const content = 'default-cache-ttl 28800 # 8 hours'
    assert.equal(parseTtl(content, 'default-cache-ttl'), 28_800)
  })

  test('last occurrence wins on duplicates', () => {
    const content = 'default-cache-ttl 600\ndefault-cache-ttl 28800'
    assert.equal(parseTtl(content, 'default-cache-ttl'), 28_800)
  })

  test('returns undefined for empty content', () => {
    assert.equal(parseTtl('', 'default-cache-ttl'), undefined)
  })

  test('parses max-cache-ttl', () => {
    assert.equal(parseTtl('max-cache-ttl 57600', 'max-cache-ttl'), 57_600)
  })

  test('returns undefined when value is below threshold', () => {
    const ttl = parseTtl('default-cache-ttl 600', 'default-cache-ttl')
    assert.equal(ttl, 600)
    assert.equal(ttl! < 28_800, true)
  })
})

describe('isMac', () => {
  test('returns a boolean', () => {
    const result = isMac()
    assert.equal(typeof result, 'boolean')
  })

  test('matches os.platform() === darwin', async () => {
    const os = await import('node:os')
    assert.equal(isMac(), os.platform() === 'darwin')
  })
})
