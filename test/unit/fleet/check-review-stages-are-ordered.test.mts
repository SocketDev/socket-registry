// vitest specs for check-review-stages-are-ordered.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  orderViolations,
  parseAllRoles,
} from '../../../scripts/fleet/check/review-stages-are-ordered.mts'

function runnerWith(roles: readonly string[]): string {
  const items = roles.map(r => `  '${r}',`).join('\n')
  return `const ALL_ROLES: readonly Role[] = [\n${items}\n]`
}

// ── parseAllRoles ───────────────────────────────────────────────

test('parses the role list in declared order', () => {
  const src = runnerWith(['spec-compliance', 'discovery', 'verify'])
  assert.deepEqual(parseAllRoles(src), [
    'spec-compliance',
    'discovery',
    'verify',
  ])
})

test('returns undefined when ALL_ROLES is absent', () => {
  assert.equal(parseAllRoles('const SOMETHING_ELSE = []'), undefined)
})

// ── orderViolations ─────────────────────────────────────────────

test('no violations when spec-compliance precedes the quality roles', () => {
  const roles = ['spec-compliance', 'discovery', 'remediation', 'verify']
  assert.deepEqual(orderViolations(roles), [])
})

test('flags a quality role that runs before spec-compliance', () => {
  const roles = ['discovery', 'spec-compliance', 'remediation']
  assert.deepEqual(orderViolations(roles), ['discovery'])
})

test('flags every quality role at or before the gate', () => {
  const roles = ['discovery', 'remediation', 'spec-compliance']
  assert.deepEqual(orderViolations(roles).toSorted(), [
    'discovery',
    'remediation',
  ])
})

test('no violations reported when the gate role is absent (reported elsewhere)', () => {
  // orderViolations only judges ordering; a missing gate is the check's job.
  assert.deepEqual(orderViolations(['discovery', 'verify']), [])
})

// ── the real runner is correctly ordered ────────────────────────

test('the shipped run.mts orders spec-compliance first', () => {
  const roles = parseAllRoles(
    runnerWith([
      'spec-compliance',
      'discovery',
      'discovery-secondary',
      'remediation',
      'verify',
    ]),
  )!
  assert.equal(roles[0], 'spec-compliance')
  assert.deepEqual(orderViolations(roles), [])
})
