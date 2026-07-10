// vitest specs for the Agent-CI gh-aw-lock boundary: the agent-ci-skip-locks
// wrapper's guard surface + the check that keeps it intact.

import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import {
  extractWorkflowTarget,
  isLockYmlTarget,
  listLockYmls,
} from '../../../scripts/fleet/agent-ci-skip-locks.mts'
import { checkAgentCiSkipLocksIsGuarded } from '../../../scripts/fleet/check/agent-ci-skip-locks-is-guarded.mts'

function tmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'agent-ci-skip-'))
}

// ── isLockYmlTarget ─────────────────────────────────────────────

test('isLockYmlTarget is true for a .lock.yml path (the crash case)', () => {
  assert.equal(isLockYmlTarget('weekly-update.lock.yml'), true)
  assert.equal(isLockYmlTarget('.github/workflows/x.lock.yml'), true)
})

test('isLockYmlTarget is false for a normal workflow or no target', () => {
  assert.equal(isLockYmlTarget('ci.yml'), false)
  assert.equal(isLockYmlTarget('weekly-update.yml'), false)
  // A .yml whose stem ends in "lock" but is not a compiled lock must NOT match.
  assert.equal(isLockYmlTarget('padlock.yml'), false)
  assert.equal(isLockYmlTarget(undefined), false)
})

// ── extractWorkflowTarget ───────────────────────────────────────

test('extractWorkflowTarget reads --workflow <path>', () => {
  assert.equal(
    extractWorkflowTarget(['run', '--workflow', 'x.lock.yml', '--quiet']),
    'x.lock.yml',
  )
})

test('extractWorkflowTarget reads the -w short flag', () => {
  assert.equal(extractWorkflowTarget(['run', '-w', 'ci.yml']), 'ci.yml')
})

test('extractWorkflowTarget reads the --workflow=path / -w=path forms', () => {
  assert.equal(
    extractWorkflowTarget(['run', '--workflow=y.lock.yml']),
    'y.lock.yml',
  )
  assert.equal(extractWorkflowTarget(['run', '-w=z.yml']), 'z.yml')
})

test('extractWorkflowTarget returns undefined for --all (discovery mode)', () => {
  assert.equal(
    extractWorkflowTarget(['run', '--all', '--github-token']),
    undefined,
  )
})

// ── listLockYmls ────────────────────────────────────────────────

test('listLockYmls returns only .lock.yml files, sorted', () => {
  const dir = tmpDir()
  for (const name of [
    'weekly-update.lock.yml',
    'ci.yml',
    'fix-test-failures.lock.yml',
    'weekly-update.yml',
  ]) {
    writeFileSync(path.join(dir, name), '')
  }
  assert.deepEqual(listLockYmls(dir), [
    'fix-test-failures.lock.yml',
    'weekly-update.lock.yml',
  ])
})

test('listLockYmls returns [] when the workflows dir is absent', () => {
  assert.deepEqual(listLockYmls(path.join(tmpDir(), 'nope')), [])
})

test('listLockYmls returns [] when there are no lock files', () => {
  const dir = tmpDir()
  writeFileSync(path.join(dir, 'ci.yml'), '')
  assert.deepEqual(listLockYmls(dir), [])
})

// ── checkAgentCiSkipLocksIsGuarded ──────────────────────────────

test('checkAgentCiSkipLocksIsGuarded passes against the real wrapper (boundary intact)', async () => {
  assert.equal(await checkAgentCiSkipLocksIsGuarded(), 0)
})
