// vitest specs for check-hook-names-are-accurate. The check IMPORTS each hook
// and compares its declared `defineHook` `.type` against the directory-name
// suffix — it reads the typed export, never source text.

import { test } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  declaredType,
  typeMismatch,
} from '../../../scripts/fleet/check/hook-names-are-accurate.mts'

test('typeMismatch: a matching name + type is clean', () => {
  assert.equal(typeMismatch('foo-guard', 'guard'), undefined)
  assert.equal(typeMismatch('foo-nudge', 'nudge'), undefined)
})

test('typeMismatch: a -guard declaring type:nudge is flagged', () => {
  assert.deepEqual(typeMismatch('foo-guard', 'nudge'), {
    name: 'foo-guard',
    kind: 'type-mismatch',
    declaredType: 'nudge',
  })
})

test('typeMismatch: a -nudge declaring type:guard is flagged', () => {
  assert.deepEqual(typeMismatch('foo-nudge', 'guard'), {
    name: 'foo-nudge',
    kind: 'type-mismatch',
    declaredType: 'guard',
  })
})

test('typeMismatch: a -guard/-nudge with no hook export is flagged', () => {
  assert.deepEqual(typeMismatch('foo-guard', undefined), {
    name: 'foo-guard',
    kind: 'no-hook-export',
    declaredType: undefined,
  })
})

test('typeMismatch: a non-guard/nudge name has no opinion', () => {
  assert.equal(typeMismatch('setup-firewall', undefined), undefined)
  assert.equal(typeMismatch('sweep-ds-store', 'guard'), undefined)
})

test('declaredType: reads the typed .type off an imported module', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'hook-type-'))
  const guard = path.join(dir, 'guard.mjs')
  writeFileSync(
    guard,
    "export const hook = { type: 'guard', event: 'PreToolUse' }\n",
  )
  assert.equal(await declaredType(guard), 'guard')
})

test('declaredType: undefined when there is no hook export', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'hook-type-'))
  const plain = path.join(dir, 'plain.mjs')
  writeFileSync(plain, 'export const notAHook = 1\n')
  assert.equal(await declaredType(plain), undefined)
})

test('declaredType: undefined when the module does not exist', async () => {
  assert.equal(await declaredType('/no/such/hook-index.mjs'), undefined)
})
