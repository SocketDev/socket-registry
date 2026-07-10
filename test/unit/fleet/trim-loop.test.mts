// vitest specs for the trimming-bundle trim-loop pure helpers: readStubTokens /
// writeStubTokens (the rolldown stubPattern read/rewrite) and parseArgs. The
// build+test+measure loop is integration-level (it runs `pnpm build`/`pnpm
// test`); these specs lock the deterministic config rewriting + arg parsing.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  parseArgs,
  readStubTokens,
  writeStubTokens,
} from '../../../.claude/skills/fleet/trimming-bundle/lib/trim-loop.mts'

const CONFIG = [
  "import { defineConfig } from 'rolldown'",
  '',
  'const stubPattern = /(?:globs|fs)\\.js$/u',
  '',
  'export default defineConfig({})',
].join('\n')

test('readStubTokens reads the alternation tokens from the stubPattern', () => {
  assert.deepEqual(readStubTokens(CONFIG), ['globs', 'fs'])
})

test('readStubTokens returns an empty list when no stubPattern is present', () => {
  assert.deepEqual(readStubTokens('export default {}'), [])
})

test('writeStubTokens rewrites the alternation in place', () => {
  const next = writeStubTokens(CONFIG, ['globs', 'fs', 'path'])
  assert.ok(next.includes('const stubPattern = /(?:globs|fs|path)\\.js$/u'))
  // Round-trips through readStubTokens.
  assert.deepEqual(readStubTokens(next), ['globs', 'fs', 'path'])
})

test('writeStubTokens collapses to an empty group when given no tokens', () => {
  const next = writeStubTokens(CONFIG, [])
  assert.ok(next.includes('const stubPattern = /(?:)\\.js$/u'))
})

test('writeStubTokens throws when the config has no stubPattern', () => {
  assert.throws(
    () => writeStubTokens('export default {}', ['globs']),
    /No `const stubPattern/,
  )
})

test('parseArgs splits --candidates and resolves flags', () => {
  const opts = parseArgs([
    '--candidates',
    'globs, fs ,path',
    '--dry-run',
    '--json',
  ])
  assert.deepEqual(opts.candidates, ['globs', 'fs', 'path'])
  assert.equal(opts.dryRun, true)
  assert.equal(opts.json, true)
})

test('parseArgs throws when --candidates is missing', () => {
  assert.throws(() => parseArgs([]), /Missing --candidates/)
})

test('parseArgs throws on an unknown argument', () => {
  assert.throws(
    () => parseArgs(['--candidates', 'globs', '--nope']),
    /Unknown argument/,
  )
})
