import assert from 'node:assert/strict'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

import { test } from 'vitest'

import {
  activeRunsDir,
  registerActiveRun,
  unregisterActiveRun,
} from '../../../scripts/fleet/_shared/active-run-marker.mts'

function makeHome(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'active-run-marker-test-'))
}

test('register writes a pidfile for the calling process', () => {
  const homeDir = makeHome()
  registerActiveRun({ homeDir })
  assert.ok(existsSync(path.join(activeRunsDir(homeDir), String(process.pid))))
})

test('unregister removes the pidfile', () => {
  const homeDir = makeHome()
  registerActiveRun({ homeDir })
  unregisterActiveRun({ homeDir })
  assert.equal(
    existsSync(path.join(activeRunsDir(homeDir), String(process.pid))),
    false,
  )
})

test('register prunes markers whose registrant is dead', () => {
  const homeDir = makeHome()
  const dir = activeRunsDir(homeDir)
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, '999999'), '')
  writeFileSync(path.join(dir, 'garbage'), '')
  registerActiveRun({ homeDir })
  const entries = readdirSync(dir)
  assert.deepEqual(entries.toSorted(), [String(process.pid)])
})

test('unregister of an absent marker is a no-op', () => {
  const homeDir = makeHome()
  unregisterActiveRun({ homeDir })
  assert.equal(existsSync(activeRunsDir(homeDir)), false)
})
