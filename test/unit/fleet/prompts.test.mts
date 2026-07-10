// vitest specs for the delegating-execution prompt builders.

import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import {
  executePrompt,
  followupPrompt,
  planPrompt,
  reviewPrompt,
} from '../../../scripts/fleet/lib/delegating-execution/prompts.mts'

// ── prompt builders ──────────────────────────────────────────────────────────

describe('prompt builders', () => {
  test('planPrompt returns non-empty string with key strings', () => {
    const p = planPrompt({ sensitivity: 'security', task: 'add a fleet hook' })
    assert.ok(p.length > 0, 'planPrompt must return non-empty string')
    assert.ok(p.includes('numbered plan'), `expected "numbered plan" in: ${p}`)
    assert.ok(
      p.includes('.claude/plans/'),
      `expected ".claude/plans/" in: ${p}`,
    )
    assert.ok(
      p.includes('execution prompt'),
      `expected "execution prompt" in: ${p}`,
    )
    assert.ok(
      p.includes('do not edit source files'),
      `expected "do not edit source files" in: ${p}`,
    )
    assert.ok(p.includes('add a fleet hook'), `expected task in: ${p}`)
    assert.ok(p.includes('security'), `expected sensitivity in: ${p}`)
  })

  test('executePrompt returns non-empty string with key strings', () => {
    const p = executePrompt({
      planDocPath: '.claude/plans/delegating-test.md',
      task: 'add a fleet hook',
    })
    assert.ok(p.length > 0, 'executePrompt must return non-empty string')
    assert.ok(
      p.includes('follow the plan verbatim'),
      `expected "follow the plan verbatim" in: ${p}`,
    )
    assert.ok(p.includes('git worktree'), `expected "git worktree" in: ${p}`)
    assert.ok(p.includes('pnpm run fix'), `expected "pnpm run fix" in: ${p}`)
    assert.ok(p.includes('deviation'), `expected "deviation" in: ${p}`)
    assert.ok(
      p.includes('.claude/plans/delegating-test.md'),
      `expected planDocPath in: ${p}`,
    )
    assert.ok(p.includes('add a fleet hook'), `expected task in: ${p}`)
  })

  test('reviewPrompt returns non-empty string with key strings', () => {
    const p = reviewPrompt({
      planDocPath: '.claude/plans/delegating-test.md',
      sensitivity: 'benign',
      task: 'add a fleet hook',
    })
    assert.ok(p.length > 0, 'reviewPrompt must return non-empty string')
    assert.ok(p.includes('file:line'), `expected "file:line" in: ${p}`)
    assert.ok(p.includes('severity'), `expected "severity" in: ${p}`)
    assert.ok(
      p.includes('leads, not facts'),
      `expected "leads, not facts" in: ${p}`,
    )
    assert.ok(p.includes('append'), `expected "append" in: ${p}`)
    assert.ok(
      p.includes('.claude/plans/delegating-test.md'),
      `expected planDocPath in: ${p}`,
    )
    assert.ok(p.includes('add a fleet hook'), `expected task in: ${p}`)
  })

  test('followupPrompt returns non-empty string with key strings', () => {
    const findings = JSON.stringify([
      { file: 'src/foo.mts', fix: 'add export', line: '12', severity: 'high' },
    ])
    const p = followupPrompt({
      findings,
      planDocPath: '.claude/plans/delegating-test.md',
      task: 'add a fleet hook',
    })
    assert.ok(p.length > 0, 'followupPrompt must return non-empty string')
    assert.ok(p.includes('every finding'), `expected "every finding" in: ${p}`)
    assert.ok(p.includes('pick the fix'), `expected "pick the fix" in: ${p}`)
    assert.ok(
      p.includes('pnpm run check'),
      `expected "pnpm run check" in: ${p}`,
    )
    assert.ok(
      p.includes('.claude/plans/delegating-test.md'),
      `expected planDocPath in: ${p}`,
    )
    assert.ok(p.includes('add a fleet hook'), `expected task in: ${p}`)
    assert.ok(p.includes(findings), `expected findings in: ${p}`)
  })
})
