import { describe, test } from 'vitest'
import assert from 'node:assert/strict'

import {
  buildInventory,
  splitHooks,
} from '../../../scripts/fleet/codify-scan/inventory.mts'
import { REPO_ROOT } from '../../../scripts/fleet/paths.mts'

describe('splitHooks', () => {
  test('buckets by -guard / -nudge suffix; else installer', () => {
    const out = splitHooks([
      'foo-guard',
      'bar-nudge',
      'setup-signing',
      'baz-guard',
    ])
    assert.deepEqual(out.guards, ['baz-guard', 'foo-guard'])
    assert.deepEqual(out.reminders, ['bar-nudge'])
    assert.deepEqual(out.installers, ['setup-signing'])
  })

  test('each bucket is sorted', () => {
    const out = splitHooks(['z-guard', 'a-guard', 'm-nudge', 'b-nudge'])
    assert.deepEqual(out.guards, ['a-guard', 'z-guard'])
    assert.deepEqual(out.reminders, ['b-nudge', 'm-nudge'])
  })
})

describe('buildInventory', () => {
  test('emits the full enforcement surface for this repo', () => {
    const inv = buildInventory(REPO_ROOT)
    assert.ok(inv.hooks.guards.length > 0, 'has guards')
    assert.ok(inv.hooks.reminders.length > 0, 'has reminders')
    assert.ok(inv.lintRules.socket.length > 0, 'has socket rules')
    assert.ok(inv.checks.length > 0, 'has check scripts')
    assert.ok(
      inv.checks.every(c => c.includes('/check/') || c.startsWith('check/')),
      'every check path is under a check/ dir',
    )
    assert.ok(inv.fleetDocs.length > 0, 'has fleet docs')
  })
})
