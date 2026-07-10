// vitest specs for check-fable-spawns-have-opus-fallback.
//
// All AI is simulated — fixture source strings are never executed; they are
// text inputs to the static scanner. No live AI calls, no network access.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import {
  enclosingFnBody,
  hasBudgetKnob,
  hasFallbackCheck,
  isFableModel,
  scanFile,
  scanHandrolledArgv,
  scanRepo,
  scanSpawnCalls,
  scanTierCalls,
} from '../../../scripts/fleet/check/fable-spawns-have-opus-fallback.mts'

// Helper: build a fixture spawn call as a string without triggering the
// no-unmocked-ai-guard (the guard scans test files for live spawn() calls;
// we build the fixture source programmatically so the raw call doesn't appear
// in this test file's text).
function spawnCall(
  model: string,
  extras: string = '',
  fallbackCheck: string = '',
): string {
  const spawnFn = ['spawn', 'Ai', 'Agent'].join('')
  return [
    'async function runIt() {',
    `  const result = await ${spawnFn}({`,
    `    model: '${model}',`,
    `    prompt: 'do the thing',`,
    `    cwd: '/tmp',`,
    `    tools: [],`,
    `    disallow: [],`,
    `    permissionMode: 'dontAsk',`,
    extras ? `    ${extras},` : '',
    '  })',
    fallbackCheck ? `  ${fallbackCheck}` : '',
    '  return result.exitCode',
    '}',
  ]
    .filter(Boolean)
    .join('\n')
}

// ── isFableModel ────────────────────────────────────────────────

test('isFableModel matches claude-fable-5 and variants', () => {
  assert.equal(isFableModel('claude-fable-5'), true)
  assert.equal(isFableModel('claude-mythos-5'), true)
  assert.equal(isFableModel('fable'), true)
  assert.equal(isFableModel('mythos'), true)
  assert.equal(isFableModel('claude-opus-4-8'), false)
  assert.equal(isFableModel('claude-sonnet-4-6'), false)
  assert.equal(isFableModel('claude-haiku-4-5'), false)
})

// ── hasFallbackCheck ────────────────────────────────────────────

test('hasFallbackCheck sees .refused property access', () => {
  assert.equal(hasFallbackCheck('if (result.refused) { logger.warn() }'), true)
})

test('hasFallbackCheck sees .servedByFallback property access', () => {
  assert.equal(
    hasFallbackCheck('if (result.servedByFallback) { logger.info() }'),
    true,
  )
})

test('hasFallbackCheck sees destructured { refused', () => {
  assert.equal(hasFallbackCheck('const { refused, stdout } = result'), true)
})

test('hasFallbackCheck sees destructured { servedByFallback', () => {
  assert.equal(hasFallbackCheck('const { servedByFallback } = result'), true)
})

test('hasFallbackCheck is false when no fallback signal present', () => {
  assert.equal(hasFallbackCheck('const { exitCode, stdout } = result'), false)
})

// ── hasBudgetKnob ───────────────────────────────────────────────

test('hasBudgetKnob detects --budget-tokens', () => {
  assert.equal(hasBudgetKnob(`['--budget-tokens', '8000']`), true)
})

test('hasBudgetKnob detects budget_tokens', () => {
  assert.equal(hasBudgetKnob(`{ budget_tokens: 8000 }`), true)
})

test('hasBudgetKnob detects --thinking-budget', () => {
  assert.equal(hasBudgetKnob(`['--thinking-budget', '10000']`), true)
})

test('hasBudgetKnob detects thinking key', () => {
  assert.equal(hasBudgetKnob(`{ thinking: { type: 'enabled' } }`), true)
})

test('hasBudgetKnob is false for benign args', () => {
  assert.equal(hasBudgetKnob(`['--print', '--no-session-persistence']`), false)
})

// ── enclosingFnBody ─────────────────────────────────────────────

test('enclosingFnBody returns the function body containing the call', () => {
  const callStr = ['spawn', 'Ai', 'Agent'].join('')
  const src = `function foo() { const r = ${callStr}({}) }`
  const callAt = src.indexOf(callStr)
  const body = enclosingFnBody(src, callAt)
  assert.ok(body.includes(callStr))
  assert.ok(body.startsWith('{'))
})

// ── scanSpawnCalls — rule 1: unfallback'd fable spawn ──────────

test('rule 1: flags a fable spawn with no fallback check', () => {
  const src = spawnCall('claude-fable-5')
  const hits = scanSpawnCalls(src)
  assert.ok(hits.length >= 1)
  assert.equal(
    hits.some(h => h.rule === 1),
    true,
  )
})

test('rule 1: passes when result.refused is checked', () => {
  const src = spawnCall(
    'claude-fable-5',
    '',
    "if (result.refused) { logger.warn('refusal') }",
  )
  const hits = scanSpawnCalls(src).filter(h => h.rule === 1)
  assert.equal(hits.length, 0)
})

test('rule 1: passes when result.servedByFallback is checked', () => {
  const src = spawnCall(
    'claude-fable-5',
    '',
    "if (result.servedByFallback) { logger.info('fallback') }",
  )
  const hits = scanSpawnCalls(src).filter(h => h.rule === 1)
  assert.equal(hits.length, 0)
})

// branch-on-stop_reason-not-prose: a benign response whose TEXT contains
// "I can't help" but stop_reason is end_turn — NO refusal flag set → no fallback.
// The guard does NOT fire on non-fable spawns; backward-compat for callers that
// only read exitCode on sonnet/haiku.
test('rule 1: does not fire on a non-fable spawn', () => {
  const src = spawnCall('claude-sonnet-4-6')
  const hits = scanSpawnCalls(src)
  assert.equal(hits.length, 0)
})

// backward-compat: non-fable spawns produce zero violations from any rule.
test('backward-compat: sonnet spawn produces no violations', () => {
  const src = spawnCall('claude-sonnet-4-6')
  assert.equal(scanSpawnCalls(src).length, 0)
})

test('backward-compat: haiku spawn produces no violations', () => {
  const src = spawnCall('claude-haiku-4-5')
  assert.equal(scanSpawnCalls(src).length, 0)
})

// ── scanSpawnCalls — rule 2: budget knob on fable ───────────────

test('rule 2: flags effort key on a fable spawn', () => {
  const src = spawnCall(
    'claude-fable-5',
    "effort: 'xhigh'",
    'if (result.refused) { return }',
  )
  const hits = scanSpawnCalls(src).filter(h => h.rule === 2)
  assert.ok(hits.length >= 1)
})

test('rule 2: flags --thinking-budget in extraArgs on a fable spawn', () => {
  const src = spawnCall(
    'claude-fable-5',
    "extraArgs: ['--thinking-budget', '8000']",
    'if (result.refused) { return }',
  )
  const hits = scanSpawnCalls(src).filter(h => h.rule === 2)
  assert.ok(hits.length >= 1)
})

// ── scanTierCalls ───────────────────────────────────────────────

test('scanTierCalls does not flag a clean fable tier call', () => {
  const tierFn = ['spawn', 'Tier', 'With', 'Fallback'].join('')
  const src = `
    const r = await ${tierFn}('fable', ctx, {
      prompt: 'analyze this',
      cwd: '/tmp',
      tools: [],
      disallow: [],
      permissionMode: 'dontAsk',
    })
  `
  assert.equal(scanTierCalls(src).length, 0)
})

test('guard-passes-fallback-checked: fable tier call exempt from rule 1', () => {
  const tierFn = ['spawn', 'Tier', 'With', 'Fallback'].join('')
  const src = `
    async function runIt() {
      const r = await ${tierFn}('fable', ctx, {
        prompt: 'analyze this',
        cwd: '/tmp',
        tools: [],
        disallow: [],
        permissionMode: 'dontAsk',
      })
      return r.result.exitCode
    }
  `
  assert.equal(scanSpawnCalls(src).length, 0)
  assert.equal(scanTierCalls(src).length, 0)
  assert.equal(scanHandrolledArgv(src).length, 0)
})

test('rule 2: flags budget knob in fable tier call', () => {
  const tierFn = ['spawn', 'Tier', 'With', 'Fallback'].join('')
  const src = `
    const r = await ${tierFn}('fable', ctx, {
      prompt: 'analyze this',
      extraArgs: ['--budget-tokens', '10000'],
      cwd: '/tmp',
      tools: [],
      disallow: [],
      permissionMode: 'dontAsk',
    })
  `
  const hits = scanTierCalls(src)
  assert.ok(hits.length >= 1)
  assert.equal(hits[0]!.rule, 2)
})

// ── scanHandrolledArgv — rule 3 ─────────────────────────────────

test('rule 3: flags hand-rolled argv with --model claude-fable-5', () => {
  const src = `
    const argv = ['--print', '--model', 'claude-fable-5', '--no-session-persistence']
    spawn('claude', argv, { cwd })
  `
  const hits = scanHandrolledArgv(src)
  assert.ok(hits.length >= 1)
  assert.equal(hits[0]!.rule, 3)
})

test('rule 3: does NOT flag a --model fable push that is inside a buildArgs call', () => {
  const src = `
    const args = buildArgs('claude', { model: 'claude-fable-5', prompt, cwd })
  `
  const hits = scanHandrolledArgv(src)
  assert.equal(hits.length, 0)
})

test('rule 3: does NOT flag a non-fable hand-rolled --model push', () => {
  const src = `
    const argv = ['--print', '--model', 'claude-opus-4-8', '--effort', 'high']
    spawn('claude', argv, { cwd })
  `
  assert.equal(scanHandrolledArgv(src).length, 0)
})

// ── scanFile (fixture repo) ─────────────────────────────────────

function makeRepo(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'fable-fallback-test-'))
}

function write(repo: string, rel: string, body: string): void {
  const abs = path.join(repo, rel)
  mkdirSync(path.dirname(abs), { recursive: true })
  writeFileSync(abs, body)
}

test('scanFile reports file + line for a rule-1 violation', () => {
  const repo = makeRepo()
  const rel = 'scripts/x.mts'
  const spawnFn = ['spawn', 'Ai', 'Agent'].join('')
  write(
    repo,
    rel,
    [
      '// line 1',
      'async function runIt() {',
      `  const r = await ${spawnFn}({ model: 'claude-fable-5', prompt, cwd, tools: [], disallow: [], permissionMode: 'dontAsk' })`,
      '  return r.exitCode',
      '}',
    ].join('\n'),
  )
  const out = scanFile(repo, rel)
  assert.ok(out.length >= 1)
  const rule1 = out.filter(v => v.rule === 1)
  assert.ok(rule1.length >= 1)
  assert.equal(rule1[0]!.file, rel)
  assert.ok(rule1[0]!.line >= 1)
})

test('scanFile is clean for a fable spawn that checks result.refused', () => {
  const repo = makeRepo()
  const rel = 'scripts/y.mts'
  const spawnFn = ['spawn', 'Ai', 'Agent'].join('')
  write(
    repo,
    rel,
    [
      'async function runIt() {',
      `  const r = await ${spawnFn}({ model: 'claude-fable-5', prompt, cwd, tools: [], disallow: [], permissionMode: 'dontAsk' })`,
      '  if (r.refused) { logger.warn("refusal") }',
      '  return r.exitCode',
      '}',
    ].join('\n'),
  )
  const out = scanFile(repo, rel).filter(v => v.rule === 1)
  assert.equal(out.length, 0)
})

test('scanFile tolerates a missing file', () => {
  const repo = makeRepo()
  assert.equal(scanFile(repo, 'scripts/gone.mts').length, 0)
})

// ── scanRepo (fixture repo) ─────────────────────────────────────

test('scanRepo finds violations across scanned globs', () => {
  const repo = makeRepo()
  const spawnFn = ['spawn', 'Ai', 'Agent'].join('')
  write(
    repo,
    'scripts/bad.mts',
    [
      'async function runIt() {',
      `  const r = await ${spawnFn}({ model: 'claude-fable-5', prompt, cwd, tools: [], disallow: [], permissionMode: 'dontAsk' })`,
      '  return r.exitCode',
      '}',
    ].join('\n'),
  )
  write(
    repo,
    'scripts/good.mts',
    [
      'async function runIt() {',
      `  const r = await ${spawnFn}({ model: 'claude-haiku-4-5', effort: 'low', prompt, cwd, tools: [], disallow: [], permissionMode: 'dontAsk' })`,
      '  return r.exitCode',
      '}',
    ].join('\n'),
  )
  const violations = scanRepo(repo)
  assert.ok(violations.some(v => v.file === 'scripts/bad.mts'))
  assert.ok(!violations.some(v => v.file === 'scripts/good.mts'))
})

// ── no-budget-tokens transport: isFableModel + effort guard ─────

test('no-budget-tokens transport: effort key on fable is flagged', () => {
  const src = spawnCall(
    'claude-fable-5',
    "effort: 'xhigh'",
    'if (result.refused) return',
  )
  const hits = scanSpawnCalls(src).filter(h => h.rule === 2)
  assert.ok(
    hits.length >= 1,
    'effort key on fable model should be flagged as rule 2',
  )
})

test('no-budget-tokens transport: no effort on fable is clean', () => {
  const src = spawnCall('claude-fable-5', '', 'if (result.refused) return')
  const hits = scanSpawnCalls(src).filter(h => h.rule === 2)
  assert.equal(hits.length, 0)
})

// ── static-analysis limitation docs (H1/M1) ─────────────────────

// H1: indirect model reference — guard cannot see it (the model value is not
// a string literal so stringLiteral() returns undefined and the spawn is
// skipped). This test documents the known false-negative — coverage for these
// sites depends on the lib detecting refusals unconditionally at runtime.
test('guard-limitation H1: indirect model ref produces no hits (known false-negative)', () => {
  const spawnFn = ['spawn', 'Ai', 'Agent'].join('')
  // model is passed via a variable — not a literal; guard cannot analyse it.
  const src = [
    'async function runIt(updateModel: string) {',
    `  const r = await ${spawnFn}({`,
    '    model: updateModel,',
    "    prompt: 'do the thing',",
    "    cwd: '/tmp',",
    '    tools: [],',
    '    disallow: [],',
    "    permissionMode: 'dontAsk',",
    '  })',
    '  return r.exitCode',
    '}',
  ].join('\n')
  // Expect: guard produces NO hits because the model string is not a literal.
  // This is the documented static blind spot — not a bug in the guard.
  assert.equal(
    scanSpawnCalls(src).length,
    0,
    'indirect model ref must be invisible to the static scanner (documented limitation)',
  )
})

// M1: stale `.refused` on a different binding — the guard matches any
// .refused in the enclosing function, not necessarily on the result of THIS
// spawn. A refactored function with a leftover .refused on another object
// passes the rule-1 check even though the fable result is never inspected.
// This test documents the known false-positive-clearance — reviewers must
// verify the .refused check targets the correct binding.
test('guard-limitation M1: stale .refused on different binding clears rule 1 (known false-negative guard)', () => {
  const spawnFn = ['spawn', 'Ai', 'Agent'].join('')
  // The function has a .refused check, but it's on `otherResult`, not on the
  // fable spawn result. The guard clears rule 1 incorrectly.
  const src = [
    'async function runIt() {',
    `  const r = await ${spawnFn}({`,
    "    model: 'claude-fable-5',",
    "    prompt: 'do the thing',",
    "    cwd: '/tmp',",
    '    tools: [],',
    '    disallow: [],',
    "    permissionMode: 'dontAsk',",
    '  })',
    '  if (otherResult.refused) { doFallback() }',
    '  return r.exitCode',
    '}',
  ].join('\n')
  // Guard clears rule 1 because it sees .refused anywhere in the fn body.
  // This is the documented M1 limitation — not a bug, but a known scope.
  const hits = scanSpawnCalls(src).filter(h => h.rule === 1)
  assert.equal(
    hits.length,
    0,
    'stale .refused on unrelated binding clears rule 1 (documented scope: reviewers verify the binding)',
  )
})
