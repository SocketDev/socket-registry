import assert from 'node:assert/strict'

import { test } from 'vitest'

import { collectPackumentFailures } from '../../../scripts/fleet/lib/taze-output.mts'

test('collects distinct sorted packages from timeout lines', () => {
  const output = [
    'checking deps…',
    'Error: Timeout requesting "@socketsecurity/lib"',
    'Error: Timeout requesting "@socketsecurity/lib"',
    'Error: Timeout requesting "acorn"',
    'Already up to date',
  ].join('\n')
  assert.deepEqual(collectPackumentFailures(output), [
    '@socketsecurity/lib',
    'acorn',
  ])
})

test('collects fetch-failure lines alongside timeouts', () => {
  const output = [
    'Error: Failed to fetch package "left-pad": boom',
    'Error: Timeout requesting "zod"',
  ].join('\n')
  assert.deepEqual(collectPackumentFailures(output), ['left-pad', 'zod'])
})

test('clean output collects nothing', () => {
  assert.deepEqual(collectPackumentFailures('Already up to date\n'), [])
  assert.deepEqual(collectPackumentFailures(''), [])
})

test('package specs with scopes and version ranges survive intact', () => {
  const output = 'Error: Timeout requesting "@scope/name@^2.0.0"'
  assert.deepEqual(collectPackumentFailures(output), ['@scope/name@^2.0.0'])
})
