// vitest specs for check-dispatch-table-is-current.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import { dispatchTableIsCurrent } from '../../../scripts/fleet/check/dispatch-table-is-current.mts'
import { FLEET_HOOKS_DIR } from '../../../scripts/fleet/make-hook-dispatch.mts'

test('returns true: the committed dispatch table matches a fresh regen', () => {
  // The repo's tree is kept current by the cascade + build-hook-bundle, so a
  // regen over the live hook dirs equals the committed table.
  assert.equal(dispatchTableIsCurrent(), true)
})

test('returns false: a missing/stale dispatch file is drift, not a pass', () => {
  // A nonexistent dispatch path → on-disk "" ≠ the (non-empty) regen → drift.
  // This is the concurrent-cargo class: a table out of sync with the hook set
  // (the fail-loud signal the check exists to raise).
  assert.equal(
    dispatchTableIsCurrent(
      FLEET_HOOKS_DIR,
      '/nonexistent/_dispatch/dispatch-table.mts',
    ),
    false,
  )
})
