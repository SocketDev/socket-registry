// vitest spec for the telemetry-env-is-disabled check. Targets the pure
// exported `findUnsetFleetEnv`, driven off the `FLEET_ENV` source of truth so
// the test can't drift from the list. No real env / network access — env
// objects are passed in directly.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import { FLEET_ENV } from '../../../.claude/hooks/fleet/_shared/fleet-env.mts'
import { findUnsetFleetEnv } from '../../../scripts/fleet/check/telemetry-env-is-disabled.mts'

// A fully-compliant env built from the source of truth.
function compliantEnv(): NodeJS.ProcessEnv {
  const env = Object.create(null) as NodeJS.ProcessEnv
  for (let i = 0, { length } = FLEET_ENV; i < length; i += 1) {
    const knob = FLEET_ENV[i]!
    env[knob.name] = knob.value
  }
  return env
}

test('no violations when every FLEET_ENV knob is set to its value', () => {
  assert.deepEqual(findUnsetFleetEnv(compliantEnv()), [])
})

test('reports a knob that is unset', () => {
  const env = compliantEnv()
  const target = FLEET_ENV[0]!.name
  delete env[target]
  const violations = findUnsetFleetEnv(env)
  assert.equal(violations.length, 1)
  assert.equal(violations[0]!.name, target)
  assert.equal(violations[0]!.actual, undefined)
})

test('reports a knob set to the wrong value', () => {
  const env = compliantEnv()
  const target = FLEET_ENV[0]!.name
  env[target] = '0'
  const violations = findUnsetFleetEnv(env)
  assert.equal(violations.length, 1)
  assert.equal(violations[0]!.actual, '0')
  assert.equal(violations[0]!.expected, FLEET_ENV[0]!.value)
})

test('reports every knob when the env is empty', () => {
  const violations = findUnsetFleetEnv(Object.create(null) as NodeJS.ProcessEnv)
  assert.equal(violations.length, FLEET_ENV.length)
})
