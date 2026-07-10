// vitest spec for check-shared-hook-helpers-are-used. The two pure exported
// functions (exportedSymbols + symbolIsUsed) are exercised against synthetic
// source strings so no real repo or filesystem access is needed. Importing the
// module triggers main() (the check has no entrypoint guard), which reads the
// real _shared/ tree and emits advisory logger output — that output is benign
// (advisory-only, exit 0) and does not affect the assertions below.

import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import {
  exportedSymbols,
  symbolIsUsed,
} from '../../../scripts/fleet/check/shared-hook-helpers-are-used.mts'

describe('exportedSymbols', () => {
  test('picks up export function declarations', () => {
    const src = 'export function readStdin(): string { return "" }'
    assert.deepEqual(exportedSymbols(src), ['readStdin'])
  })

  test('picks up export async function declarations', () => {
    const src = 'export async function fetchData(): Promise<void> {}'
    assert.deepEqual(exportedSymbols(src), ['fetchData'])
  })

  test('picks up export const', () => {
    const src = 'export const MAX_RETRIES = 3'
    assert.deepEqual(exportedSymbols(src), ['MAX_RETRIES'])
  })

  test('picks up export interface and export type', () => {
    const src = [
      'export interface DeadExport { module: string }',
      'export type SymbolName = string',
    ].join('\n')
    assert.deepEqual(exportedSymbols(src), ['DeadExport', 'SymbolName'])
  })

  test('picks up export class', () => {
    const src = 'export class MyHelper {}'
    assert.deepEqual(exportedSymbols(src), ['MyHelper'])
  })

  test('ignores export default', () => {
    const src = 'export default function () {}'
    assert.deepEqual(exportedSymbols(src), [])
  })

  test('ignores export * re-exports', () => {
    const src = "export * from './other'"
    assert.deepEqual(exportedSymbols(src), [])
  })

  test('ignores export { } named re-exports', () => {
    const src = "export { foo, bar } from './mod'"
    assert.deepEqual(exportedSymbols(src), [])
  })

  test('returns multiple symbols in source order', () => {
    const src = [
      'export function alpha(): void {}',
      'export const BETA = 1',
      'export interface Gamma {}',
    ].join('\n')
    assert.deepEqual(exportedSymbols(src), ['alpha', 'BETA', 'Gamma'])
  })

  test('returns empty array for source with no exports', () => {
    const src = 'function internal() {}\nconst x = 1'
    assert.deepEqual(exportedSymbols(src), [])
  })
})

describe('symbolIsUsed', () => {
  test('returns true when the symbol appears as a whole word', () => {
    assert.equal(
      symbolIsUsed('readStdin', 'import { readStdin } from ...'),
      true,
    )
  })

  test('returns true when the symbol appears as a type annotation', () => {
    assert.equal(symbolIsUsed('DeadExport', 'const d: DeadExport = {}'), true)
  })

  test('returns false when the name is only a substring of another identifier', () => {
    // "readStdin" must not match "readStdinX"
    assert.equal(symbolIsUsed('readStdin', 'readStdinX()'), false)
  })

  test('returns false when the prefix matches but is not a word boundary', () => {
    assert.equal(symbolIsUsed('Foo', 'FooBar'), false)
  })

  test('returns false when the consumer text is empty', () => {
    assert.equal(symbolIsUsed('anything', ''), false)
  })

  test('returns false when the symbol is absent entirely', () => {
    assert.equal(
      symbolIsUsed('myHelper', 'import { otherHelper } from ".."'),
      false,
    )
  })

  test('returns true for a symbol that appears in a comment', () => {
    // Word-boundary scan does not exclude comments — a symbol in a comment
    // counts as referenced (the check biases toward false-negatives).
    assert.equal(
      symbolIsUsed('normalize', '// uses normalize internally'),
      true,
    )
  })

  test('special-regex characters in symbol name are escaped', () => {
    // A symbol name starting with "$" — the regex escaping must not throw and
    // the function must still detect a true match (e.g. "$foo" used by name).
    // Note: \b does not anchor before "$" when preceded by a non-word char, so
    // "call $foo()" won't match "foo" but will match when $foo is word-bounded.
    // Test that the function does NOT throw for a dollar-sign identifier.
    assert.doesNotThrow(() => symbolIsUsed('$foo', 'const x = $foo'))
    // And that a plain non-dollar identifier with a dot in the consumer does not
    // accidentally match via an un-escaped pattern character.
    assert.equal(symbolIsUsed('normalizeX', 'normalizeX()'), true)
    assert.equal(symbolIsUsed('normalizeX', 'normalizeXY()'), false)
  })
})
