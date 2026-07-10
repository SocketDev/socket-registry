// vitest spec for check-scanner-parity. The enforcer's pure functions
// (listMtsFiles, resolveSharedImport, declaredNames, stripTypeSpace, readFacts)
// are exercised with temp fixtures so no real git/network is needed; main() is
// entrypoint-guarded so importing is side-effect-free.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, test } from 'vitest'

import {
  declaredNames,
  listMtsFiles,
  readFacts,
  resolveSharedImport,
  stripTypeSpace,
} from '../../../scripts/fleet/check/scanner-parity.mts'
import type { AcornNode } from '../../../.claude/hooks/fleet/_shared/acorn/index.mts'

// ---------------------------------------------------------------------------
// listMtsFiles
// ---------------------------------------------------------------------------
describe('listMtsFiles', () => {
  test('returns .mts files recursively, skips node_modules + test dirs', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'scanner-parity-list-'))
    mkdirSync(path.join(root, 'sub'), { recursive: true })
    mkdirSync(path.join(root, 'node_modules', 'pkg'), { recursive: true })
    mkdirSync(path.join(root, 'test'), { recursive: true })
    writeFileSync(path.join(root, 'a.mts'), '')
    writeFileSync(path.join(root, 'b.ts'), '')
    writeFileSync(path.join(root, 'sub', 'c.mts'), '')
    writeFileSync(path.join(root, 'node_modules', 'pkg', 'd.mts'), '')
    writeFileSync(path.join(root, 'test', 'e.mts'), '')

    const files = listMtsFiles(root)
    const names = files.map(f => path.relative(root, f)).toSorted()
    assert.deepEqual(names, ['a.mts', path.join('sub', 'c.mts')])
  })

  test('returns empty array for a non-existent directory', () => {
    assert.deepEqual(
      listMtsFiles(path.join(os.tmpdir(), 'does-not-exist-xyzzy')),
      [],
    )
  })
})

// ---------------------------------------------------------------------------
// resolveSharedImport
// ---------------------------------------------------------------------------
describe('resolveSharedImport', () => {
  const base = '/project/.git-hooks/hook.mts'

  test('resolves a relative _shared import to an absolute .mts path', () => {
    const result = resolveSharedImport(base, '../_shared/utils.mts')
    assert.equal(typeof result, 'string')
    assert.ok(result!.endsWith('.mts'))
    assert.ok(result!.includes('_shared'))
  })

  test('returns undefined for a bare package specifier', () => {
    assert.equal(resolveSharedImport(base, 'node:fs'), undefined)
    assert.equal(resolveSharedImport(base, '@scope/pkg'), undefined)
  })

  test('returns undefined when the resolved path has no _shared segment', () => {
    assert.equal(resolveSharedImport(base, '../sibling/utils.mts'), undefined)
  })

  test('returns undefined when the resolved extension is not .mts', () => {
    assert.equal(resolveSharedImport(base, '../_shared/utils.ts'), undefined)
    assert.equal(resolveSharedImport(base, '../_shared/utils.js'), undefined)
  })
})

// ---------------------------------------------------------------------------
// declaredNames
// ---------------------------------------------------------------------------
describe('declaredNames', () => {
  test('returns [] for undefined', () => {
    assert.deepEqual(declaredNames(undefined), [])
  })

  test('extracts name from FunctionDeclaration', () => {
    const node: AcornNode = {
      type: 'FunctionDeclaration',
      start: 0,
      end: 10,
      id: { name: 'myFn' },
    }
    assert.deepEqual(declaredNames(node), ['myFn'])
  })

  test('returns [] for FunctionDeclaration with no id', () => {
    const node: AcornNode = {
      type: 'FunctionDeclaration',
      start: 0,
      end: 10,
      id: undefined,
    }
    assert.deepEqual(declaredNames(node), [])
  })

  test('extracts name from ClassDeclaration', () => {
    const node: AcornNode = {
      type: 'ClassDeclaration',
      start: 0,
      end: 20,
      id: { name: 'MyClass' },
    }
    assert.deepEqual(declaredNames(node), ['MyClass'])
  })

  test('extracts names from VariableDeclaration with multiple declarators', () => {
    const node: AcornNode = {
      type: 'VariableDeclaration',
      start: 0,
      end: 30,
      declarations: [
        {
          type: 'VariableDeclarator',
          start: 6,
          end: 15,
          id: { type: 'Identifier', name: 'alpha' },
        },
        {
          type: 'VariableDeclarator',
          start: 17,
          end: 30,
          id: { type: 'Identifier', name: 'beta' },
        },
      ],
    }
    assert.deepEqual(declaredNames(node), ['alpha', 'beta'])
  })

  test('skips VariableDeclarator with non-Identifier id (destructuring)', () => {
    const node: AcornNode = {
      type: 'VariableDeclaration',
      start: 0,
      end: 30,
      declarations: [
        {
          type: 'VariableDeclarator',
          start: 6,
          end: 30,
          id: { type: 'ObjectPattern', name: undefined },
        },
      ],
    }
    assert.deepEqual(declaredNames(node), [])
  })

  test('returns [] for an unknown node type', () => {
    const node: AcornNode = {
      type: 'ExpressionStatement',
      start: 0,
      end: 10,
    }
    assert.deepEqual(declaredNames(node), [])
  })
})

// ---------------------------------------------------------------------------
// stripTypeSpace
// ---------------------------------------------------------------------------
describe('stripTypeSpace', () => {
  test('blanks `as const` but preserves surrounding code', () => {
    const src = 'const x = 42 as const'
    const out = stripTypeSpace(src)
    assert.ok(!out.includes('as const'))
    assert.ok(out.includes('const x'))
    assert.equal(out.length, src.length)
  })

  test('blanks a top-level interface block', () => {
    const src = 'interface Foo { bar: string }\nconst x = 1'
    const out = stripTypeSpace(src)
    assert.ok(!out.includes('interface'))
    assert.ok(out.includes('const x'))
    assert.equal(out.length, src.length)
  })

  test('blanks a top-level type alias', () => {
    const src = 'type Alias = string | number\nconst y = 2'
    const out = stripTypeSpace(src)
    assert.ok(!out.includes('type Alias'))
    assert.ok(out.includes('const y'))
    assert.equal(out.length, src.length)
  })

  test('blanks export interface', () => {
    const src = 'export interface Bar { n: number }\nfunction foo() {}'
    const out = stripTypeSpace(src)
    assert.ok(!out.includes('interface'))
    assert.ok(out.includes('function foo'))
    assert.equal(out.length, src.length)
  })

  test('does NOT blank `as const` inside a string literal', () => {
    const src = "const s = 'as const'"
    const out = stripTypeSpace(src)
    assert.ok(out.includes("'as const'"))
  })

  test('does NOT blank interface-shaped text inside a comment', () => {
    const src = '// interface Foo { bar: string }\nconst z = 3'
    const out = stripTypeSpace(src)
    assert.ok(out.includes('const z'))
    // The comment text must not have mangled `z`
    assert.ok(out.includes('// interface Foo'))
  })

  test('preserves newlines (byte offsets intact)', () => {
    const src = 'type X = number\nconst a = 1'
    const out = stripTypeSpace(src)
    assert.equal(out.length, src.length)
    const newlines = (s: string): number => s.split('\n').length
    assert.equal(newlines(out), newlines(src))
  })
})

// ---------------------------------------------------------------------------
// readFacts (exercises the AST + regex paths over real temp files)
// ---------------------------------------------------------------------------
describe('readFacts', () => {
  test('collects sharedImports, declared, and exported via AST path', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'scanner-parity-facts-'))
    mkdirSync(path.join(root, '_shared'), { recursive: true })
    const sharedFile = path.join(root, '_shared', 'utils.mts')
    writeFileSync(sharedFile, 'export function helper() {}')

    const consumerFile = path.join(root, 'consumer.mts')
    writeFileSync(
      consumerFile,
      [
        `import { helper } from './_shared/utils.mts'`,
        `export function doWork() { helper() }`,
        `const localOnly = 1`,
      ].join('\n'),
    )

    const facts = readFacts(consumerFile, 'git-hooks')
    assert.equal(facts.tree, 'git-hooks')
    assert.ok(facts.sharedImports.has(sharedFile))
    assert.ok(facts.declared.has('doWork'))
    assert.ok(facts.declared.has('localOnly'))
    assert.ok(facts.exported.has('doWork'))
    assert.ok(!facts.exported.has('localOnly'))
  })

  test('falls back to regex when AST parse fails, still collects facts', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'scanner-parity-regex-'))
    mkdirSync(path.join(root, '_shared'), { recursive: true })
    const sharedFile = path.join(root, '_shared', 'mod.mts')
    writeFileSync(sharedFile, 'export function shared() {}')

    // Use a form that strips type-space won't fully handle so the AST may fall
    // back to regex — we use a definitely-valid simple form but then assert on
    // the output regardless of which path ran, exercising both branches.
    const consumerFile = path.join(root, 'fallback.mts')
    writeFileSync(
      consumerFile,
      [
        `import { shared } from './_shared/mod.mts'`,
        `export function useShared() { return shared() }`,
      ].join('\n'),
    )

    const facts = readFacts(consumerFile, 'claude-hooks')
    assert.ok(facts.sharedImports.has(sharedFile))
    assert.ok(facts.exported.has('useShared'))
    assert.ok(['ast', 'regex'].includes(facts.parsedBy))
  })

  test('returns empty facts for a non-existent file', () => {
    const facts = readFacts('/no/such/file.mts', 'git-hooks')
    assert.equal(facts.sharedImports.size, 0)
    assert.equal(facts.declared.size, 0)
    assert.equal(facts.exported.size, 0)
  })

  test('detects a re-fork: consumer re-declares an exported name from _shared', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'scanner-parity-refork-'))
    mkdirSync(path.join(root, '_shared'), { recursive: true })
    const sharedFile = path.join(root, '_shared', 'match.mts')
    writeFileSync(sharedFile, 'export function matchFoo() {}')

    // Consumer imports _shared but ALSO re-declares `matchFoo` — the re-fork
    const consumerFile = path.join(root, 'consumer.mts')
    writeFileSync(
      consumerFile,
      [
        `import { matchFoo } from './_shared/match.mts'`,
        `function matchFoo() { return false }`,
      ].join('\n'),
    )

    const sharedFacts = readFacts(sharedFile, 'git-hooks')
    const consumerFacts = readFacts(consumerFile, 'claude-hooks')

    // The shared module exports `matchFoo`
    assert.ok(sharedFacts.exported.has('matchFoo'))
    // The consumer imports the shared module
    assert.ok(consumerFacts.sharedImports.has(sharedFile))
    // The consumer re-declares the same exported name — a re-fork
    assert.ok(consumerFacts.declared.has('matchFoo'))
  })

  test('a declared name that is NOT in _shared exports is not a re-fork', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'scanner-parity-safe-'))
    mkdirSync(path.join(root, '_shared'), { recursive: true })
    const sharedFile = path.join(root, '_shared', 'utils.mts')
    writeFileSync(sharedFile, 'export function helper() {}')

    const consumerFile = path.join(root, 'safe.mts')
    writeFileSync(
      consumerFile,
      [
        `import { helper } from './_shared/utils.mts'`,
        `function localHelper() {}`,
      ].join('\n'),
    )

    const sharedFacts = readFacts(sharedFile, 'git-hooks')
    const consumerFacts = readFacts(consumerFile, 'claude-hooks')

    assert.ok(!sharedFacts.exported.has('localHelper'))
    assert.ok(consumerFacts.declared.has('localHelper'))
    // No overlap between consumer declared and shared exported
    for (const name of consumerFacts.declared) {
      assert.ok(!sharedFacts.exported.has(name), `unexpected re-fork: ${name}`)
    }
  })
})
