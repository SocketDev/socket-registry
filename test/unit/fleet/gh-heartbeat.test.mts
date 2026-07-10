import assert from 'node:assert/strict'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import {
  heartbeatStampPath,
  refreshGhHeartbeat,
} from '../../../scripts/fleet/gh-heartbeat.mts'

function makeHome(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'gh-heartbeat-test-'))
}

test('a passing probe stamps a fresh epoch', () => {
  const homeDir = makeHome()
  const before = Date.now()
  const result = refreshGhHeartbeat({ homeDir, probe: () => true })
  assert.equal(result.stamped, true)
  const stamped = Number(readFileSync(heartbeatStampPath(homeDir), 'utf8'))
  assert.ok(stamped >= before)
  assert.match(result.reason, /was absent/)
})

test('a failing probe never stamps (fail closed)', () => {
  const homeDir = makeHome()
  const result = refreshGhHeartbeat({ homeDir, probe: () => false })
  assert.equal(result.stamped, false)
  assert.equal(existsSync(heartbeatStampPath(homeDir)), false)
  assert.match(result.reason, /probe failed/)
  assert.match(result.reason, /Fix:/)
})

test('an existing stamp is refreshed and its age reported', () => {
  const homeDir = makeHome()
  const stampFile = heartbeatStampPath(homeDir)
  mkdirSync(path.dirname(stampFile), { recursive: true })
  writeFileSync(stampFile, String(Date.now() - 90 * 60_000))
  const result = refreshGhHeartbeat({ homeDir, probe: () => true })
  assert.equal(result.stamped, true)
  assert.match(result.reason, /9\d?min old/)
})

test('a garbage prior stamp reports absent-style age without throwing', () => {
  const homeDir = makeHome()
  const stampFile = heartbeatStampPath(homeDir)
  mkdirSync(path.dirname(stampFile), { recursive: true })
  writeFileSync(stampFile, 'not-a-number')
  const result = refreshGhHeartbeat({ homeDir, probe: () => true })
  assert.equal(result.stamped, true)
  assert.match(result.reason, /was absent/)
  const stamped = Number(readFileSync(stampFile, 'utf8'))
  assert.ok(Number.isFinite(stamped))
})
