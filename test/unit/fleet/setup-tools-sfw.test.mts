/**
 * @file Unit tests for the sfw shim recursion guard. regenerateShims'
 *   real-tool shim bodies (setup-tools-sfw.mjs) used to strip the ENTIRE
 *   shared bin dir from PATH before exec'ing sfw — anti shim-wraps-shim
 *   recursion, but it also unshimmed every OTHER racked tool for every child
 *   process a wrapped command spawned. These tests pin the fix: a per-tool
 *   env sentinel that short-circuits only a re-entrant call to the SAME
 *   command, leaving PATH (and every other shim on it) untouched.
 */

import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  posixRealShimLines,
  sentinelVarFor,
  windowsRealShimLines,
} from '../../../scripts/fleet/setup/setup-tools-sfw.mjs'

// ── sentinelVarFor ───────────────────────────────────────────────────────────

test('sentinelVarFor uppercases the command name', () => {
  assert.equal(sentinelVarFor('pnpm'), 'SOCKET_SHIM_ACTIVE_PNPM')
  assert.equal(sentinelVarFor('uv'), 'SOCKET_SHIM_ACTIVE_UV')
})

test('sentinelVarFor maps non-alnum characters to underscore', () => {
  assert.equal(sentinelVarFor('pip3'), 'SOCKET_SHIM_ACTIVE_PIP3')
  assert.equal(sentinelVarFor('some-tool'), 'SOCKET_SHIM_ACTIVE_SOME_TOOL')
})

// ── posixRealShimLines ───────────────────────────────────────────────────────

test('posixRealShimLines guards recursion via sentinel, not a PATH strip', () => {
  const content = posixRealShimLines(
    'pnpm',
    '/rack/sfw/1.0.0/sfw',
    '/rack/pnpm/9.0.0/pnpm',
  ).join('\n')
  assert.equal(
    content.includes('if [ -n "${SOCKET_SHIM_ACTIVE_PNPM:-}" ]; then'),
    true,
  )
  assert.equal(content.includes('exec "/rack/pnpm/9.0.0/pnpm" "$@"'), true)
  assert.equal(content.includes('export SOCKET_SHIM_ACTIVE_PNPM=1'), true)
  // The pre-fix shape stripped the shared bin dir from PATH before exec'ing
  // sfw — that line (and the machinery it needs) must be gone.
  assert.equal(content.includes('grep -vxF'), false)
  assert.equal(content.includes('paste -sd:'), false)
})

test('posixRealShimLines keeps the trap-and-reap process-group structure', () => {
  const content = posixRealShimLines(
    'uv',
    '/rack/sfw/1.0.0/sfw',
    '/rack/uv/0.11.21/uv',
  ).join('\n')
  assert.equal(content.includes('export SFW_UNKNOWN_HOST_ACTION=ignore'), true)
  assert.equal(content.includes('set -m'), true)
  assert.equal(
    content.includes('"/rack/sfw/1.0.0/sfw" "/rack/uv/0.11.21/uv" "$@" &'),
    true,
  )
  assert.equal(
    content.includes('trap "kill -TERM -$sfw_pid 2>/dev/null" EXIT'),
    true,
  )
  assert.equal(content.includes('wait "$sfw_pid"'), true)
  assert.equal(content.endsWith('exit $?'), true)
})

// ── windowsRealShimLines ─────────────────────────────────────────────────────

test('windowsRealShimLines guards recursion via the same sentinel, no PATH strip', () => {
  const content = windowsRealShimLines(
    'cargo',
    'C:\\rack\\sfw\\sfw.exe',
    'C:\\rack\\cargo\\cargo.exe',
  ).join('\r\n')
  assert.equal(
    content.includes('if defined SOCKET_SHIM_ACTIVE_CARGO goto :real'),
    true,
  )
  assert.equal(content.includes('set "SOCKET_SHIM_ACTIVE_CARGO=1"'), true)
  assert.equal(content.includes(':real'), true)
  // The pre-fix shape rewrote %PATH% in place; none of that machinery
  // belongs in the sentinel-guarded body.
  assert.equal(content.includes('set "PATH='), false)
})

test('windowsRealShimLines reads %errorlevel% outside any parenthesized block', () => {
  const lines = windowsRealShimLines(
    'npm',
    'C:\\rack\\sfw\\sfw.exe',
    'C:\\rack\\npm\\npm.cmd',
  )
  // %errorlevel% is read at the top level, one statement per line — never
  // inside an `if defined (...)` block, where cmd.exe would substitute it
  // once at parse time (before the guarded command runs) instead of after.
  for (const line of lines) {
    if (line.includes('%errorlevel%')) {
      assert.equal(line.trim().startsWith('exit /b'), true)
    }
    assert.equal(line.includes('('), false)
  }
})
