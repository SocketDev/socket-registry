// Unit specs for the SFW-shim dlx→stable mapping — the pure core of the
// stabilize fix that stops a dlx-cache sweep from orphaning a shim (the
// recurring broken-headroom-shim failure). The real-fs orchestration
// (stabilizeShims) is c8-ignored; these cover the path logic it relies on.

import assert from 'node:assert/strict'
import path from 'node:path'

import { test } from 'vitest'

import {
  findDlxBackedTargets,
  getStableDir,
  isDlxTarget,
  stableTargetFor,
} from '../../../.claude/hooks/fleet/setup-security-tools/lib/shims.mts'

const DLX = '/opt/socket/_dlx/abc123/.venv/bin/headroom'
const RACK = '/opt/socket/_wheelhouse/rack/sfw/1.2.3/sfw'

test('isDlxTarget flags only dlx-cache paths', () => {
  assert.ok(isDlxTarget(DLX))
  assert.ok(!isDlxTarget(RACK))
  assert.ok(!isDlxTarget('/usr/local/bin/uv'))
})

test('getStableDir is a non-GC sibling named sfw-stable', () => {
  assert.equal(path.basename(getStableDir()), 'sfw-stable')
})

test('stableTargetFor mirrors _dlx/<hash>/<rest> under the stable dir', () => {
  const stable = stableTargetFor(DLX)
  assert.ok(stable, 'a dlx target maps to a stable mirror')
  assert.equal(
    stable,
    path.join(getStableDir(), 'abc123', '.venv', 'bin', 'headroom'),
  )
  assert.ok(stable!.startsWith(getStableDir()))
})

test('stableTargetFor returns undefined for a non-dlx target', () => {
  assert.equal(stableTargetFor('/usr/local/bin/uv'), undefined)
  assert.equal(stableTargetFor(RACK), undefined)
})

test('findDlxBackedTargets extracts dlx targets, skips shell tokens + non-dlx', () => {
  const py = '/opt/socket/_dlx/h1/.venv/bin/python'
  const hr = '/opt/socket/_dlx/h1/.venv/bin/headroom'
  const shim = [
    '#!/usr/bin/env bash',
    `exec "${py}" "${hr}" "$@"`,
    `# rack tool: "${RACK}"`,
    'PATH="$PATH:/x"',
  ].join('\n')
  assert.deepEqual(findDlxBackedTargets(shim), [py, hr])
})

test('findDlxBackedTargets is empty when no target is dlx-backed', () => {
  assert.deepEqual(findDlxBackedTargets(`exec "${RACK}" "$@"`), [])
})
