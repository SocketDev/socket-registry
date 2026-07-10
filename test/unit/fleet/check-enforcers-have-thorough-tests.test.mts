// vitest specs for check-enforcers-have-thorough-tests.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import {
  countTestCases,
  hasBothRuleArms,
  scanHooks,
  scanRules,
} from '../../../scripts/fleet/check/enforcers-have-thorough-tests.mts'

// ── countTestCases ──────────────────────────────────────────────

test('countTestCases counts test( and it( registrations', () => {
  assert.equal(countTestCases("test('a', () => {})\ntest('b', () => {})"), 2)
  assert.equal(countTestCases("it('a', () => {})"), 1)
  assert.equal(countTestCases('no cases here'), 0)
})

test('countTestCases counts test.each blocks', () => {
  assert.equal(countTestCases("test.each([1,2])('x %s', () => {})"), 1)
})

test('countTestCases does not match describe or arbitrary identifiers', () => {
  assert.equal(countTestCases("describe('grp', () => {})\nlatest('x')"), 0)
})

// ── hasBothRuleArms ─────────────────────────────────────────────

test('hasBothRuleArms requires BOTH valid: and invalid:', () => {
  assert.equal(hasBothRuleArms('valid: [], invalid: []'), true)
  assert.equal(hasBothRuleArms('valid: []'), false)
  assert.equal(hasBothRuleArms('invalid: []'), false)
  assert.equal(hasBothRuleArms('neither arm'), false)
})

// ── scanHooks (temp-repo fixtures) ──────────────────────────────

function makeRepo(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'enf-test-'))
  mkdirSync(path.join(dir, '.claude', 'hooks', 'fleet'), { recursive: true })
  // Each rule creates its own .config/fleet/oxlint-plugin/fleet/<id>/ dir (see the
  // rule() helper); just the tier root needs to pre-exist.
  mkdirSync(path.join(dir, '.config', 'fleet', 'oxlint-plugin', 'fleet'), {
    recursive: true,
  })
  return dir
}

function hook(dir: string, name: string, testSrc?: string): void {
  const d = path.join(dir, '.claude', 'hooks', 'fleet', name)
  mkdirSync(d, { recursive: true })
  writeFileSync(path.join(d, 'index.mts'), '// hook\n')
  if (testSrc !== undefined) {
    // The relocated test lives under test/repo/, NOT co-located — matches the
    // HOOK_TEST_DIRS the check scans (resolved relative to this repo root).
    const testDir = path.join(dir, 'test', 'repo', 'unit', 'hooks')
    mkdirSync(testDir, { recursive: true })
    writeFileSync(path.join(testDir, `${name}.test.mts`), testSrc)
  }
}

test('scanHooks flags a hook with NO test', () => {
  const dir = makeRepo()
  hook(dir, 'foo-guard')
  const gaps = scanHooks(dir, { ownsRelocatedTests: true })
  assert.equal(gaps.length, 1)
  assert.equal(gaps[0]!.name, 'foo-guard')
  assert.match(gaps[0]!.reason, /no test/)
})

test('scanHooks flags a TOKEN test (only 1 case)', () => {
  const dir = makeRepo()
  hook(dir, 'foo-guard', "test('blocks bad', () => {})\n")
  const gaps = scanHooks(dir, { ownsRelocatedTests: true })
  assert.equal(gaps.length, 1)
  assert.match(gaps[0]!.reason, /token test/)
})

test('scanHooks PASSES a hook with 2+ cases', () => {
  const dir = makeRepo()
  hook(dir, 'foo-guard', "test('blocks', () => {})\ntest('passes', () => {})\n")
  assert.equal(scanHooks(dir, { ownsRelocatedTests: true }).length, 0)
})

test('scanHooks skips a dir with no index.mts (not a hook)', () => {
  const dir = makeRepo()
  mkdirSync(path.join(dir, '.claude', 'hooks', 'fleet', '_shared'), {
    recursive: true,
  })
  assert.equal(scanHooks(dir, { ownsRelocatedTests: true }).length, 0)
})

test('scanHooks honors the NO_TEST_ALLOWLIST (installer hooks)', () => {
  const dir = makeRepo()
  hook(dir, 'setup-signing') // allowlisted — installer, no test required
  assert.equal(scanHooks(dir, { ownsRelocatedTests: true }).length, 0)
})

// ── scanRules (temp-repo fixtures) ──────────────────────────────

function rule(dir: string, name: string, testSrc?: string): void {
  const ruleDir = path.join(dir, '.config/fleet/oxlint-plugin/fleet', name)
  mkdirSync(ruleDir, { recursive: true })
  writeFileSync(path.join(ruleDir, 'index.mts'), '// rule\n')
  if (testSrc !== undefined) {
    // The relocated test lives under test/repo/, NOT co-located — matches the
    // LINT_RULE_TEST_DIRS the check scans (resolved relative to this repo root).
    const testDir = path.join(dir, 'test', 'repo', 'unit', 'lint-rules')
    mkdirSync(testDir, { recursive: true })
    writeFileSync(path.join(testDir, `${name}.test.mts`), testSrc)
  }
}

test('scanRules flags a rule with NO test', () => {
  const dir = makeRepo()
  rule(dir, 'my-rule')
  const gaps = scanRules(dir, { ownsRelocatedTests: true })
  assert.equal(gaps.length, 1)
  assert.match(gaps[0]!.reason, /no test under test\/repo/)
})

test('scanRules flags a test missing an arm (only valid:)', () => {
  const dir = makeRepo()
  rule(dir, 'my-rule', 'run({ valid: [{ code: "ok" }] })')
  const gaps = scanRules(dir, { ownsRelocatedTests: true })
  assert.equal(gaps.length, 1)
  assert.match(gaps[0]!.reason, /token test|arm/)
})

test('scanRules PASSES a test with both valid + invalid arms', () => {
  const dir = makeRepo()
  rule(dir, 'my-rule', 'run({ valid: [], invalid: [] })')
  assert.equal(scanRules(dir, { ownsRelocatedTests: true }).length, 0)
})
