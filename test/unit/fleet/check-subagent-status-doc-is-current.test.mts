// vitest specs for check-subagent-status-doc-is-current.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  diffStatusSets,
  parseDocumentedStatuses,
} from '../../../scripts/fleet/check/subagent-status-doc-is-current.mts'

const SECTION = '## Subagent return contract'

function docWith(statuses: readonly string[]): string {
  const rows = statuses
    .map(s => `| \`${s}\` | meaning | \`advance\` |`)
    .join('\n')
  return `# Agent delegation

## Routing heuristics

- something

${SECTION}

| Status | Meaning | Orchestrator does |
| ------ | ------- | ----------------- |
${rows}

## When the surfaces overlap
`
}

// ── parseDocumentedStatuses ─────────────────────────────────────

test('extracts the documented status code-spans, excluding escalation verbs', () => {
  const doc = docWith([
    'done',
    'done-with-concerns',
    'needs-context',
    'blocked',
  ])
  const set = parseDocumentedStatuses(doc)
  assert.ok(set)
  assert.deepEqual([...set!].toSorted(), [
    'blocked',
    'done',
    'done-with-concerns',
    'needs-context',
  ])
  // The `advance` escalation verb in the right column is NOT a status.
  assert.equal(set!.has('advance'), false)
})

test('returns undefined when the section is absent (fail open)', () => {
  assert.equal(
    parseDocumentedStatuses('# Agent delegation\n\nno section here'),
    undefined,
  )
})

// ── diffStatusSets ──────────────────────────────────────────────

test('reports no diff when the documented set equals the canonical set', () => {
  const set = parseDocumentedStatuses(
    docWith(['done', 'done-with-concerns', 'needs-context', 'blocked']),
  )!
  const { extra, missing } = diffStatusSets(set)
  assert.deepEqual(missing, [])
  assert.deepEqual(extra, [])
})

test('reports a status missing from the doc', () => {
  const set = parseDocumentedStatuses(
    docWith(['done', 'blocked', 'needs-context']),
  )!
  const { extra, missing } = diffStatusSets(set)
  assert.deepEqual(missing, ['done-with-concerns'])
  assert.deepEqual(extra, [])
})

test('reports a status documented but not in the canonical union', () => {
  const set = parseDocumentedStatuses(
    docWith([
      'done',
      'done-with-concerns',
      'needs-context',
      'blocked',
      'partial',
    ]),
  )!
  const { extra, missing } = diffStatusSets(set)
  assert.deepEqual(missing, [])
  assert.deepEqual(extra, ['partial'])
})
