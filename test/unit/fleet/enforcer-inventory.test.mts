import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { collectLintRules } from '../../../scripts/fleet/lib/enforcer-inventory.mts'
import { REPO_ROOT } from '../../../scripts/fleet/paths.mts'

describe('collectLintRules (regression: real plugin layout)', () => {
  test('finds socket rules from fleet/<rule-id>/ directories', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'plugin-'))
    const pluginDir = path.join(
      dir,
      '.config',
      'fleet',
      'oxlint-plugin',
      'fleet',
    )
    mkdirSync(path.join(pluginDir, 'my-rule'), { recursive: true })
    mkdirSync(path.join(pluginDir, 'other-rule'), { recursive: true })
    const { socketRules } = collectLintRules(dir)
    assert.ok(socketRules.has('my-rule'), 'reads a rule dir as a socket rule')
    assert.ok(socketRules.has('other-rule'))
    assert.equal(socketRules.size, 2)
  })

  test('socketRules empty when the plugin is absent', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'no-plugin-'))
    assert.equal(collectLintRules(dir).socketRules.size, 0)
  })

  test('finds the real socket rules in THIS repo (path regression guard)', () => {
    const { socketRules } = collectLintRules(REPO_ROOT)
    assert.ok(
      socketRules.size > 0,
      'the wheelhouse ships socket/ rules; an empty set means the plugin path is wrong again',
    )
  })
})
