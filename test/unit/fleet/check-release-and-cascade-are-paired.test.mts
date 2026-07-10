// vitest spec for check-release-and-cascade-are-paired. The check reads the
// LOCAL .config/socket-wheelhouse.json bundle pin and (gh-gated) asserts the
// release at bundle.ref carries a templateSha equal to bundle.cascadeSha. The
// network-touching path is gated; here we exercise the importable surface +
// the vacuous-pass behavior (the wheelhouse producer carries no pin).

import assert from 'node:assert/strict'

import { test } from 'vitest'

import { readBundlePin } from '../../../scripts/fleet/check/release-and-cascade-are-paired.mts'

test('readBundlePin returns undefined for the wheelhouse producer (no bundle pin)', () => {
  // The wheelhouse itself is the producer — it pins no bundle, so the check
  // passes vacuously rather than touching the network.
  const pin = readBundlePin()
  assert.equal(pin, undefined)
})

test('the check module exports its gh-gating + resolution surface', async () => {
  const mod =
    await import('../../../scripts/fleet/check/release-and-cascade-are-paired.mts')
  assert.equal(typeof mod.ghIsUsable, 'function')
  assert.equal(typeof mod.resolveReleaseTemplateSha, 'function')
  assert.equal(typeof mod.readBundlePin, 'function')
})
