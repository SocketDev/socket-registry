// vitest specs for check-names-are-assertions.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import {
  isAssertionName,
  scanCheckNames,
} from '../../../scripts/fleet/check/check-names-are-assertions.mts'

// ── isAssertionName: the predicate ──────────────────────────────

test('isAssertionName accepts the -are-<state> tail', () => {
  assert.equal(isAssertionName('paths-are-canonical'), true)
  assert.equal(isAssertionName('claude-dirs-are-segmented'), true)
  assert.equal(isAssertionName('package-files-are-allowlisted'), true)
  assert.equal(isAssertionName('env-kill-switches-are-absent'), true)
})

test('isAssertionName accepts the -is-<state> tail', () => {
  assert.equal(isAssertionName('setup-is-prompt-less'), true)
  assert.equal(isAssertionName('provenance-is-attested'), true)
})

test('isAssertionName accepts the -have-<state> tail', () => {
  assert.equal(isAssertionName('enforcers-have-thorough-tests'), true)
  assert.equal(isAssertionName('soak-excludes-have-dates'), true)
  assert.equal(isAssertionName('mutating-skills-have-model'), true)
  assert.equal(isAssertionName('hooks-have-no-guard-nudge-overlap'), true)
})

test('isAssertionName accepts -resolve / -match verb tails', () => {
  assert.equal(isAssertionName('claude-md-citations-resolve'), true)
  assert.equal(isAssertionName('lock-step-refs-resolve'), true)
  assert.equal(isAssertionName('script-paths-resolve'), true)
  assert.equal(isAssertionName('lock-step-headers-match'), true)
})

test('isAssertionName accepts -match / -cover with a trailing object phrase (subject-verb-object)', () => {
  assert.equal(isAssertionName('platform-tails-match-naming-domain'), true)
  assert.equal(isAssertionName('dispatch-matchers-cover-hook-tools'), true)
  assert.equal(isAssertionName('foo-bar-matches-baz-qux'), true)
  assert.equal(isAssertionName('foo-bar-covers-baz-qux'), true)
})

test('isAssertionName accepts the blessed -loads / -parity tails', () => {
  assert.equal(isAssertionName('oxlint-plugin-loads'), true)
  assert.equal(isAssertionName('fleet-soak-exclude-parity'), true)
})

test('isAssertionName accepts claude-md-rules-are-informative (-are-<adj>)', () => {
  assert.equal(isAssertionName('claude-md-rules-are-informative'), true)
})

test('isAssertionName accepts its own allowlisted name', () => {
  assert.equal(isAssertionName('check-names-are-assertions'), true)
})

test('isAssertionName REJECTS bare-topic names (the pre-rename forms)', () => {
  assert.equal(isAssertionName('paths'), false)
  assert.equal(isAssertionName('provenance'), false)
  assert.equal(isAssertionName('soak-exclude-dates'), false)
  assert.equal(isAssertionName('claude-segmentation'), false)
  assert.equal(isAssertionName('lock-step-header'), false)
  assert.equal(isAssertionName('hook-nudge-guard-overlap'), false)
})

test('isAssertionName REJECTS a dangling tail (no state after are/is/have)', () => {
  // "-are" / "-is" / "-have" alone, or with nothing after the hyphen, is not
  // an assertion — the predicate needs a state word.
  assert.equal(isAssertionName('foo-are'), false)
  assert.equal(isAssertionName('foo-is'), false)
  assert.equal(isAssertionName('foo-have'), false)
  assert.equal(isAssertionName('foo-are-'), false)
})

test('isAssertionName REJECTS a dangling object phrase after match/cover', () => {
  // the verb must be present; a trailing hyphen with no object word, or the
  // verb missing entirely, is not an assertion.
  assert.equal(isAssertionName('foo-match-'), false)
  assert.equal(isAssertionName('foo-cover-'), false)
})

test('isAssertionName REJECTS a noun that merely contains a tail word', () => {
  // "parity" must be the tail; "parity-check" is not assertion form.
  assert.equal(isAssertionName('parity-check'), false)
  assert.equal(isAssertionName('resolve-paths'), false)
})

// ── scanCheckNames: directory fixtures ──────────────────────────

function makeRepo(names: string[]): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'check-names-'))
  const checkDir = path.join(dir, 'scripts', 'fleet', 'check')
  mkdirSync(checkDir, { recursive: true })
  for (let i = 0, { length } = names; i < length; i += 1) {
    const n = names[i]!
    writeFileSync(path.join(checkDir, n), '// stub\n')
  }
  return dir
}

test('scanCheckNames passes a dir of all-assertion-form checks', () => {
  const dir = makeRepo([
    'paths-are-canonical.mts',
    'lock-step-refs-resolve.mts',
    'oxlint-plugin-loads.mts',
    'check.mts',
  ])
  assert.equal(scanCheckNames(dir).length, 0)
})

test('scanCheckNames flags a non-assertion check + names it', () => {
  const dir = makeRepo([
    'paths-are-canonical.mts',
    'provenance.mts', // bare topic
  ])
  const v = scanCheckNames(dir)
  assert.equal(v.length, 1)
  assert.equal(v[0]!.name, 'provenance.mts')
})

test('scanCheckNames ignores check.mts (the runner)', () => {
  const dir = makeRepo(['check.mts', 'paths-are-canonical.mts'])
  assert.equal(scanCheckNames(dir).length, 0)
})

test('scanCheckNames ignores non-.mts files + helper subdirs', () => {
  const dir = makeRepo(['paths-are-canonical.mts', 'README.md', 'config.json'])
  // a helper subdir under check/ must not be scanned as a check
  mkdirSync(path.join(dir, 'scripts', 'fleet', 'check', 'paths'), {
    recursive: true,
  })
  writeFileSync(
    path.join(dir, 'scripts', 'fleet', 'check', 'paths', 'walk.mts'),
    '// helper\n',
  )
  assert.equal(scanCheckNames(dir).length, 0)
})

test('scanCheckNames flags multiple violations', () => {
  const dir = makeRepo([
    'paths.mts',
    'provenance.mts',
    'lock-step-refs-resolve.mts',
  ])
  const v = scanCheckNames(dir)
  assert.equal(v.length, 2)
  assert.deepEqual(v.map(x => x.name).toSorted(), [
    'paths.mts',
    'provenance.mts',
  ])
})

test('scanCheckNames returns empty when the check dir is absent', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'check-names-empty-'))
  assert.equal(scanCheckNames(dir).length, 0)
})
