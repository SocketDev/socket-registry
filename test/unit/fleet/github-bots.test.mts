import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  BOT_PREFIXES,
  isBotLogin,
} from '../../../scripts/fleet/lib/github-bots.mts'

test('names dependabot, renovate, and [bot]-suffixed logins as bots', () => {
  assert.equal(isBotLogin('dependabot[bot]'), true)
  assert.equal(isBotLogin('dependabot'), true)
  assert.equal(isBotLogin('renovate[bot]'), true)
  assert.equal(isBotLogin('github-actions'), true)
  assert.equal(isBotLogin('cursor'), true)
  assert.equal(isBotLogin('some-app[bot]'), true)
})

test('names the review + fleet bots by their real GitHub logins', () => {
  // Verified to exist on GitHub before being added to BOT_PREFIXES.
  assert.equal(isBotLogin('copilot-pull-request-reviewer'), true)
  assert.equal(isBotLogin('chatgpt-codex-connector'), true)
  assert.equal(isBotLogin('coderabbitai[bot]'), true)
  assert.equal(isBotLogin('coderabbitai'), true)
  assert.equal(isBotLogin('pullfrog'), true)
  assert.equal(isBotLogin('pullfrog[bot]'), true)
  assert.equal(isBotLogin('claude[bot]'), true)
  assert.equal(isBotLogin('socket-bot'), true)
  assert.equal(isBotLogin('socket-security[bot]'), true)
})

test('treats humans and empty input as non-bots', () => {
  assert.equal(isBotLogin('jdalton'), false)
  assert.equal(isBotLogin('bcomnes'), false)
  assert.equal(isBotLogin(''), false)
  assert.equal(isBotLogin('   '), false)
})

test('BOT_PREFIXES stays sorted and covers dependabot', () => {
  assert.deepEqual(BOT_PREFIXES, [...BOT_PREFIXES].toSorted())
  assert.ok(BOT_PREFIXES.includes('dependabot'))
})
