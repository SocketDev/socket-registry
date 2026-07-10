// vitest specs for bump.mts's pure helpers (the IO/git orchestration in main()
// is exercised end-to-end by running the CLI; these cover the text transforms).

import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  insertChangelogSection,
  replaceVersion,
} from '../../../scripts/fleet/bump.mts'

// ── replaceVersion ──────────────────────────────────────────────

test('replaceVersion swaps the root version, preserving formatting', () => {
  const raw =
    '{\n  "name": "@x/pkg",\n  "version": "6.0.9",\n  "type": "module"\n}\n'
  const out = replaceVersion(raw, '6.1.0')
  assert.match(out, /"version": "6\.1\.0"/)
  // Formatting + sibling keys untouched.
  assert.match(out, /"name": "@x\/pkg"/)
  assert.match(out, /"type": "module"/)
})

test('replaceVersion targets the first (root) version field', () => {
  const raw = '{\n  "version": "1.0.0",\n  "engines": { "version": "x" }\n}\n'
  const out = replaceVersion(raw, '1.0.1')
  assert.match(out, /"version": "1\.0\.1"/)
  // The nested string is left alone.
  assert.match(out, /"engines": \{ "version": "x" \}/)
})

// ── insertChangelogSection ──────────────────────────────────────

test('inserts a new section above the first existing version heading', () => {
  const existing = [
    '# Changelog',
    '',
    'All notable changes…',
    '',
    '## [6.0.9](url) - 2026-06-18',
    '',
    '### Added',
    '',
    '- old thing',
    '',
  ].join('\n')
  const out = insertChangelogSection(
    existing,
    '## [6.1.0](url) - 2026-06-21\n\n### Added\n\n- new thing',
  )
  // New section precedes the old one.
  assert.ok(out.indexOf('6.1.0') < out.indexOf('6.0.9'))
  // Intro is preserved above both.
  assert.ok(out.indexOf('# Changelog') < out.indexOf('6.1.0'))
  // Old content survives.
  assert.match(out, /- old thing/)
})

test('appends after the intro when there are no version sections yet', () => {
  const existing = '# Changelog\n\nAll notable changes…\n'
  const out = insertChangelogSection(
    existing,
    '## 1.0.0 - 2026-06-21\n\n### Added\n\n- first',
  )
  assert.match(out, /# Changelog/)
  assert.match(out, /## 1\.0\.0 - 2026-06-21/)
  assert.ok(out.indexOf('# Changelog') < out.indexOf('1.0.0'))
})
