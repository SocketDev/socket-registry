// vitest specs for check-error-messages-are-thorough.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  isExempt,
  scanFile,
} from '../../../scripts/fleet/check/error-messages-are-thorough.mts'

// ── scanFile: AST + shared classifier ───────────────────────────

test('flags a bare vague throw', () => {
  const hits = scanFile('src/x.mts', 'throw new Error("invalid")')
  assert.equal(hits.length, 1)
  assert.equal(hits[0]!.errorClass, 'Error')
  assert.equal(hits[0]!.message, 'invalid')
})

test('flags a vague throw on a custom *Error class', () => {
  const hits = scanFile('src/x.mts', 'throw new ValidationError("failed")')
  assert.equal(hits.length, 1)
  assert.equal(hits[0]!.errorClass, 'ValidationError')
})

test('reports the line number of the throw', () => {
  const src = ['const a = 1', '', 'throw new Error("not found")'].join('\n')
  const hits = scanFile('src/x.mts', src)
  assert.equal(hits.length, 1)
  assert.equal(hits[0]!.line, 3)
})

// ── scanFile: thorough messages pass ────────────────────────────

test('does NOT flag a message with a field-path colon', () => {
  assert.equal(
    scanFile('src/x.mts', 'throw new Error("config not found: " + p)').length,
    0,
  )
})

test('does NOT flag a long specific message', () => {
  assert.equal(
    scanFile(
      'src/x.mts',
      'throw new RangeError("--port must be an integer between 1 and 65535")',
    ).length,
    0,
  )
})

test('does NOT flag an interpolated template literal (out of scope)', () => {
  assert.equal(
    scanFile('src/x.mts', 'throw new Error(`bad value: ${v}`)').length,
    0,
  )
})

test('does NOT flag a non-Error throw', () => {
  assert.equal(scanFile('src/x.mts', 'throw new Logger("invalid")').length, 0)
})

// ── isExempt ────────────────────────────────────────────────────

test('exempts the shared classifier + the reminder that names the phrases', () => {
  assert.equal(
    isExempt('.claude/hooks/fleet/_shared/error-message-quality.mts'),
    true,
  )
  assert.equal(
    isExempt('.claude/hooks/fleet/error-message-quality-nudge/index.mts'),
    true,
  )
})

test('exempts test files (fixtures of bad messages)', () => {
  assert.equal(isExempt('scripts/repo/foo.test.mts'), true)
})

test('does NOT exempt ordinary source', () => {
  assert.equal(isExempt('scripts/repo/bar.mts'), false)
  assert.equal(isExempt('src/index.ts'), false)
})
