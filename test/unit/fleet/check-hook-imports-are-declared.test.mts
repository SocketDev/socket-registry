// vitest specs for hook-imports-are-declared. Covers the pure specifier
// extraction + resolution helpers, the declared-names reader, and the
// findUndeclaredImports diagnosis — plus a regression fixture for the exact
// false-positive this check's regex tripped over during development: an
// unbounded `[^;]*?` gap walking from an unrelated `export const x = [...]`
// straight through to an unconnected `from` inside a later string literal.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import {
  extractImportSpecifiers,
  findUndeclaredImports,
  listMtsFiles,
  packageNameFromSpecifier,
  readDeclaredPackageNames,
  readHookFiles,
} from '../../../scripts/fleet/check/hook-imports-are-declared.mts'

// ── packageNameFromSpecifier ────────────────────────────────────

test('packageNameFromSpecifier: scoped package with no subpath', () => {
  assert.equal(
    packageNameFromSpecifier('@socketsecurity/lib-stable'),
    '@socketsecurity/lib-stable',
  )
})

test('packageNameFromSpecifier: scoped subpath resolves to the package name', () => {
  assert.equal(
    packageNameFromSpecifier('@socketsecurity/lib-stable/logger/default'),
    '@socketsecurity/lib-stable',
  )
})

test('packageNameFromSpecifier: unscoped package with no subpath', () => {
  assert.equal(packageNameFromSpecifier('neosanitize'), 'neosanitize')
})

test('packageNameFromSpecifier: unscoped subpath resolves to the first segment', () => {
  assert.equal(packageNameFromSpecifier('shell-quote/lib/parse'), 'shell-quote')
})

test('packageNameFromSpecifier: relative specifiers name no package', () => {
  assert.equal(packageNameFromSpecifier('./local.mts'), undefined)
  assert.equal(packageNameFromSpecifier('../shared/guard.mts'), undefined)
})

test('packageNameFromSpecifier: node: builtins name no package', () => {
  assert.equal(packageNameFromSpecifier('node:path'), undefined)
  assert.equal(packageNameFromSpecifier('node:fs/promises'), undefined)
})

test('packageNameFromSpecifier: empty specifier resolves to undefined', () => {
  assert.equal(packageNameFromSpecifier(''), undefined)
})

// ── extractImportSpecifiers ─────────────────────────────────────

test('extractImportSpecifiers: named import', () => {
  assert.deepEqual(
    extractImportSpecifiers("import { foo } from 'a-package'\n"),
    ['a-package'],
  )
})

test('extractImportSpecifiers: default import', () => {
  assert.deepEqual(extractImportSpecifiers("import foo from 'pkg'\n"), ['pkg'])
})

test('extractImportSpecifiers: import type is still captured (needed for tsc)', () => {
  assert.deepEqual(
    extractImportSpecifiers("import type { Foo } from '@scope/typed'\n"),
    ['@scope/typed'],
  )
})

test('extractImportSpecifiers: export … from re-export', () => {
  assert.deepEqual(
    extractImportSpecifiers("export { reexported } from 'another-pkg'\n"),
    ['another-pkg'],
  )
})

test('extractImportSpecifiers: export type … from re-export', () => {
  assert.deepEqual(
    extractImportSpecifiers("export type { Foo } from '@scope/typed'\n"),
    ['@scope/typed'],
  )
})

test('extractImportSpecifiers: bare side-effect import', () => {
  assert.deepEqual(extractImportSpecifiers("import '@scope/side-effect'\n"), [
    '@scope/side-effect',
  ])
})

test('extractImportSpecifiers: multi-line named-import list', () => {
  const content = [
    'import {',
    '  parseNpmSpecifier,',
    '  stringify,',
    "} from '@socketregistry/packageurl-js-stable'",
    '',
  ].join('\n')
  assert.deepEqual(extractImportSpecifiers(content), [
    '@socketregistry/packageurl-js-stable',
  ])
})

test('extractImportSpecifiers: relative specifiers are extracted raw (filtered later)', () => {
  assert.deepEqual(extractImportSpecifiers("import x from './local.mts'\n"), [
    './local.mts',
  ])
})

test('extractImportSpecifiers: dynamic import() is not static — never matched', () => {
  assert.deepEqual(
    extractImportSpecifiers("const mod = await import('some-package')\n"),
    [],
  )
})

test('extractImportSpecifiers: require() is not a static import — never matched', () => {
  assert.deepEqual(
    extractImportSpecifiers("const mod = require('some-package')\n"),
    [],
  )
})

test('extractImportSpecifiers: import.meta.url is not a specifier', () => {
  assert.deepEqual(
    extractImportSpecifiers('void runHook(hook, import.meta.url)\n'),
    [],
  )
})

// Regression: the check's first draft used an unbounded `[^;]*?` gap between
// `import`/`export` and `from`. Since TS/JS statements don't require a
// terminating `;` (ASI), that gap walked straight through an unrelated
// `export const triggers = [...]` all the way to an unconnected `from` inside
// a LATER string literal (a hook's own reminder text), capturing the source
// code in between as a bogus "specifier". This fixture reproduces the exact
// shape that shipped that false positive.
test('extractImportSpecifiers: does not cross an unrelated statement via ASI to a later `from` inside a string', () => {
  const content = [
    "export const triggers = ['push']",
    '',
    'function formatReminder(): string {',
    '  const lines: string[] = []',
    "  lines.push('')",
    "  lines.push('members cascade from')",
    "  lines.push('not walk away from a red run')",
    "  return lines.join('\\n')",
    '}',
    '',
  ].join('\n')
  assert.deepEqual(extractImportSpecifiers(content), [])
})

test('extractImportSpecifiers: still finds a real import ahead of a later unrelated `from` string', () => {
  const content = [
    "import { bashGuard } from '../_shared/guard.mts'",
    '',
    "export const triggers = ['push']",
    '',
    'function reminder(): string {',
    "  return 'members cascade from origin/main'",
    '}',
    '',
  ].join('\n')
  assert.deepEqual(extractImportSpecifiers(content), ['../_shared/guard.mts'])
})

// ── readDeclaredPackageNames ─────────────────────────────────────

test('readDeclaredPackageNames: reads dependencies + devDependencies', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'hook-imports-declared-'))
  const pkgPath = path.join(dir, 'package.json')
  writeFileSync(
    pkgPath,
    JSON.stringify({
      dependencies: { 'a-package': '1.0.0' },
      devDependencies: { 'b-package': 'catalog:' },
    }),
  )
  const names = readDeclaredPackageNames(pkgPath)
  assert.ok(names.has('a-package'))
  assert.ok(names.has('b-package'))
  assert.equal(names.size, 2)
})

test('readDeclaredPackageNames: missing file yields an empty set', () => {
  assert.deepEqual(readDeclaredPackageNames('/no/such/package.json'), new Set())
})

test('readDeclaredPackageNames: unparseable JSON yields an empty set', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'hook-imports-declared-'))
  const pkgPath = path.join(dir, 'package.json')
  writeFileSync(pkgPath, '{ not valid json')
  assert.deepEqual(readDeclaredPackageNames(pkgPath), new Set())
})

// ── findUndeclaredImports ────────────────────────────────────────

test('findUndeclaredImports: a declared import produces no finding', () => {
  const files = new Map([['hook/index.mts', "import { x } from 'a-package'\n"]])
  const findings = findUndeclaredImports(files, new Set(['a-package']))
  assert.deepEqual(findings, [])
})

test('findUndeclaredImports: an undeclared import is reported', () => {
  const files = new Map([
    ['hook/index.mts', "import { x } from 'undeclared-package'\n"],
  ])
  const findings = findUndeclaredImports(files, new Set())
  assert.deepEqual(findings, [
    {
      file: 'hook/index.mts',
      packageName: 'undeclared-package',
      specifier: 'undeclared-package',
    },
  ])
})

test('findUndeclaredImports: a node: builtin is never flagged', () => {
  const files = new Map([['hook/index.mts', "import path from 'node:path'\n"]])
  assert.deepEqual(findUndeclaredImports(files, new Set()), [])
})

test('findUndeclaredImports: a relative import is never flagged', () => {
  const files = new Map([
    ['hook/index.mts', "import { guard } from '../_shared/guard.mts'\n"],
  ])
  assert.deepEqual(findUndeclaredImports(files, new Set()), [])
})

test('findUndeclaredImports: dedupes multiple undeclared subpaths of the same package in one file', () => {
  const files = new Map([
    [
      'hook/index.mts',
      [
        "import { a } from '@scope/pkg/a'",
        "import { b } from '@scope/pkg/b'",
        '',
      ].join('\n'),
    ],
  ])
  const findings = findUndeclaredImports(files, new Set())
  assert.equal(findings.length, 1)
  assert.equal(findings[0]?.packageName, '@scope/pkg')
})

test('findUndeclaredImports: reports one finding per distinct undeclared package, sorted', () => {
  const files = new Map([
    [
      'hook/index.mts',
      [
        "import { a } from 'z-package'",
        "import { b } from 'a-package'",
        '',
      ].join('\n'),
    ],
  ])
  const findings = findUndeclaredImports(files, new Set())
  assert.deepEqual(
    findings.map(f => f.packageName),
    ['a-package', 'z-package'],
  )
})

// ── listMtsFiles / readHookFiles ─────────────────────────────────

test('listMtsFiles: missing directory yields []', () => {
  assert.deepEqual(listMtsFiles('/no/such/hooks/dir'), [])
})

test('listMtsFiles: finds .mts files recursively, skips node_modules and dotfiles', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'hook-imports-list-'))
  mkdirSync(path.join(dir, 'sub'), { recursive: true })
  mkdirSync(path.join(dir, 'node_modules', 'x'), { recursive: true })
  mkdirSync(path.join(dir, '.hidden'), { recursive: true })
  writeFileSync(path.join(dir, 'top.mts'), '')
  writeFileSync(path.join(dir, 'sub', 'nested.mts'), '')
  writeFileSync(path.join(dir, 'sub', 'ignore.txt'), '')
  writeFileSync(path.join(dir, 'node_modules', 'x', 'skip.mts'), '')
  writeFileSync(path.join(dir, '.hidden', 'skip.mts'), '')

  const files = listMtsFiles(dir)
    .map(f => path.relative(dir, f))
    .toSorted()
  assert.deepEqual(files, [path.join('sub', 'nested.mts'), 'top.mts'])
})

test('readHookFiles: combines multiple hook dirs and skips a missing tree', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'hook-imports-read-'))
  mkdirSync(path.join(dir, '.claude', 'hooks', 'fleet', 'my-hook'), {
    recursive: true,
  })
  writeFileSync(
    path.join(dir, '.claude', 'hooks', 'fleet', 'my-hook', 'index.mts'),
    "import { x } from 'a-package'\n",
  )
  const files = readHookFiles(dir, [
    path.join('.claude', 'hooks', 'fleet'),
    path.join('.claude', 'hooks', 'repo'),
  ])
  assert.equal(files.size, 1)
  const key = path.join('.claude', 'hooks', 'fleet', 'my-hook', 'index.mts')
  assert.ok(files.has(key))
  assert.equal(files.get(key), "import { x } from 'a-package'\n")
})
