// vitest specs for the pre-push-gate runner.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import { GATE_STEPS, runGate } from '../../../scripts/fleet/pre-push-gate.mts'

test('runGate: all-green when every step exits 0', async () => {
  const ran: string[] = []
  const result = await runGate({
    runStep: async (cmd, args) => {
      ran.push(`${cmd} ${args.join(' ')}`)
      return 0
    },
  })
  assert.deepStrictEqual(result, { ok: true })
  assert.strictEqual(ran.length, GATE_STEPS.length)
})

test('runGate: stops + reports the first red step', async () => {
  const ran: string[] = []
  const result = await runGate({
    runStep: async (cmd, args) => {
      const label = `${cmd} ${args.join(' ')}`
      ran.push(label)
      // Fail at `pnpm run fix --all`.
      return label === 'pnpm run fix --all' ? 1 : 0
    },
  })
  assert.strictEqual(result.ok, false)
  assert.strictEqual(result.failed, 'pnpm run fix --all')
  // Stops at the failing step — never reaches check/cover.
  assert.ok(!ran.includes('pnpm run check --all'))
  assert.ok(!ran.includes('pnpm run cover'))
})
