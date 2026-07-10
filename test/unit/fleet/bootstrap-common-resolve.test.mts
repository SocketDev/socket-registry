/**
 * @file Unit tests for bootstrap-common's real-tool resolution — the
 *   firewall-shim fingerprint (isFirewallShim) and resolveReal's PATH walk
 *   skipping shim candidates so a shim never wraps another shim.
 */

import assert from 'node:assert/strict'
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, test } from 'vitest'

import {
  isFirewallShim,
  resolveReal,
} from '../../../scripts/fleet/setup/lib/bootstrap-common.mjs'
import { safeDelete } from '@socketsecurity/lib-stable/fs/safe'

const SHIM_BODY = [
  '#!/bin/bash',
  '# Socket Firewall shim — wraps mytool via sfw enterprise.',
  'export SFW_UNKNOWN_HOST_ACTION=ignore',
  'exec "/some/sfw" "/some/real/mytool" "$@"',
  '',
].join('\n')

const REAL_BODY = ['#!/bin/bash', 'echo real tool', ''].join('\n')

const tmpDirs: string[] = []
const savedPath = process.env['PATH']

function makeBinDir(name: string, body: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'bootstrap-resolve-'))
  tmpDirs.push(dir)
  const file = path.join(dir, name)
  writeFileSync(file, body)
  chmodSync(file, 0o755)
  return dir
}

afterEach(async () => {
  process.env['PATH'] = savedPath
  for (const dir of tmpDirs.splice(0)) {
    await safeDelete(dir, { recursive: true })
  }
})

// ── isFirewallShim ───────────────────────────────────────────────────────────

test('a small bash file exporting SFW_UNKNOWN_HOST_ACTION is a shim', () => {
  const dir = makeBinDir('mytool', SHIM_BODY)
  assert.equal(isFirewallShim(path.join(dir, 'mytool')), true)
})

test('a plain launcher script is not a shim', () => {
  const dir = makeBinDir('mytool', REAL_BODY)
  assert.equal(isFirewallShim(path.join(dir, 'mytool')), false)
})

test('a missing file is not a shim (fail open)', () => {
  assert.equal(isFirewallShim('/nonexistent/definitely/not/here'), false)
})

test('a large file is not sniffed even if it contains the marker', () => {
  const dir = makeBinDir('mytool', `${SHIM_BODY}\n# ${'x'.repeat(9000)}\n`)
  assert.equal(isFirewallShim(path.join(dir, 'mytool')), false)
})

// ── resolveReal skips shim candidates ────────────────────────────────────────

test('resolveReal skips a shim earlier on PATH and returns the real tool', () => {
  const shimDir = makeBinDir('faketool-xyz', SHIM_BODY)
  const realDir = makeBinDir('faketool-xyz', REAL_BODY)
  process.env['PATH'] = [shimDir, realDir].join(path.delimiter)
  assert.equal(resolveReal('faketool-xyz'), path.join(realDir, 'faketool-xyz'))
})

test('resolveReal returns the first candidate when it is not a shim', () => {
  const firstDir = makeBinDir('faketool-xyz', REAL_BODY)
  const secondDir = makeBinDir('faketool-xyz', REAL_BODY)
  process.env['PATH'] = [firstDir, secondDir].join(path.delimiter)
  assert.equal(resolveReal('faketool-xyz'), path.join(firstDir, 'faketool-xyz'))
})

test('resolveReal returns empty when every candidate is a shim', () => {
  const shimDirA = makeBinDir('faketool-xyz', SHIM_BODY)
  const shimDirB = makeBinDir('faketool-xyz', SHIM_BODY)
  process.env['PATH'] = [shimDirA, shimDirB].join(path.delimiter)
  assert.equal(resolveReal('faketool-xyz'), '')
})
