// vitest specs for the shared coverage-badge logic (lib/coverage-badge.mts):
// the color buckets, the README badge parse/rewrite, and the placeholder
// handling that make-coverage-badge + coverage-badge-is-current both key on.

import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import {
  BADGE_PLACEHOLDER,
  badgeColor,
  coverageScriptName,
  parseBadge,
  writeBadge,
} from '../../../scripts/fleet/lib/coverage-badge.mts'

function tmpRepo(scripts: Record<string, string> | undefined): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'cov-script-'))
  if (scripts !== undefined) {
    writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'x', scripts }),
    )
  }
  return dir
}

const SEEDED =
  '![Coverage](https://img.shields.io/badge/coverage-<PCT>%25-brightgreen)'
const POPULATED =
  '![Coverage](https://img.shields.io/badge/coverage-87%25-green)'

// ── badgeColor buckets ──────────────────────────────────────────

test('badgeColor maps each bucket boundary', () => {
  assert.equal(badgeColor(100), 'brightgreen')
  assert.equal(badgeColor(90), 'brightgreen')
  assert.equal(badgeColor(89.9), 'green')
  assert.equal(badgeColor(80), 'green')
  assert.equal(badgeColor(79), 'yellowgreen')
  assert.equal(badgeColor(70), 'yellowgreen')
  assert.equal(badgeColor(69), 'yellow')
  assert.equal(badgeColor(60), 'yellow')
  assert.equal(badgeColor(59), 'orange')
  assert.equal(badgeColor(50), 'orange')
  assert.equal(badgeColor(49), 'red')
  assert.equal(badgeColor(0), 'red')
})

// ── parseBadge ──────────────────────────────────────────────────

test('parseBadge reads the seeded placeholder badge', () => {
  const m = parseBadge(`# Repo\n\n${SEEDED}\n`)
  assert.deepEqual(m, { pct: BADGE_PLACEHOLDER, color: 'brightgreen' })
})

test('parseBadge reads a populated badge', () => {
  assert.deepEqual(parseBadge(POPULATED), { pct: '87', color: 'green' })
})

test('parseBadge returns undefined when there is no coverage badge', () => {
  assert.equal(parseBadge('# Repo\n\nno badge here\n'), undefined)
  // A different shields badge (CI) must NOT match.
  assert.equal(
    parseBadge('![CI](https://img.shields.io/badge/ci-passing-green)'),
    undefined,
  )
})

// ── writeBadge ──────────────────────────────────────────────────

test('writeBadge fills the placeholder with the rounded pct + bucket color', () => {
  const out = writeBadge(SEEDED, 99.4)
  assert.equal(parseBadge(out)?.pct, '99')
  assert.equal(parseBadge(out)?.color, 'brightgreen')
})

test('writeBadge rewrites a populated badge to a new pct + color', () => {
  // 87% (green) → 64% (yellow), rounding 63.6 → 64.
  const out = writeBadge(POPULATED, 63.6)
  assert.deepEqual(parseBadge(out), { pct: '64', color: 'yellow' })
})

test('writeBadge rounds to the nearest integer', () => {
  assert.equal(parseBadge(writeBadge(SEEDED, 82.5))?.pct, '83')
  assert.equal(parseBadge(writeBadge(SEEDED, 82.4))?.pct, '82')
})

test('writeBadge leaves a README with no badge unchanged', () => {
  const readme = '# Repo\n\nno badge\n'
  assert.equal(writeBadge(readme, 90), readme)
})

test('writeBadge is idempotent on an already-current badge', () => {
  const at87 = writeBadge(SEEDED, 87) // → 87% green
  assert.equal(writeBadge(at87, 87), at87)
})

// ── coverageScriptName ──────────────────────────────────────────

test('coverageScriptName prefers cover, then coverage, then test:cover', () => {
  assert.equal(
    coverageScriptName(
      tmpRepo({ cover: 'x', coverage: 'y', 'test:cover': 'z' }),
    ),
    'cover',
  )
  assert.equal(
    coverageScriptName(tmpRepo({ coverage: 'y', 'test:cover': 'z' })),
    'coverage',
  )
  assert.equal(coverageScriptName(tmpRepo({ 'test:cover': 'z' })), 'test:cover')
})

test('coverageScriptName is undefined when no coverage script is declared', () => {
  assert.equal(
    coverageScriptName(tmpRepo({ build: 'x', test: 'y' })),
    undefined,
  )
  assert.equal(coverageScriptName(tmpRepo({})), undefined)
})

test('coverageScriptName is undefined when package.json is absent', () => {
  assert.equal(coverageScriptName(tmpRepo(undefined)), undefined)
})
