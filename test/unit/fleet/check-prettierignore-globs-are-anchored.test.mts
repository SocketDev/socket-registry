// vitest spec for check-prettierignore-globs-are-anchored. The pure exported
// function findUnanchoredGlobs is exercised directly with inline fixture strings
// — no real repo, no git/network calls needed. Importing the check is
// side-effect-free (main() is entrypoint-guarded).

import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import { findUnanchoredGlobs } from '../../../scripts/fleet/check/prettierignore-globs-are-anchored.mts'

describe('findUnanchoredGlobs', () => {
  test('returns empty for a fully-anchored **/-prefixed pattern', () => {
    const content = '**/bootstrap/fleet.mts\n**/node_modules\n'
    assert.deepEqual(findUnanchoredGlobs(content), [])
  })

  test('returns empty for slashless basename patterns', () => {
    // no slash at all → matches at any depth → not a silent no-op
    const content = 'node_modules\n*.log\n'
    assert.deepEqual(findUnanchoredGlobs(content), [])
  })

  test('returns empty for trailing-slash-only dir names (no interior slash)', () => {
    // "dist/" has no interior slash after dropping the trailing '/' → safe
    const content = 'dist/\ncoverage/\n'
    assert.deepEqual(findUnanchoredGlobs(content), [])
  })

  test('flags a bare path with an interior slash', () => {
    const content = 'bootstrap/fleet.mts\n'
    const findings = findUnanchoredGlobs(content)
    assert.equal(findings.length, 1)
    assert.equal(findings[0]!.line, 1)
    assert.equal(findings[0]!.pattern, 'bootstrap/fleet.mts')
    assert.equal(findings[0]!.negation, false)
  })

  test('flags a negation pattern with an interior slash', () => {
    const content = '!src/generated/\n'
    const findings = findUnanchoredGlobs(content)
    assert.equal(findings.length, 1)
    assert.equal(findings[0]!.negation, true)
    assert.equal(findings[0]!.pattern, '!src/generated/')
  })

  test('skips blank lines', () => {
    const content = '\n\n'
    assert.deepEqual(findUnanchoredGlobs(content), [])
  })

  test('skips comment lines', () => {
    const content = '# bootstrap/fleet.mts is handled separately\n'
    assert.deepEqual(findUnanchoredGlobs(content), [])
  })

  test('skips lines with the anchor-ok opt-out marker', () => {
    const content = 'bootstrap/fleet.mts # anchor-ok\n'
    assert.deepEqual(findUnanchoredGlobs(content), [])
  })

  test('reports the correct 1-based line number for a later violation', () => {
    const content = ['# comment', '**/ok', 'a/b/c'].join('\n')
    const findings = findUnanchoredGlobs(content)
    assert.equal(findings.length, 1)
    assert.equal(findings[0]!.line, 3)
  })

  test('reports multiple violations across the file', () => {
    const content = ['src/index.ts', '**/safe', 'dist/output.js'].join('\n')
    const findings = findUnanchoredGlobs(content)
    assert.equal(findings.length, 2)
    assert.equal(findings[0]!.pattern, 'src/index.ts')
    assert.equal(findings[1]!.pattern, 'dist/output.js')
  })

  test('a leading-slash pattern is flagged (it anchors to the ignore-file dir)', () => {
    // "/bootstrap/fleet.mts" contains a '/' at position 0 which survives the
    // trailing-slash strip → it is root-anchored → flagged.
    const content = '/bootstrap/fleet.mts\n'
    const findings = findUnanchoredGlobs(content)
    assert.equal(findings.length, 1)
  })

  test('anchor-ok marker (# anchor-ok) suppresses the finding', () => {
    // The opt-out regex is /#\s*anchor-ok\b/ — the '#' must immediately precede
    // 'anchor-ok' with only optional whitespace between them.
    const content = 'a/b  # anchor-ok\n'
    assert.deepEqual(findUnanchoredGlobs(content), [])
  })

  test('anchor-ok buried after other comment text does NOT suppress the finding', () => {
    // "#\s*anchor-ok" requires the '#' to be directly before 'anchor-ok'; a
    // plain prose comment like "# see anchor-ok below" won't match.
    const content = 'a/b  # see anchor-ok below\n'
    const findings = findUnanchoredGlobs(content)
    assert.equal(findings.length, 1)
  })
})
