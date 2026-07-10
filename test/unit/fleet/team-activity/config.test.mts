import assert from 'node:assert/strict'

import { test } from 'vitest'

import { withDefaults } from '../../../../scripts/fleet/team-activity/lib/config.mts'
import type { PartialConfig } from '../../../../scripts/fleet/team-activity/lib/config.mts'

const MINIMAL: PartialConfig = {
  name: 'eng-surf',
  org: 'ExampleOrg',
  selfLogin: 'me',
}

test('fills defaults for every optional field', () => {
  const config = withDefaults(MINIMAL)
  assert.deepEqual(config.authors, [])
  assert.deepEqual(config.repos, [])
  assert.equal(config.includeIssues, true)
  assert.equal(config.skipBots, true)
  assert.equal(config.linear, undefined)
  assert.equal(config.slack, undefined)
  assert.equal(config.name, 'eng-surf')
})

test('throws loud when a required field is missing', () => {
  assert.throws(
    () => withDefaults({ org: 'ExampleOrg', selfLogin: 'me' }),
    /missing required field\(s\): name/,
  )
  assert.throws(() => withDefaults({}), /name, org, selfLogin/)
})

test('normalizes a linear block only when a team is present', () => {
  assert.equal(withDefaults({ ...MINIMAL, linear: {} }).linear, undefined)
  const withLinear = withDefaults({
    ...MINIMAL,
    linear: { team: 'ENG' },
  })
  assert.deepEqual(withLinear.linear, {
    deriveRoster: false,
    enrich: true,
    linearToGithub: {},
    team: 'ENG',
  })
})

test('normalizes a slack block only when a channel is present', () => {
  assert.equal(withDefaults({ ...MINIMAL, slack: {} }).slack, undefined)
  const withSlack = withDefaults({
    ...MINIMAL,
    slack: { channel: 'C123' },
  })
  assert.deepEqual(withSlack.slack, {
    channel: 'C123',
    notifyStyle: 'reaction',
    read: false,
  })
})
