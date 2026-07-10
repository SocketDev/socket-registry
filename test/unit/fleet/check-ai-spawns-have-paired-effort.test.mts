// vitest specs for check-ai-spawns-have-paired-effort.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import {
  FLOOR_EFFORT,
  FLOOR_MODEL,
  KNOWN_MODELS,
  hasAdjacentComment,
  objectSpan,
  propValue,
  scanBackendArgv,
  scanFile,
  scanSpawnCalls,
  stringLiteral,
} from '../../../scripts/fleet/check/ai-spawns-have-paired-effort.mts'

// ── objectSpan ──────────────────────────────────────────────────

test('objectSpan returns the balanced-brace span', () => {
  const text = 'foo({ a: 1, b: { c: 2 } })'
  const start = text.indexOf('{')
  assert.equal(objectSpan(text, start), '{ a: 1, b: { c: 2 } }')
})

test('objectSpan returns empty on an unbalanced/truncated literal', () => {
  const text = 'foo({ a: 1, b: { c: 2 }'
  assert.equal(objectSpan(text, text.indexOf('{')), '')
})

// ── propValue / stringLiteral ───────────────────────────────────

test('propValue reads an explicit key:value', () => {
  assert.equal(propValue(`{ model: 'x', effort: 'low' }`, 'model'), `'x'`)
  assert.equal(propValue(`{ model: 'x', effort: 'low' }`, 'effort'), `'low'`)
})

test('propValue returns undefined for a shorthand key', () => {
  assert.equal(propValue(`{ model, effort: 'low' }`, 'model'), undefined)
})

test('propValue stops at the top-level comma, not a nested one', () => {
  assert.equal(propValue(`{ model: foo(a, b), prompt }`, 'model'), 'foo(a, b)')
})

test('stringLiteral unwraps a plain string, rejects an identifier', () => {
  assert.equal(stringLiteral(`'high'`), 'high')
  assert.equal(stringLiteral(`"claude-opus-4-8"`), 'claude-opus-4-8')
  assert.equal(stringLiteral('EFFORT'), undefined)
  assert.equal(stringLiteral(undefined), undefined)
})

// ── hasAdjacentComment ──────────────────────────────────────────

test('hasAdjacentComment sees a comment inside the span', () => {
  const span = `{ /* deep reasoning */ model: 'x', effort: 'max' }`
  assert.equal(hasAdjacentComment('', 0, span), true)
})

test('hasAdjacentComment sees a comment on the line above the call', () => {
  const text = `// premium model for the hard pass\nspawnAiAgent({})`
  assert.equal(
    hasAdjacentComment(text, text.indexOf('spawnAiAgent'), '{}'),
    true,
  )
})

test('hasAdjacentComment is false with no nearby comment', () => {
  const text = `const x = 1\n\n\nspawnAiAgent({})`
  assert.equal(
    hasAdjacentComment(text, text.indexOf('spawnAiAgent'), '{}'),
    false,
  )
})

// ── scanSpawnCalls — pin BOTH ───────────────────────────────────

test('scanSpawnCalls flags a spawn with model but no effort', () => {
  const src = `await spawnAiAgent({
    ...AI_PROFILE.edit,
    cwd,
    model,
    prompt,
  })`
  const hits = scanSpawnCalls(src)
  assert.equal(hits.length, 1)
  assert.match(hits[0]!.detail, /omits `effort`/)
})

test('scanSpawnCalls flags a spawn with effort but no model', () => {
  const src = `await spawnAiAgent({ ...AI_PROFILE.edit, cwd, effort: 'low', prompt })`
  const hits = scanSpawnCalls(src)
  assert.equal(hits.length, 1)
  assert.match(hits[0]!.detail, /omits `model`/)
})

test('scanSpawnCalls flags a spawn that omits both model and effort', () => {
  // Naming neither accepts the agent default — not necessarily the floor. Pin
  // both, floor by default.
  const src = `await spawnAiAgent({ ...AI_PROFILE.read, cwd, prompt })`
  const hits = scanSpawnCalls(src)
  assert.equal(hits.length, 1)
  assert.match(hits[0]!.detail, /omits `model` and `effort`/)
})

test('scanSpawnCalls passes a spawn that pins both at the floor', () => {
  const src = `await spawnAiAgent({
    ...AI_PROFILE.edit,
    cwd,
    effort: '${FLOOR_EFFORT}',
    model: '${FLOOR_MODEL}',
    prompt,
  })`
  assert.equal(scanSpawnCalls(src).length, 0)
})

test('scanSpawnCalls passes both pinned via non-literal identifiers', () => {
  // Indirected through constants/options → can't floor-check → pin-both only.
  const src = `spawnAiAgent({ cwd, effort: EFFORT, model: MODEL, prompt })`
  assert.equal(scanSpawnCalls(src).length, 0)
})

// ── scanSpawnCalls — floor justification ────────────────────────

test('scanSpawnCalls flags a model escalation with no comment', () => {
  const src = `spawnAiAgent({ cwd, effort: 'low', model: 'claude-opus-4-8', prompt })`
  const hits = scanSpawnCalls(src)
  assert.equal(hits.length, 1)
  assert.match(hits[0]!.detail, /escalates above the floor/)
  assert.match(hits[0]!.detail, /claude-opus-4-8/)
})

test('scanSpawnCalls flags an effort escalation with no comment', () => {
  const src = `spawnAiAgent({ cwd, effort: 'max', model: '${FLOOR_MODEL}', prompt })`
  const hits = scanSpawnCalls(src)
  assert.equal(hits.length, 1)
  assert.match(hits[0]!.detail, /effort 'max'/)
})

test('scanSpawnCalls passes an escalation justified by an adjacent comment', () => {
  const src = `// opus + max: the migration needs deep cross-file reasoning
  spawnAiAgent({ cwd, effort: 'max', model: 'claude-opus-4-8', prompt })`
  assert.equal(scanSpawnCalls(src).length, 0)
})

test('scanSpawnCalls passes an escalation justified by an in-span comment', () => {
  const src = `spawnAiAgent({
    cwd,
    // sonnet for the harder authoring pass
    effort: 'medium',
    model: 'claude-sonnet-4-6',
    prompt,
  })`
  assert.equal(scanSpawnCalls(src).length, 0)
})

// ── scanSpawnCalls — unknown-model drift ────────────────────────

test('KNOWN_MODELS carries the canonical tier + registry ids, not a stale one', () => {
  // The floor and the other tier ids are known; a renamed/stale id is not.
  assert.equal(KNOWN_MODELS.has(FLOOR_MODEL), true)
  assert.equal(KNOWN_MODELS.has('claude-opus-4-8'), true)
  assert.equal(KNOWN_MODELS.has('claude-sonnet-4-6'), true)
  assert.equal(KNOWN_MODELS.has('claude-sonnet-4-5'), false)
})

test('scanSpawnCalls flags a spawn pinning a model the fleet does not know', () => {
  // A justifying comment excuses the spend escalation but NOT a nonexistent
  // model id — the drift hit fires regardless, leaving exactly one hit.
  const src = `agent(buildPrompt, {
    // deep reasoning pass for the migration
    effort: 'max',
    model: 'claude-sonnet-4-5',
    phase: 'x',
  })`
  const hits = scanSpawnCalls(src)
  assert.equal(hits.length, 1)
  assert.match(hits[0]!.detail, /unknown model 'claude-sonnet-4-5'/)
})

test('scanSpawnCalls does not raise a drift hit for a known escalated model', () => {
  // claude-opus-4-8 is a real id; a justified escalation to it stays clean.
  const src = `agent(buildPrompt, {
    // opus for the hard cross-file pass
    effort: 'max',
    model: 'claude-opus-4-8',
    phase: 'x',
  })`
  assert.equal(scanSpawnCalls(src).length, 0)
})

// ── scanSpawnCalls — Workflow agent() + dedup ───────────────────

test('scanSpawnCalls flags a Workflow agent() spawn missing effort', () => {
  const src = `agent({ cwd, model: '${FLOOR_MODEL}', prompt })`
  const hits = scanSpawnCalls(src)
  assert.equal(hits.length, 1)
  assert.match(hits[0]!.detail, /agent\(\{…}\)/)
})

test('scanSpawnCalls ignores a non-spawn agent() call', () => {
  // A bare agent({ name, role }) that carries no model/effort/prompt is not an
  // AI spawn — must not be flagged.
  const src = `agent({ name: 'reviewer', role: 'qa' })`
  assert.equal(scanSpawnCalls(src).length, 0)
})

test('scanSpawnCalls reports one hit per offending call', () => {
  const src = `
    spawnAiAgent({ cwd, model, prompt })
    spawnAiAgent({ cwd, effort: '${FLOOR_EFFORT}', model: '${FLOOR_MODEL}', prompt })
    spawnAiAgent({ cwd, model: 'claude-opus-4-8', effort: 'low', prompt })
  `
  // 1: missing effort. 2: clean floor. 3: model escalation, no comment.
  assert.equal(scanSpawnCalls(src).length, 2)
})

// ── scanBackendArgv ─────────────────────────────────────────────

test('scanBackendArgv flags a claude runner pushing --model without --effort', () => {
  const src = `
    const BACKENDS = { claude: { run() {
      return { argv: ['--print', '--model', model, '--no-session-persistence'] }
    } } }
  `
  const hits = scanBackendArgv(src)
  assert.equal(hits.length, 1)
  assert.match(hits[0]!.detail, /paired effort flag/)
})

test('scanBackendArgv passes a claude runner that pairs --effort', () => {
  const src = `
    const BACKENDS = { claude: { run() {
      return { argv: ['--print', '--model', model, '--effort', effort] }
    } } }
  `
  assert.equal(scanBackendArgv(src).length, 0)
})

test('scanBackendArgv passes a codex runner pairing model_reasoning_effort', () => {
  const src = `
    const BACKENDS = { codex: { bin: 'codex', run() {
      const model = process.env['CODEX_MODEL'] ?? 'gpt-5.5'
      const reasoning = process.env['CODEX_REASONING'] ?? 'xhigh'
      return { argv: ['exec', '--model', model, '-c', \`model_reasoning_effort=\${reasoning}\`] }
    } } }
  `
  assert.equal(scanBackendArgv(src).length, 0)
})

test('scanBackendArgv exempts a file with no claude/codex reference', () => {
  // A gemini/opencode-only runner has no effort flag and must not be flagged.
  const src = `
    const run = () => ({ argv: ['--print', '--model', model, '--workspace', cwd] })
  `
  assert.equal(scanBackendArgv(src).length, 0)
})

test('scanBackendArgv does NOT flag a kimi block sitting in a file that also has claude/codex', () => {
  // Regression: a kimi/gemini/opencode backend's --model push must not be
  // flagged just because a claude or codex backend lives in the same file.
  // kimi has no effort flag, so its push is legitimately effort-free.
  const src = `
    const BACKENDS = {
      claude: { bin: 'claude', run() {
        const model = process.env['CLAUDE_MODEL'] ?? 'opus'
        const effort = process.env['CLAUDE_EFFORT'] ?? 'high'
        return { argv: ['--print', '--model', model, '--effort', effort] }
      } },
      kimi: { bin: 'kimi', run() {
        const model = process.env['KIMI_MODEL'] ?? 'kimi-latest'
        return { argv: ['chat', '--model', model, '--no-stream'] }
      } },
    }
  `
  assert.equal(scanBackendArgv(src).length, 0)
})

// ── scanFile (fixture repo) ─────────────────────────────────────

function makeRepo(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'effort-pair-test-'))
}

function write(repo: string, rel: string, body: string): void {
  const abs = path.join(repo, rel)
  mkdirSync(path.dirname(abs), { recursive: true })
  writeFileSync(abs, body)
}

test('scanFile reports file + line for an offending spawn', () => {
  const repo = makeRepo()
  const rel = 'scripts/x.mts'
  write(repo, rel, `// line 1\nspawnAiAgent({ cwd, model, prompt })\n`)
  const out = scanFile(repo, rel)
  assert.equal(out.length, 1)
  assert.equal(out[0]!.file, rel)
  assert.equal(out[0]!.line, 2)
})

test('scanFile is clean for a floor-pinned spawn', () => {
  const repo = makeRepo()
  const rel = 'scripts/x.mts'
  write(
    repo,
    rel,
    `spawnAiAgent({ cwd, effort: '${FLOOR_EFFORT}', model: '${FLOOR_MODEL}', prompt })\n`,
  )
  assert.equal(scanFile(repo, rel).length, 0)
})

test('scanFile tolerates a missing file', () => {
  const repo = makeRepo()
  assert.equal(scanFile(repo, 'scripts/gone.mts').length, 0)
})

// ── scanSpawnCalls — two-arg agent(prompt, {…}) form ───────────

test('scanSpawnCalls flags two-arg agent() missing effort', () => {
  // agent(promptIdent, { model: 'x' }) — effort absent, must be flagged.
  const src = `agent(buildPlanPrompt, { model: '${FLOOR_MODEL}', phase: 'Plan' })`
  const hits = scanSpawnCalls(src)
  assert.equal(hits.length, 1)
  assert.match(hits[0]!.detail, /omits `effort`/)
})

test('scanSpawnCalls passes two-arg agent() with both model and effort', () => {
  // agent(promptIdent, { effort: 'low', model: 'claude-haiku-4-5' }) — clean.
  const src = `agent(buildPlanPrompt, { effort: '${FLOOR_EFFORT}', model: '${FLOOR_MODEL}', phase: 'Plan' })`
  assert.equal(scanSpawnCalls(src).length, 0)
})

test('scanSpawnCalls does NOT flag array-join first-arg agent() — blind spot pinned', () => {
  // agent([...].join('\n'), { model: 'x', effort: 'low' }) — the array literal
  // first-arg does not match the identifier-only relaxed callRe. This test
  // documents the known blind spot so any future regex change is a conscious
  // decision rather than an accidental regression.
  const src = `agent(['line1', 'line2'].join('\\n'), { effort: '${FLOOR_EFFORT}', model: '${FLOOR_MODEL}', phase: 'Plan' })`
  assert.equal(scanSpawnCalls(src).length, 0)
})
