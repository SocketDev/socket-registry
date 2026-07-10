// vitest specs for the make-package-exports engine (pure functions).

import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  applyAliases,
  buildBrowserField,
  buildExportsMap,
  detectExt,
  isDtsExt,
  isPrivatePath,
  matchesGlob,
  NODE_BUILTINS,
  privatePathMatcher,
  publicPathFor,
  resolveSourcePath,
  sortExportsMap,
} from '../../../scripts/fleet/make-package-exports.mts'
import type { ExportsConfig } from '../../../scripts/fleet/make-package-exports.mts'

// ── isPrivatePath: the privacy taxonomy ─────────────────────────

test('isPrivatePath flags external/ + underscore leaves/dirs regardless of dist', () => {
  assert.equal(isPrivatePath('dist/external/foo.js'), true)
  assert.equal(isPrivatePath('external/foo.js'), true)
  assert.equal(isPrivatePath('dist/_internal/x.js'), true)
  assert.equal(isPrivatePath('dist/foo/_helper.js'), true)
  assert.equal(isPrivatePath('_internal/x.js'), true) // no dist
  assert.equal(isPrivatePath('foo/_bar/x.js'), true)
})

test('isPrivatePath leaves public files alone', () => {
  assert.equal(isPrivatePath('dist/arrays/index.js'), false)
  assert.equal(isPrivatePath('index.mjs'), false)
  assert.equal(isPrivatePath('foo/bar.js'), false)
})

test('isPrivatePath honors configured extra private segments', () => {
  // A repo marking privacy with `internal/` (no underscore) opts in via config.
  assert.equal(isPrivatePath('dist/internal/x.js'), false) // default: public
  assert.equal(isPrivatePath('dist/internal/x.js', ['internal']), true)
  // Built-ins still apply alongside the extra segment.
  assert.equal(isPrivatePath('dist/external/x.js', ['internal']), true)
  assert.equal(isPrivatePath('dist/_x.js', ['internal']), true)
  // An unrelated public path is still public.
  assert.equal(isPrivatePath('dist/arrays/sort.js', ['internal']), false)
})

test('privatePathMatcher returns the default RE when no extra segments', () => {
  const re = privatePathMatcher()
  assert.equal(re.test('dist/external/x.js'), true)
  assert.equal(re.test('dist/_x.js'), true)
})

test('buildExportsMap applies configured private segments', () => {
  const config: ExportsConfig = {
    outDir: 'dist',
    privateSegments: ['internal'],
  }
  const files = ['dist/index.js', 'dist/internal/secret.js']
  const map = buildExportsMap(config, files, new Set())
  assert.deepEqual(Object.keys(map), ['.'])
})

// ── detectExt + isDtsExt ────────────────────────────────────────

test('detectExt reads compound declaration extensions', () => {
  assert.equal(detectExt('x.d.ts'), '.d.ts')
  assert.equal(detectExt('x.d.mts'), '.d.mts')
  assert.equal(detectExt('x.d.cts'), '.d.cts')
  assert.equal(detectExt('x.js'), '.js')
  assert.equal(detectExt('x.json'), '.json')
})

test('isDtsExt', () => {
  assert.equal(isDtsExt('.d.ts'), true)
  assert.equal(isDtsExt('.d.mts'), true)
  assert.equal(isDtsExt('.js'), false)
})

// ── publicPathFor: strip dist, drop ext, collapse index ─────────

test('publicPathFor strips dist + collapses index to dir', () => {
  assert.equal(publicPathFor('dist/index.js', 'dist'), '.')
  assert.equal(publicPathFor('dist/arrays/index.js', 'dist'), './arrays')
  assert.equal(publicPathFor('dist/arrays/sort.js', 'dist'), './arrays/sort')
  assert.equal(publicPathFor('dist/foo.d.ts', 'dist'), './foo')
  assert.equal(publicPathFor('dist/data/x.json', 'dist'), './data/x.json')
})

test('publicPathFor handles root-output packages (outDir empty)', () => {
  assert.equal(publicPathFor('index.mjs', ''), '.')
  assert.equal(publicPathFor('sub/thing.js', ''), './sub/thing')
})

// ── resolveSourcePath: dev source condition ─────────────────────

test('resolveSourcePath emits ./src twin when it exists', () => {
  const src = new Set(['arrays/sort.ts'])
  assert.equal(
    resolveSourcePath('dist/arrays/sort.js', 'dist', src),
    './src/arrays/sort.ts',
  )
  // No twin → undefined.
  assert.equal(resolveSourcePath('dist/arrays/gen.js', 'dist', src), undefined)
  // Root-output package (no dist) → no source condition.
  assert.equal(resolveSourcePath('index.mjs', '', src), undefined)
})

// ── buildExportsMap: end-to-end pure build ──────────────────────

const baseConfig: ExportsConfig = { nodeRange: '>=22', outDir: 'dist' }

test('buildExportsMap builds source/types/default conditions + collapses index', () => {
  const files = ['dist/index.js', 'dist/index.d.ts', 'dist/arrays/sort.js']
  const src = new Set(['arrays/sort.ts', 'index.ts'])
  const map = buildExportsMap(baseConfig, files, src)
  assert.deepEqual(map['.'], {
    source: './src/index.ts',
    types: './dist/index.d.ts',
    default: './dist/index.js',
  })
  assert.deepEqual(map['./arrays/sort'], {
    source: './src/arrays/sort.ts',
    types: undefined,
    default: './dist/arrays/sort.js',
  })
})

test('buildExportsMap excludes private files (external/, _*)', () => {
  const files = [
    'dist/index.js',
    'dist/external/dep.js',
    'dist/_internal/secret.js',
    'dist/foo/_priv.js',
  ]
  const map = buildExportsMap(baseConfig, files, new Set())
  assert.deepEqual(Object.keys(map), ['.'])
})

test('buildExportsMap maps json files to their literal path', () => {
  const files = ['dist/data/builtins.json']
  const map = buildExportsMap(baseConfig, files, new Set())
  assert.equal(map['./data/builtins.json'], './dist/data/builtins.json')
})

test('buildExportsMap splices browser condition for browser globs (subtree + leaf)', () => {
  const config: ExportsConfig = {
    outDir: 'dist',
    browser: ['./arrays/**', '**/browser'],
  }
  const files = [
    'dist/arrays/sort.js',
    'dist/fs/read.js',
    'dist/logger/browser.js',
  ]
  const map = buildExportsMap(config, files, new Set())
  const arrays = map['./arrays/sort'] as Record<string, unknown>
  assert.ok(arrays['browser'], 'subtree glob → browser condition')
  // browser spliced BEFORE types/default (most-specific first).
  assert.deepEqual(Object.keys(arrays), [
    'source',
    'browser',
    'types',
    'default',
  ])
  const browserLeaf = map['./logger/browser'] as Record<string, unknown>
  assert.ok(
    browserLeaf['browser'],
    'suffix glob (**/browser) → browser condition',
  )
  const fsLeaf = map['./fs/read'] as Record<string, unknown>
  assert.equal(
    fsLeaf['browser'],
    undefined,
    'unmatched leaf has no browser cond',
  )
})

// ── matchesGlob: shared shallow-glob matcher ────────────────────

test('matchesGlob: literal names, dir prefixes, * and ** globs, ./ tolerance', () => {
  assert.equal(matchesGlob('dist/bin/prim.cjs', 'dist/bin/prim.cjs'), true)
  assert.equal(matchesGlob('dist/external/a.js', 'dist/external/**'), true)
  assert.equal(matchesGlob('dist/external', 'dist/external/**'), false)
  assert.equal(matchesGlob('src/x.ts', 'src/**'), true)
  assert.equal(matchesGlob('dist/index.js', 'dist/bin/prim.cjs'), false)
  // export-path forms: './' tolerated on both target and glob.
  assert.equal(matchesGlob('./arrays/sort', './arrays/**'), true)
  assert.equal(matchesGlob('./logger/browser', '**/browser'), true)
  assert.equal(matchesGlob('./logger/node', '**/browser'), false)
})

test('buildExportsMap applies re-pointer aliases', () => {
  const config: ExportsConfig = {
    outDir: 'dist',
    aliases: [{ from: './errors', to: './errors/message' }],
  }
  const files = ['dist/errors/message.js']
  const map = buildExportsMap(config, files, new Set())
  assert.deepEqual(map['./errors'], map['./errors/message'])
})

test('buildExportsMap alias to a missing target is skipped', () => {
  const config: ExportsConfig = {
    outDir: 'dist',
    aliases: [{ from: './errors', to: './does-not-exist' }],
  }
  const map = buildExportsMap(config, ['dist/index.js'], new Set())
  assert.equal(map['./errors'], undefined)
})

test('buildExportsMap alias with browserTo splices a browser condition', () => {
  // ./logger (Node) routes browser bundlers to ./logger/browser.
  const config: ExportsConfig = {
    outDir: 'dist',
    aliases: [
      { from: './logger', to: './logger/node', browserTo: './logger/browser' },
    ],
  }
  const files = ['dist/logger/node.js', 'dist/logger/browser.js']
  const map = buildExportsMap(config, files, new Set())
  const logger = map['./logger'] as Record<string, unknown>
  // browser spliced before types/default, pointing at the browser leaf.
  assert.deepEqual(Object.keys(logger), [
    'source',
    'browser',
    'types',
    'default',
  ])
  assert.equal(logger['default'], './dist/logger/node.js')
  assert.deepEqual(logger['browser'], {
    types: undefined,
    default: './dist/logger/browser.js',
  })
})

// ── buildBrowserField: bare + node: twins, underscore exclusion ──

test('buildBrowserField emits bare + node: twins, all false, sorted', () => {
  const field = buildBrowserField(['fs', 'path'])
  assert.deepEqual(field, {
    fs: false,
    'node:fs': false,
    'node:path': false,
    path: false,
  })
})

test('buildBrowserField skips node: twin for underscore-internal builtins', () => {
  const field = buildBrowserField(['_http_agent', 'fs'])
  // _http_agent has no real node: form → bare key only.
  assert.equal(field['_http_agent'], false)
  assert.equal(field['node:_http_agent'], undefined)
  assert.equal(field['node:fs'], false)
})

test('buildBrowserField does not double-prefix already-node: builtins', () => {
  // node:module returns node:-only modules WITH the prefix (node:sea, node:test).
  const field = buildBrowserField(['node:sea', 'node:test', 'fs'])
  assert.equal(field['node:sea'], false)
  assert.equal(field['node:node:sea'], undefined) // no double prefix
  assert.equal(field['sea'], undefined) // no bogus bare form
  assert.equal(field['node:test'], false)
  assert.equal(field['node:node:test'], undefined)
})

test('buildBrowserField on empty list is an empty object', () => {
  assert.deepEqual(buildBrowserField([]), {})
})

test('buildBrowserField defaults to the full Node builtin set (engine owns it)', () => {
  const field = buildBrowserField()
  // Real builtins get bare + node: twins; the field is non-trivially populated.
  assert.equal(field['fs'], false)
  assert.equal(field['node:fs'], false)
  assert.equal(field['path'], false)
  // `builtinModules` reports legacy underscore-internals (`_stream_*`,
  // `_http_*`) on some Node versions — stubbed bare-only (no `node:` twin,
  // matching the underscore-internal rule). Node has been trimming this set
  // across versions (v26 dropped `_stream_*` entirely), so pick whichever
  // one the running Node still reports rather than hardcoding a name.
  const underscoreInternal = NODE_BUILTINS.find(name => name.startsWith('_'))
  if (underscoreInternal) {
    assert.equal(field[underscoreInternal], false)
    assert.equal(field[`node:${underscoreInternal}`], undefined)
  }
  assert.ok(Object.keys(field).length > 100, 'covers the builtin set + twins')
})

// ── sortExportsMap: . then index then alpha then json ───────────

test('sortExportsMap orders main first, json last, rest alphanumeric', () => {
  const sorted = sortExportsMap({
    './zed': 'z',
    './data/x.json': 'j',
    './alpha': 'a',
    '.': 'main',
    './index': 'idx',
  })
  assert.deepEqual(Object.keys(sorted), [
    '.',
    './index',
    './alpha',
    './zed',
    './data/x.json',
  ])
})

// ── applyAliases is idempotent-safe on an empty config ──────────

test('applyAliases no-ops with no aliases', () => {
  const map = { '.': 'x' }
  applyAliases(map, { outDir: 'dist' })
  assert.deepEqual(map, { '.': 'x' })
})
