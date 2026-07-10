// vitest specs for the Sparkle auto-update detector's pure logic:
// defaultIsFalse (the `defaults read` bool decode) + classifySparkle (the
// posture classifier). No `defaults` is spawned — values are passed in.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  classifySparkle,
  defaultIsFalse,
  SPARKLE_APPS,
  SPARKLE_DISABLE_KEYS,
} from '../../../.claude/hooks/fleet/_shared/sparkle-auto-update.mts'

const APP = SPARKLE_APPS[0]!
const [KEY_A, KEY_B] = SPARKLE_DISABLE_KEYS as readonly string[]

// ── the disable knobs ───────────────────────────────────────────

test('OrbStack is a tracked Sparkle app on the canonical bundle domain', () => {
  assert.equal(APP.id, 'orbstack')
  assert.equal(APP.domain, 'dev.kdrag0n.MacVirt')
})

test('both Sparkle disable keys are tracked, alphabetized', () => {
  assert.deepEqual(
    [...SPARKLE_DISABLE_KEYS],
    ['SUAutomaticallyUpdate', 'SUEnableAutomaticChecks'],
  )
})

// ── defaultIsFalse (decode `defaults read` bool) ─────────────────

test('defaultIsFalse: "0" is false (disabled)', () => {
  assert.equal(defaultIsFalse('0'), true)
})

test('defaultIsFalse: "1" / undefined / other are NOT false', () => {
  assert.equal(defaultIsFalse('1'), false)
  assert.equal(defaultIsFalse(undefined), false)
  assert.equal(defaultIsFalse('true'), false)
})

// ── classifySparkle (posture) ───────────────────────────────────

test('off-macOS short-circuits to absent', () => {
  const r = classifySparkle(APP, [], true)
  assert.equal(r.state, 'absent')
  assert.match(r.reason, /not macOS/)
})

test('both keys unset → absent (app not installed / never launched)', () => {
  const r = classifySparkle(APP, [
    { key: KEY_A!, value: undefined },
    { key: KEY_B!, value: undefined },
  ])
  assert.equal(r.state, 'absent')
  assert.match(r.reason, /not installed/)
})

test('both keys "0" → disabled (good)', () => {
  const r = classifySparkle(APP, [
    { key: KEY_A!, value: '0' },
    { key: KEY_B!, value: '0' },
  ])
  assert.equal(r.state, 'disabled')
  assert.deepEqual([...r.enabledKeys], [])
})

test('one key "1" → enabled, names the offending key', () => {
  const r = classifySparkle(APP, [
    { key: KEY_A!, value: '0' },
    { key: KEY_B!, value: '1' },
  ])
  assert.equal(r.state, 'enabled')
  assert.deepEqual([...r.enabledKeys], [KEY_B])
  assert.match(r.reason, new RegExp(KEY_B!))
})

test('one key "0", the other unset → enabled (unset key defaults to on)', () => {
  const r = classifySparkle(APP, [
    { key: KEY_A!, value: '0' },
    { key: KEY_B!, value: undefined },
  ])
  assert.equal(r.state, 'enabled')
  assert.deepEqual([...r.enabledKeys], [KEY_B])
})
