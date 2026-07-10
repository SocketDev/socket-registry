// vitest specs for check-dispatch-matchers-cover-hook-tools.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import type { EligibleHook } from '../../../scripts/fleet/make-hook-dispatch.mts'
import {
  diagnoseDispatcherCoverage,
  extractDispatcherEntries,
  matcherCoversAll,
} from '../../../scripts/fleet/check/dispatch-matchers-cover-hook-tools.mts'

function hook(
  event: string,
  tools: readonly string[] | undefined,
  name = `${event}-${(tools ?? []).join('-') || 'all'}`,
): EligibleHook {
  return { __proto__: null, event, name, tools: tools ?? [] } as EligibleHook
}

function dispatcherEntry(event: string, matcher: string | undefined) {
  return {
    matcher,
    hooks: [
      {
        type: 'command',
        command: `node "$CLAUDE_PROJECT_DIR"/.claude/hooks/fleet/_dispatch/index.cjs ${event}`,
      },
    ],
  }
}

test('matcherCoversAll: absent / empty / .* fire on every tool', () => {
  assert.equal(matcherCoversAll(undefined), true)
  assert.equal(matcherCoversAll(''), true)
  assert.equal(matcherCoversAll('  '), true)
  assert.equal(matcherCoversAll('.*'), true)
  assert.equal(matcherCoversAll('Bash|Edit'), false)
})

test('extractDispatcherEntries: picks the dispatcher entry, ignores standalone hooks', () => {
  const settings = {
    hooks: {
      PreToolUse: [
        dispatcherEntry('PreToolUse', 'Bash|Edit'),
        {
          matcher: 'Skill',
          hooks: [
            {
              type: 'command',
              command:
                'node "$CLAUDE_PROJECT_DIR"/.claude/hooks/fleet/skill-usage-logger/index.mts',
            },
          ],
        },
      ],
    },
  }
  const out = extractDispatcherEntries(settings)
  assert.deepEqual(
    {
      matcher: out['PreToolUse']?.matcher,
      present: out['PreToolUse']?.present,
    },
    { matcher: 'Bash|Edit', present: true },
  )
  // A standalone-only event has no dispatcher entry.
  assert.equal(out['PostToolUse'], undefined)
})

test('diagnoseDispatcherCoverage: fully-covered matcher yields no findings', () => {
  const hooks = [
    hook('PreToolUse', ['Bash', 'Edit']),
    hook('PreToolUse', ['Write']),
  ]
  const dispatchers = extractDispatcherEntries({
    hooks: { PreToolUse: [dispatcherEntry('PreToolUse', 'Bash|Edit|Write')] },
  })
  assert.deepEqual(diagnoseDispatcherCoverage(hooks, dispatchers), [])
})

test('diagnoseDispatcherCoverage: a tool omitted from the matcher is flagged (the dep-derived-on-MultiEdit bug)', () => {
  const hooks = [hook('PostToolUse', ['Edit', 'MultiEdit', 'Write'])]
  const dispatchers = extractDispatcherEntries({
    hooks: { PostToolUse: [dispatcherEntry('PostToolUse', 'Bash|Edit|Write')] },
  })
  const findings = diagnoseDispatcherCoverage(hooks, dispatchers)
  assert.equal(findings.length, 1)
  assert.equal(findings[0]!.kind, 'missing-tools')
  assert.deepEqual(findings[0]!.missing, ['MultiEdit'])
})

test('diagnoseDispatcherCoverage: extra matcher tokens (mcp__.*) are tolerated — subset, not equality', () => {
  const hooks = [hook('PostToolUse', ['Bash', 'Edit'])]
  const dispatchers = extractDispatcherEntries({
    hooks: {
      PostToolUse: [dispatcherEntry('PostToolUse', 'Bash|Edit|mcp__.*')],
    },
  })
  assert.deepEqual(diagnoseDispatcherCoverage(hooks, dispatchers), [])
})

test('diagnoseDispatcherCoverage: a match-all hook needs a catch-all matcher', () => {
  const hooks = [hook('Stop', undefined)]
  const restrictive = extractDispatcherEntries({
    hooks: { Stop: [dispatcherEntry('Stop', 'Bash')] },
  })
  const findings = diagnoseDispatcherCoverage(hooks, restrictive)
  assert.equal(findings.length, 1)
  assert.equal(findings[0]!.kind, 'match-all-needs-catch-all')

  const catchAll = extractDispatcherEntries({
    hooks: { Stop: [dispatcherEntry('Stop', '')] },
  })
  assert.deepEqual(diagnoseDispatcherCoverage(hooks, catchAll), [])
})

test('diagnoseDispatcherCoverage: bundled hooks with no dispatcher entry are flagged not-wired', () => {
  const hooks = [hook('PreToolUse', ['Bash'])]
  const findings = diagnoseDispatcherCoverage(hooks, {})
  assert.equal(findings.length, 1)
  assert.equal(findings[0]!.kind, 'not-wired')
  assert.deepEqual(findings[0]!.missing, ['Bash'])
})
