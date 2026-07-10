import assert from 'node:assert/strict'

import { test } from 'vitest'

import { BADGE_PREFIX } from '../../../scripts/fleet/researching-recency/lib/markers.mts'
import { renderBadge } from '../../../scripts/fleet/researching-recency/lib/render/compact.mts'

test('renderBadge is the first-line badge with the synced date', () => {
  const badge = renderBadge('2026-06-07')
  assert.ok(badge.startsWith(BADGE_PREFIX))
  assert.ok(badge.includes('synced 2026-06-07'))
})
