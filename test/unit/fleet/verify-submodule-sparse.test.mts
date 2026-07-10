// vitest specs for verify-submodule-sparse parsing + the --check predicate.

import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { test } from 'vitest'

import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'

import { parseBlocks } from '../../../scripts/fleet/verify-submodule-sparse.mts'

const SCRIPT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'scripts',
  'fleet',
  'verify-submodule-sparse.mts',
)

// Run the CLI with a `.gitmodules` path that doesn't exist, so the
// missing-file branch is exercised regardless of the host repo's submodules.
// The lib `spawn` wrapper rejects on a non-zero exit, so read the code off
// either the resolved result or the rejection's `.code`.
async function runMode(mode: string): Promise<number | null> {
  try {
    const r = await spawn(
      process.execPath,
      [SCRIPT, mode, path.join(path.dirname(SCRIPT), 'no-such-.gitmodules')],
      { stdio: 'ignore' },
    )
    return r.code
  } catch (e) {
    return (e as { code?: number | null | undefined }).code ?? 1
  }
}

// ── a repo with no submodules is a clean pass, not a failure ─────

test('--check exits 0 when there is no .gitmodules (nothing to verify)', async () => {
  assert.equal(await runMode('--check'), 0)
})

test('--run-all exits 0 when there is no .gitmodules', async () => {
  assert.equal(await runMode('--run-all'), 0)
})

test('--run errors when there is no .gitmodules (caller named a submodule)', async () => {
  assert.equal(await runMode('--run'), 1)
})

// ── parseBlocks reads path / url / sparse / verify per block ─────

test('parseBlocks reads every field this tool consumes', () => {
  const blocks = parseBlocks(
    [
      '[submodule "x"]',
      '\tpath = packages/x/upstream/x',
      '\turl = https://github.com/o/x.git',
      '\tsparse-checkout = src tests',
      '\tverify = pnpm --filter @x/parser test',
    ].join('\n'),
  )
  assert.equal(blocks.length, 1)
  assert.equal(blocks[0]!.name, 'x')
  assert.equal(blocks[0]!.path, 'packages/x/upstream/x')
  assert.equal(blocks[0]!.url, 'https://github.com/o/x.git')
  assert.equal(blocks[0]!.sparse, 'src tests')
  assert.equal(blocks[0]!.verify, 'pnpm --filter @x/parser test')
})

// ── absent optional fields are undefined ─────────────────────────

test('parseBlocks leaves absent fields undefined', () => {
  const blocks = parseBlocks(
    ['[submodule "y"]', '\turl = https://github.com/o/y.git'].join('\n'),
  )
  assert.equal(blocks[0]!.sparse, undefined)
  assert.equal(blocks[0]!.verify, undefined)
})

// ── verify = none is captured (reference-only marker) ────────────

test('parseBlocks captures `verify = none`', () => {
  const blocks = parseBlocks(
    [
      '[submodule "z"]',
      '\turl = https://github.com/o/z.git',
      '\tsparse-checkout = README.md',
      '\tverify = none',
    ].join('\n'),
  )
  assert.equal(blocks[0]!.verify, 'none')
})

// ── multiple blocks keep their own fields ────────────────────────

test('parseBlocks keeps fields scoped to their block', () => {
  const blocks = parseBlocks(
    [
      '[submodule "a"]',
      '\tsparse-checkout = src',
      '\tverify = none',
      '[submodule "b"]',
      '\tsparse-checkout = files',
      '\tverify = node bench.mjs',
    ].join('\n'),
  )
  assert.equal(blocks.length, 2)
  assert.equal(blocks[0]!.verify, 'none')
  assert.equal(blocks[1]!.sparse, 'files')
  assert.equal(blocks[1]!.verify, 'node bench.mjs')
})

// ── an empty sparse-checkout / verify value is treated as unset ──

test('parseBlocks treats an empty value as unset', () => {
  const blocks = parseBlocks(
    ['[submodule "e"]', '\tsparse-checkout = ', '\tverify = '].join('\n'),
  )
  assert.equal(blocks[0]!.sparse, undefined)
  assert.equal(blocks[0]!.verify, undefined)
})

// ── the gap the --check gate fires on: sparse without verify ─────

test('a sparse block with no verify is the gap --check rejects', () => {
  const blocks = parseBlocks(
    ['[submodule "g"]', '\tsparse-checkout = src'].join('\n'),
  )
  const gaps = blocks.filter(b => b.sparse && !b.verify)
  assert.equal(gaps.length, 1)
  assert.equal(gaps[0]!.name, 'g')
})

// ── a non-sparse block needs no verify (not a gap) ───────────────

test('a block without a sparse-checkout is not a verify gap', () => {
  const blocks = parseBlocks(
    ['[submodule "f"]', '\turl = https://github.com/o/f.git'].join('\n'),
  )
  const gaps = blocks.filter(b => b.sparse && !b.verify)
  assert.equal(gaps.length, 0)
})

// ── no blocks → empty result ─────────────────────────────────────

test('parseBlocks returns [] when there are no [submodule] blocks', () => {
  assert.deepEqual(parseBlocks('# comment\n'), [])
})
