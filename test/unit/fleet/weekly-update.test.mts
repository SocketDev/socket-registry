/**
 * @file Tests for the plain weekly-update runner's argument parsing. The IO
 *   paths (check-updates gate, agent spawn, test, PR) need a real repo/env and
 *   are exercised by a live run; these cover the pure flag logic + the safety
 *   defaults (agent on, PR off unless --pr).
 */

import { describe, expect, test } from 'vitest'

import { parseArgs } from '../../../scripts/fleet/weekly-update.mts'

describe('weekly-update parseArgs', () => {
  test('defaults: agent on, PR off, gh-aw-matching script defaults', () => {
    const o = parseArgs([])
    expect(o.agent).toBe(true)
    expect(o.openPr).toBe(false)
    expect(o.testSetupScript).toBe('pnpm run build')
    expect(o.testScript).toBe('pnpm test')
    expect(o.updateModel).toBe('haiku')
    expect(o.prTitlePrefix).toBe('chore(deps): weekly dependency update')
    expect(o.prBase).toBeUndefined()
  })

  test('--no-agent forces deterministic-only', () => {
    expect(parseArgs(['--no-agent']).agent).toBe(false)
  })

  test('--pr opts into a PR; --no-pr wins when both are present', () => {
    expect(parseArgs(['--pr']).openPr).toBe(true)
    expect(parseArgs(['--pr', '--no-pr']).openPr).toBe(false)
    expect(parseArgs(['--no-pr']).openPr).toBe(false)
  })

  test('flag values override the defaults', () => {
    const o = parseArgs([
      '--test-setup-script',
      'pnpm run prep',
      '--test-script',
      'pnpm run t',
      '--update-model',
      'sonnet',
      '--pr-base',
      'develop',
      '--pr-title-prefix',
      'chore: deps',
    ])
    expect(o.testSetupScript).toBe('pnpm run prep')
    expect(o.testScript).toBe('pnpm run t')
    expect(o.updateModel).toBe('sonnet')
    expect(o.prBase).toBe('develop')
    expect(o.prTitlePrefix).toBe('chore: deps')
  })
})
