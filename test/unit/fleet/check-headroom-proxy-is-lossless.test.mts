// vitest specs for headroom-proxy-is-lossless — the pure PROXY_ARGS detector
// that keeps the headroom proxy fully lossless (the default token mode is LOSSY:
// CCR + Kompress ML abbreviate content and garble proper nouns in large tool
// reads). The filesystem orchestration (main) is covered by `check --all`.

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'

import {
  missingProxyFlags,
  REQUIRED_PROXY_FLAGS,
} from '../../../scripts/fleet/check/headroom-proxy-is-lossless.mts'

const BOTH = `const PROXY_ARGS = ['proxy', '--port', String(P), '--no-telemetry', '--lossless', '--disable-kompress']`

describe('headroom-proxy-is-lossless — missingProxyFlags', () => {
  test('both flags present → nothing missing', () => {
    assert.deepEqual(missingProxyFlags(BOTH), [])
  })
  test('both present across a multi-line literal → nothing missing', () => {
    const src = [
      'const PROXY_ARGS = [',
      "  'proxy',",
      "  '--no-telemetry',",
      "  '--lossless',",
      "  '--disable-kompress',",
      ']',
    ].join('\n')
    assert.deepEqual(missingProxyFlags(src), [])
  })
  test('missing --disable-kompress is reported', () => {
    const src = `const PROXY_ARGS = ['proxy', '--no-telemetry', '--lossless']`
    assert.deepEqual(missingProxyFlags(src), ['--disable-kompress'])
  })
  test('missing both is reported (sorted)', () => {
    const src = `const PROXY_ARGS = ['proxy', '--no-telemetry']`
    assert.deepEqual(missingProxyFlags(src), [...REQUIRED_PROXY_FLAGS])
  })
  test('a flag outside the literal does not count', () => {
    const src = `// mentions --lossless --disable-kompress\nconst PROXY_ARGS = ['proxy']`
    assert.deepEqual(missingProxyFlags(src), [...REQUIRED_PROXY_FLAGS])
  })
  test('no PROXY_ARGS at all → all required missing', () => {
    assert.deepEqual(missingProxyFlags('const OTHER = []'), [
      ...REQUIRED_PROXY_FLAGS,
    ])
  })
})
