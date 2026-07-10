import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import {
  loadState,
  writeState,
} from '../../../../scripts/fleet/team-activity/lib/state.mts'
import { statePathFor } from '../../../../scripts/fleet/team-activity/lib/paths.mts'

const NOW = '2026-07-08T00:00:00.000Z'

function makeConfigPath(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'team-activity-state-test-'))
  return path.join(dir, 'eng-surf.json')
}

test('seeds a fresh state with nowIso when no state file exists', () => {
  const configPath = makeConfigPath()
  assert.deepEqual(loadState(configPath, NOW), {
    reactions: {},
    scannedAt: NOW,
  })
})

test('round-trips a written state', () => {
  const configPath = makeConfigPath()
  const state = {
    reactions: { 'owner/repo#1:c-42': 3 },
    scannedAt: '2026-07-01T12:00:00.000Z',
  }
  writeState(configPath, state)
  assert.deepEqual(loadState(configPath, NOW), state)
})

test('writes the state as a sibling of the config file', () => {
  const configPath = makeConfigPath()
  writeState(configPath, { reactions: {}, scannedAt: NOW })
  assert.ok(existsSync(statePathFor(configPath)))
  assert.equal(statePathFor(configPath), `${configPath}.state.json`)
})

test('creates the umbrella dir when it does not exist yet', () => {
  const configPath = path.join(makeConfigPath(), 'nested', 'watch.json')
  writeState(configPath, { reactions: {}, scannedAt: NOW })
  const parsed = JSON.parse(readFileSync(statePathFor(configPath), 'utf8'))
  assert.equal(parsed.scannedAt, NOW)
})

test('falls back to a fresh state on a torn (unparseable) state file', () => {
  const configPath = makeConfigPath()
  writeFileSync(statePathFor(configPath), '{"scannedAt": "2026-')
  assert.deepEqual(loadState(configPath, NOW), {
    reactions: {},
    scannedAt: NOW,
  })
})

test('falls back to a fresh state when scannedAt is missing', () => {
  const configPath = makeConfigPath()
  writeFileSync(statePathFor(configPath), JSON.stringify({ reactions: {} }))
  assert.deepEqual(loadState(configPath, NOW), {
    reactions: {},
    scannedAt: NOW,
  })
})

test('defaults reactions to an empty record when absent from the file', () => {
  const configPath = makeConfigPath()
  writeFileSync(
    statePathFor(configPath),
    JSON.stringify({ scannedAt: '2026-07-01T12:00:00.000Z' }),
  )
  assert.deepEqual(loadState(configPath, NOW), {
    reactions: {},
    scannedAt: '2026-07-01T12:00:00.000Z',
  })
})
