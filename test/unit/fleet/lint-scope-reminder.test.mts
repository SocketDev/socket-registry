/**
 * @file Unit test for the loud-scope contract on fix runs. A `--fix` outside
 *   `--all` only touches git-modified files — a repo-wide wave run that way is
 *   a silent no-op on the backlog, so every scoped fix run must end with a
 *   reminder naming the wave form.
 */
import assert from 'node:assert/strict'

import { test } from 'vitest'

import { fixScopeReminder } from '../../../scripts/fleet/lint.mts'

test('names the scope it actually fixed', () => {
  assert.match(fixScopeReminder('modified'), /MODIFIED files only/)
  assert.match(fixScopeReminder('staged'), /STAGED files only/)
})

test('names the wave form including the dogfood env', () => {
  const msg = fixScopeReminder('modified')
  assert.match(msg, /pnpm run lint --fix --all/)
  assert.match(msg, /LINT_DOGFOOD=1/)
})

test('states the consequence: the backlog is untouched', () => {
  assert.match(fixScopeReminder('modified'), /backlog is untouched/)
})
