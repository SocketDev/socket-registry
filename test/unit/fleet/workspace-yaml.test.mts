// vitest specs for scripts/fleet/lib/workspace-yaml.mts

import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import {
  parseCatalogBlock,
  parseListBlock,
  parseNamedCatalogs,
  spliceCatalogEntry,
} from '../../../scripts/fleet/lib/workspace-yaml.mts'

// ── parseCatalogBlock (blockKey variant) ────────────────────────────────────

describe('parseCatalogBlock', () => {
  test('parses default catalog: block', () => {
    const yaml = `catalog:\n  foo: 1.2.3\n  bar: 4.5.6\n`
    assert.deepEqual(parseCatalogBlock(yaml), { foo: '1.2.3', bar: '4.5.6' })
  })

  test('parses a named blockKey (catalogOptional)', () => {
    const yaml = [
      'catalog:',
      "  vitest: '4.1.9'",
      '',
      'catalogOptional:',
      "  'rolldown': 1.1.4",
      "  'vite': 8.1.0",
    ].join('\n')
    const result = parseCatalogBlock(yaml, { blockKey: 'catalogOptional' })
    assert.deepEqual(result, { rolldown: '1.1.4', vite: '8.1.0' })
  })

  test('parses overrides: block via blockKey', () => {
    const yaml = [
      'overrides:',
      "  '@socketsecurity/lib': catalog:",
      "  'rolldown': catalog:",
    ].join('\n')
    const result = parseCatalogBlock(yaml, { blockKey: 'overrides' })
    assert.deepEqual(result, {
      '@socketsecurity/lib': 'catalog:',
      rolldown: 'catalog:',
    })
  })

  test('returns empty object when blockKey is absent', () => {
    const yaml = `catalog:\n  foo: 1.0.0\n`
    assert.deepEqual(
      parseCatalogBlock(yaml, { blockKey: 'catalogOptional' }),
      {},
    )
  })
})

// ── parseListBlock ───────────────────────────────────────────────────────────

describe('parseListBlock', () => {
  test('parses packages: list', () => {
    const yaml = ['packages:', "  - 'packages/*'", '  - .', '  # comment'].join(
      '\n',
    )
    assert.deepEqual(parseListBlock(yaml, { blockKey: 'packages' }), [
      'packages/*',
      '.',
    ])
  })

  test('preserves negation patterns', () => {
    const yaml = ['packages:', "  - '.'", "  - '!test-fixtures/*'"].join('\n')
    const results = parseListBlock(yaml, { blockKey: 'packages' })
    assert.ok(results.includes('!test-fixtures/*'))
  })

  test('returns empty array when blockKey is absent', () => {
    assert.deepEqual(
      parseListBlock('packages:\n  - .\n', { blockKey: 'other' }),
      [],
    )
  })

  test('stops at the next top-level key', () => {
    const yaml = ['packages:', '  - .', 'catalog:', '  foo: 1.0.0'].join('\n')
    assert.deepEqual(parseListBlock(yaml, { blockKey: 'packages' }), ['.'])
  })
})

// ── parseNamedCatalogs ───────────────────────────────────────────────────────

describe('parseNamedCatalogs', () => {
  test('parses named catalog sub-blocks', () => {
    const yaml = [
      'catalogs:',
      '  react17:',
      '    react: 17.0.2',
      '    react-dom: 17.0.2',
      '  react18:',
      '    react: 18.3.1',
    ].join('\n')
    const result = parseNamedCatalogs(yaml)
    assert.deepEqual(result, {
      react17: { react: '17.0.2', 'react-dom': '17.0.2' },
      react18: { react: '18.3.1' },
    })
  })

  test('returns empty object when catalogs: block is absent', () => {
    assert.deepEqual(parseNamedCatalogs('catalog:\n  foo: 1.0.0\n'), {})
  })
})

// ── spliceCatalogEntry ───────────────────────────────────────────────────────

describe('spliceCatalogEntry', () => {
  test('inserts alphabetically into an existing catalog block', () => {
    const yaml = ['catalog:', "  'aaa': 1.0.0", "  'zzz': 9.0.0", ''].join('\n')
    const result = spliceCatalogEntry(yaml, 'mmm', '5.0.0')
    assert.ok(result.includes("  'mmm': 5.0.0"))
    const lines = result.split('\n')
    const aaaIdx = lines.findIndex(l => l.includes('aaa'))
    const mmmIdx = lines.findIndex(l => l.includes('mmm'))
    const zzzIdx = lines.findIndex(l => l.includes('zzz'))
    assert.ok(aaaIdx < mmmIdx && mmmIdx < zzzIdx)
  })

  test('is idempotent (no-op if entry already current)', () => {
    const yaml = ['catalog:', "  'rolldown': 1.1.4", ''].join('\n')
    const result = spliceCatalogEntry(yaml, 'rolldown', '1.1.4')
    assert.equal(result, yaml)
  })
})
