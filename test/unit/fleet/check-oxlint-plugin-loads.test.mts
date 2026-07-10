// vitest spec for the oxlint-plugin-loads lib helper and the countRuleDirs
// utility. assertPluginLoads and countRuleDirs are exercised with temp-dir
// fixtures so no real plugin binary or repo is needed. The check script's
// main() is entrypoint-guarded, so importing the lib directly is side-effect-free.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, test } from 'vitest'

import {
  assertPluginLoads,
  countRuleDirs,
} from '../../../scripts/fleet/lib/oxlint-plugin-loads.mts'

function makeTmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'oxlint-plugin-loads-'))
}

// Build the scaffold under <root>/.config/fleet/oxlint-plugin/
function makePluginRoot(root: string): string {
  const pluginDir = path.join(root, '.config', 'fleet', 'oxlint-plugin')
  mkdirSync(path.join(pluginDir, 'fleet'), { recursive: true })
  return pluginDir
}

// Add a fake rule dir with an index.mts so countRuleDirs sees it.
function addRuleDir(pluginDir: string, ruleName: string): void {
  const dir = path.join(pluginDir, 'fleet', ruleName)
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, 'index.mts'), '// placeholder\n')
}

// Write the plugin index.mts at <pluginDir>/index.mts.
function writeIndex(pluginDir: string, src: string): void {
  writeFileSync(path.join(pluginDir, 'index.mts'), src)
}

describe('countRuleDirs', () => {
  test('counts dirs that contain index.mts', () => {
    const root = makeTmpDir()
    const fleetDir = path.join(root, 'fleet')
    mkdirSync(fleetDir, { recursive: true })
    // Two rule dirs.
    for (const name of ['rule-a', 'rule-b']) {
      mkdirSync(path.join(fleetDir, name))
      writeFileSync(path.join(fleetDir, name, 'index.mts'), '// rule\n')
    }
    assert.equal(countRuleDirs(fleetDir), 2)
  })

  test('dirs without index.mts are not counted', () => {
    const root = makeTmpDir()
    const fleetDir = path.join(root, 'fleet')
    mkdirSync(path.join(fleetDir, 'empty-dir'), { recursive: true })
    assert.equal(countRuleDirs(fleetDir), 0)
  })

  test('dirs starting with _ are excluded', () => {
    const root = makeTmpDir()
    const fleetDir = path.join(root, 'fleet')
    mkdirSync(path.join(fleetDir, '_shared'), { recursive: true })
    writeFileSync(path.join(fleetDir, '_shared', 'index.mts'), '// shared\n')
    assert.equal(countRuleDirs(fleetDir), 0)
  })

  test('returns 0 for a non-existent dir without throwing', () => {
    assert.equal(
      countRuleDirs(path.join(os.tmpdir(), 'does-not-exist-xyz987')),
      0,
    )
  })

  test('mixed: real rules + excluded dirs are counted correctly', () => {
    const root = makeTmpDir()
    const fleetDir = path.join(root, 'fleet')
    mkdirSync(fleetDir, { recursive: true })
    // One real rule dir.
    mkdirSync(path.join(fleetDir, 'my-rule'))
    writeFileSync(path.join(fleetDir, 'my-rule', 'index.mts'), '// rule\n')
    // One _shared dir (excluded).
    mkdirSync(path.join(fleetDir, '_shared'))
    writeFileSync(path.join(fleetDir, '_shared', 'index.mts'), '// shared\n')
    // One dir without index.mts (excluded).
    mkdirSync(path.join(fleetDir, 'no-index'))
    assert.equal(countRuleDirs(fleetDir), 1)
  })
})

describe('assertPluginLoads', () => {
  test('no-plugin: no fleet dirs → no-plugin status (scaffolding-only repo)', async () => {
    const root = makeTmpDir()
    const result = await assertPluginLoads(root)
    assert.equal(result.status, 'no-plugin')
    assert.equal(result.expected, 0)
    assert.equal(result.registered, 0)
    assert.equal(result.error, undefined)
  })

  test('no-plugin: fleet dir exists but has no rule dirs → no-plugin', async () => {
    const root = makeTmpDir()
    const pluginDir = makePluginRoot(root)
    // Write index.mts but no rule dirs in fleet/.
    writeIndex(pluginDir, 'export default { rules: {} };\n')
    const result = await assertPluginLoads(root)
    assert.equal(result.status, 'no-plugin')
    assert.equal(result.expected, 0)
  })

  test('load-threw: index.mts throws on import → load-threw with error message', async () => {
    const root = makeTmpDir()
    const pluginDir = makePluginRoot(root)
    addRuleDir(pluginDir, 'my-rule')
    // Write an index that throws.
    writeIndex(
      pluginDir,
      'throw new Error("synthetic load failure for test");\n',
    )
    const result = await assertPluginLoads(root)
    assert.equal(result.status, 'load-threw')
    assert.equal(result.expected, 1)
    assert.equal(result.registered, 0)
    assert.ok(
      typeof result.error === 'string' && result.error.length > 0,
      'error should be a non-empty string',
    )
  })

  test('empty: index.mts loads but exports default with empty rules → empty status', async () => {
    const root = makeTmpDir()
    const pluginDir = makePluginRoot(root)
    addRuleDir(pluginDir, 'my-rule')
    // Export a plugin with no rules registered.
    writeIndex(
      pluginDir,
      'const plugin = { rules: {} };\nexport default plugin;\n',
    )
    const result = await assertPluginLoads(root)
    assert.equal(result.status, 'empty')
    assert.equal(result.expected, 1)
    assert.equal(result.registered, 0)
    assert.equal(result.error, undefined)
  })

  test('count-mismatch: registered count less than expected → count-mismatch', async () => {
    const root = makeTmpDir()
    const pluginDir = makePluginRoot(root)
    addRuleDir(pluginDir, 'rule-a')
    addRuleDir(pluginDir, 'rule-b')
    // Only one rule registered, two dirs exist.
    writeIndex(
      pluginDir,
      'const plugin = { rules: { "socket/rule-a": {} } };\nexport default plugin;\n',
    )
    const result = await assertPluginLoads(root)
    assert.equal(result.status, 'count-mismatch')
    assert.equal(result.expected, 2)
    assert.equal(result.registered, 1)
    assert.equal(result.error, undefined)
  })

  test('count-mismatch: registered count greater than expected → count-mismatch', async () => {
    const root = makeTmpDir()
    const pluginDir = makePluginRoot(root)
    addRuleDir(pluginDir, 'rule-a')
    // Two rules registered but only one dir exists.
    writeIndex(
      pluginDir,
      'const plugin = { rules: { "socket/rule-a": {}, "socket/rule-b": {} } };\nexport default plugin;\n',
    )
    const result = await assertPluginLoads(root)
    assert.equal(result.status, 'count-mismatch')
    assert.equal(result.expected, 1)
    assert.equal(result.registered, 2)
  })

  test('ok: registered count matches expected → ok status', async () => {
    const root = makeTmpDir()
    const pluginDir = makePluginRoot(root)
    addRuleDir(pluginDir, 'rule-a')
    addRuleDir(pluginDir, 'rule-b')
    // Two rules registered, two dirs.
    writeIndex(
      pluginDir,
      'const plugin = { rules: { "socket/rule-a": {}, "socket/rule-b": {} } };\nexport default plugin;\n',
    )
    const result = await assertPluginLoads(root)
    assert.equal(result.status, 'ok')
    assert.equal(result.expected, 2)
    assert.equal(result.registered, 2)
    assert.equal(result.error, undefined)
  })
})
