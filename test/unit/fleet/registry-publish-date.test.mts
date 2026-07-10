// vitest specs for the lean registry publish-date helper. Mocks HTTP with nock
// under disableNetConnect() — fetchPackagePublishDate reads the packument `time`
// map via httpJson (the fleet "never bare fetch — only the bootstrap goes bare"
// rule) and is FAIL-OPEN: any failure (network, non-200, unknown version)
// resolves undefined, never throws. The module memoizes per `name@version`, so
// each test uses a DISTINCT name to avoid cross-test cache bleed.

import assert from 'node:assert/strict'

import nock from 'nock'
import { afterAll, afterEach, beforeAll, test } from 'vitest'

import { fetchPackagePublishDate } from '../../../scripts/fleet/registry-publish-date.mts'

const REGISTRY = 'https://registry.npmjs.org'

beforeAll(() => {
  nock.disableNetConnect()
})

afterAll(() => {
  nock.enableNetConnect()
})

afterEach(() => {
  nock.cleanAll()
})

test('returns the YYYY-MM-DD slice of the packument time for the version', async () => {
  nock(REGISTRY)
    .get('/happy-pkg')
    .reply(200, { time: { '1.2.3': '2026-06-15T14:39:00.000Z' } })
  assert.equal(
    await fetchPackagePublishDate('happy-pkg', '1.2.3'),
    '2026-06-15',
  )
})

test('FAIL-OPEN: undefined when the version is absent from the time map', async () => {
  nock(REGISTRY)
    .get('/missing-version-pkg')
    .reply(200, { time: { '1.0.0': '2026-01-01T00:00:00.000Z' } })
  assert.equal(
    await fetchPackagePublishDate('missing-version-pkg', '9.9.9'),
    undefined,
  )
})

test('FAIL-OPEN: undefined on a non-200 response (after the retry)', async () => {
  // Two 404s cover both shapes — httpJson throwing (→ retry) or returning a
  // non-packument body (→ no `time`); either way the helper yields undefined.
  nock(REGISTRY).get('/gone-pkg').reply(404).get('/gone-pkg').reply(404)
  assert.equal(await fetchPackagePublishDate('gone-pkg', '1.0.0'), undefined)
})

test('encodes a scoped name (leading @ kept, slash percent-encoded)', async () => {
  nock(REGISTRY)
    .get(/scope/)
    .reply(200, { time: { '2.0.0': '2026-03-03T00:00:00.000Z' } })
  assert.equal(
    await fetchPackagePublishDate('@scope/pkg', '2.0.0'),
    '2026-03-03',
  )
})

test('memoizes per name@version (a second call makes no second request)', async () => {
  // Exactly one interceptor. A second fetch that hit the network would throw
  // under disableNetConnect and resolve undefined — so a matching date on the
  // second call proves the result was served from the memo.
  nock(REGISTRY)
    .get('/memo-pkg')
    .reply(200, { time: { '1.0.0': '2026-05-05T00:00:00.000Z' } })
  assert.equal(await fetchPackagePublishDate('memo-pkg', '1.0.0'), '2026-05-05')
  assert.equal(await fetchPackagePublishDate('memo-pkg', '1.0.0'), '2026-05-05')
})
