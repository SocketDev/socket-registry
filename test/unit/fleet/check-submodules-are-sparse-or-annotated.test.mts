// vitest specs for check-submodules-are-sparse-or-annotated.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import { parseEntries } from '../../../scripts/fleet/check/submodules-are-sparse-or-annotated.mts'

// ── a block with a sparse-checkout field is recognized ──────────

test('parseEntries records a sparse-checkout field', () => {
  const entries = parseEntries(
    [
      '# acorn-2026.04.30 sha256:abc',
      '[submodule "packages/acorn/upstream/acorn"]',
      '\tpath = packages/acorn/upstream/acorn',
      '\turl = https://github.com/acornjs/acorn.git',
      '\tsparse-checkout = acorn/src acorn-loose/src',
    ].join('\n'),
  )
  assert.equal(entries.length, 1)
  assert.equal(entries[0]!.name, 'packages/acorn/upstream/acorn')
  assert.equal(entries[0]!.hasSparse, true)
  assert.equal(entries[0]!.fullCheckoutReason, undefined)
})

// ── a block with no sparse field is an offender ─────────────────

test('parseEntries flags a block with neither sparse nor annotation', () => {
  const entries = parseEntries(
    [
      '# blake3-1.8.5 sha256:abc',
      '[submodule "packages/acorn/upstream/blake3"]',
      '\tpath = packages/acorn/upstream/blake3',
      '\turl = https://github.com/BLAKE3-team/BLAKE3.git',
    ].join('\n'),
  )
  assert.equal(entries.length, 1)
  assert.equal(entries[0]!.hasSparse, false)
  assert.equal(entries[0]!.fullCheckoutReason, undefined)
})

// ── a full-checkout annotation satisfies the gate ───────────────

test('parseEntries reads a `# full-checkout: <reason>` annotation', () => {
  const entries = parseEntries(
    [
      '# some-crate-1.0.0 sha256:abc',
      '# full-checkout: built from the whole crate source tree',
      '[submodule "packages/x/upstream/some-crate"]',
      '\tpath = packages/x/upstream/some-crate',
      '\turl = https://github.com/x/some-crate.git',
    ].join('\n'),
  )
  assert.equal(entries.length, 1)
  assert.equal(entries[0]!.hasSparse, false)
  assert.equal(
    entries[0]!.fullCheckoutReason,
    'built from the whole crate source tree',
  )
})

// ── full-checkout: on the same line as the version header ───────

test('parseEntries reads full-checkout: from the version header line', () => {
  const entries = parseEntries(
    [
      '# some-crate-1.0.0 sha256:abc full-checkout: no separable subtree',
      '[submodule "packages/x/upstream/some-crate"]',
      '\turl = https://github.com/x/some-crate.git',
    ].join('\n'),
  )
  assert.equal(entries[0]!.fullCheckoutReason, 'no separable subtree')
})

// ── an empty sparse-checkout value does NOT count as sparse ──────

test('parseEntries treats an empty sparse-checkout value as not-sparse', () => {
  const entries = parseEntries(
    [
      '# x-1.0.0 sha256:abc',
      '[submodule "x"]',
      '\turl = https://github.com/x/x.git',
      '\tsparse-checkout = ',
    ].join('\n'),
  )
  assert.equal(entries[0]!.hasSparse, false)
})

// ── the full-checkout scan stops at a non-comment line (does not
//    leak an annotation from a previous block) ───────────────────

test('parseEntries does not leak a full-checkout annotation across blocks', () => {
  const entries = parseEntries(
    [
      '# a-1 sha256:abc',
      '# full-checkout: a needs everything',
      '[submodule "a"]',
      '\turl = https://github.com/x/a.git',
      '',
      '# b-1 sha256:def',
      '[submodule "b"]',
      '\turl = https://github.com/x/b.git',
    ].join('\n'),
  )
  assert.equal(entries.length, 2)
  assert.equal(entries[0]!.fullCheckoutReason, 'a needs everything')
  assert.equal(entries[1]!.fullCheckoutReason, undefined)
})

// ── multiple blocks, mixed states, line numbers ─────────────────

test('parseEntries reports each block with its 1-based opening line', () => {
  const text = [
    '# a-1 sha256:abc',
    '[submodule "a"]',
    '\tsparse-checkout = src',
    '',
    '# b-1 sha256:def',
    '[submodule "b"]',
    '\turl = https://github.com/x/b.git',
  ].join('\n')
  const entries = parseEntries(text)
  assert.equal(entries[0]!.line, 2)
  assert.equal(entries[0]!.hasSparse, true)
  assert.equal(entries[1]!.line, 6)
  assert.equal(entries[1]!.hasSparse, false)
})

// ── no submodules → empty result ────────────────────────────────

test('parseEntries returns [] for a file with no [submodule] blocks', () => {
  assert.deepEqual(parseEntries('# just a comment\nfoo = bar\n'), [])
})
