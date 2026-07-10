// vitest specs for external-tools-are-valid's discovery. The check once globbed
// `**/external-tools.json` WITHOUT `dot: true`, so it silently skipped every
// `.claude/**` file (a dot-directory) and reported green while never validating
// the security-hook tool data — a false-green that let unmodeled fields drift
// in. These assert discovery is NON-vacuous: a `.claude/**` file IS found.
// Imports the canonical template module (the cascaded live copy is byte-identical).

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { normalizePath } from '@socketsecurity/lib/paths/normalize'
import { afterEach, beforeEach, test } from 'vitest'

import { findToolFiles } from '../../../scripts/fleet/check/external-tools-are-valid.mts'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), 'ext-tools-glob-'))
  const claudeDir = path.join(
    dir,
    '.claude',
    'hooks',
    'fleet',
    'setup-security-tools',
  )
  mkdirSync(claudeDir, { recursive: true })
  writeFileSync(
    path.join(claudeDir, 'external-tools.json'),
    '{ "tools": {} }\n',
  )
  writeFileSync(path.join(dir, 'external-tools.json'), '{ "tools": {} }\n')
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

test('findToolFiles descends into .claude dot-directories', () => {
  const found = findToolFiles(dir).map(f => normalizePath(f))
  // The whole point of the dot:true fix: a `.claude/**` file must be found, not
  // silently skipped. Assert the specific dot-dir file, not just a non-zero count.
  assert.ok(
    found.some(f => f.includes('.claude/hooks/fleet/setup-security-tools')),
    `expected a .claude/** external-tools.json in ${JSON.stringify(found)}`,
  )
})

test('findToolFiles still finds non-dot files', () => {
  const found = findToolFiles(dir).map(f => normalizePath(f))
  assert.ok(found.includes('external-tools.json'))
})
