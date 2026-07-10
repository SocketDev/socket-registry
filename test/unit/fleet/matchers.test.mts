// vitest specs for the toContainPath matcher: the pure result helper plus the
// registered matcher (proving expect.extend wired it up via setup.mts).

import { expect, test } from 'vitest'

import { toContainPathResult } from '../../_shared/fleet/lib/matchers.mts'

test('toContainPathResult matches regardless of separators', () => {
  // Backslash actual vs forward-slash expected (the Windows case).
  expect(
    toContainPathResult('C:\\a\\b\\python\\python.exe', 'python/python.exe')
      .pass,
  ).toBe(true)
  // Forward-slash actual vs backslash expected.
  expect(toContainPathResult('/a/b/c/d', 'c\\d').pass).toBe(true)
})

test('toContainPathResult fails when the path is genuinely absent', () => {
  expect(toContainPathResult('/a/b/c', '/x/y').pass).toBe(false)
})

test('toContainPathResult rejects a non-string received value', () => {
  const result = toContainPathResult(undefined, '/a')
  expect(result.pass).toBe(false)
  expect(result.message()).toContain('expected a string path')
})

test('the registered toContainPath matcher is available via expect.extend', () => {
  // setup.mts registered it globally; a win-style actual matches a posix
  // expected without the test branching on platform.
  expect('C:\\users\\<user>\\.socket\\_dlx\\python').toContainPath(
    '.socket/_dlx/python',
  )
  expect('/home/<user>/.socket/_dlx/python').toContainPath(
    '.socket/_dlx/python',
  )
})
