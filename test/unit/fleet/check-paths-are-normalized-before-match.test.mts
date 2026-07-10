// vitest specs for check-paths-are-normalized-before-match.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import { scan } from '../../../scripts/fleet/check/paths-are-normalized-before-match.mts'

// ── scan: separator-sensitive operations without normalization ───

test('flags a path split on "/" without prior normalizePath call', () => {
  const src = `const parts = filePath.split('/')`
  const findings = scan('src/foo.mts', src)
  assert.equal(findings.length, 1)
  assert.equal(findings[0]!.varName, 'filePath')
  assert.equal(findings[0]!.line, 1)
})

test('flags a startsWith("/") on a path variable without normalization', () => {
  const src = `if (relPath.startsWith('/usr')) { return true }`
  const findings = scan('src/foo.mts', src)
  assert.equal(findings.length, 1)
  assert.equal(findings[0]!.varName, 'relPath')
})

test('flags a regex .test() with a dual-separator pattern on a path-like variable', () => {
  // SEPARATOR_OP_RE matches regex ops with [/\\] (dual-separator) patterns.
  // The JS string `'if (srcDir.test(/[/\\\\]node_modules/)) {}'` represents
  // the TypeScript source: `if (srcDir.test(/[/\\]node_modules/)) {}`
  const src = 'if (srcDir.test(/[/\\\\]node_modules/)) {}'
  const findings = scan('src/foo.mts', src)
  assert.equal(findings.length, 1)
  assert.equal(findings[0]!.varName, 'srcDir')
})

// ── scan: normalized cases should NOT fire ───────────────────────

test('does NOT flag when normalizePath is called on the same var in the window', () => {
  const src = [
    `const filePath = normalizePath(rawPath)`,
    `const parts = filePath.split('/')`,
  ].join('\n')
  assert.equal(scan('src/foo.mts', src).length, 0)
})

test('does NOT flag when toUnixPath is called on the same var in the window', () => {
  const src = [
    `const srcDir = toUnixPath(inputDir)`,
    `if (srcDir.startsWith('/tmp')) return`,
  ].join('\n')
  assert.equal(scan('src/foo.mts', src).length, 0)
})

test('does NOT flag non-path-like variable names', () => {
  // "count" does not match PATH_VAR_IDENT_RE
  const src = `const pieces = count.split('/')`
  assert.equal(scan('src/foo.mts', src).length, 0)
})

test('does NOT flag an empty file', () => {
  assert.equal(scan('src/foo.mts', '').length, 0)
})

// ── scan: window boundary ────────────────────────────────────────

// The window tests use the non-assignment form (`normalizePath(filePath)`
// as an argument, not `filePath = normalizePath(…)`) so the proximity
// window is what proves the variable — an assignment would be proven by
// whole-file assignment provenance regardless of distance.
test('does NOT flag when normalizePath call is within 20-line window', () => {
  const lines: string[] = [`watcher.add(normalizePath(filePath))`]
  for (let i = 0; i < 19; i += 1) {
    lines.push(`// line ${i + 2}`)
  }
  lines.push(`const parts = filePath.split('/')`)
  assert.equal(scan('src/foo.mts', lines.join('\n')).length, 0)
})

test('flags when normalizePath call is outside the 20-line window', () => {
  const lines: string[] = [`watcher.add(normalizePath(filePath))`]
  for (let i = 0; i < 21; i += 1) {
    lines.push(`// line ${i + 2}`)
  }
  lines.push(`const parts = filePath.split('/')`)
  const findings = scan('src/foo.mts', lines.join('\n'))
  assert.equal(findings.length, 1)
  assert.equal(findings[0]!.varName, 'filePath')
})

test('does NOT flag when the var is ASSIGNED from normalizePath outside the window (assignment provenance)', () => {
  const lines: string[] = [`const filePath = normalizePath(raw)`]
  for (let i = 0; i < 21; i += 1) {
    lines.push(`// line ${i + 2}`)
  }
  lines.push(`const parts = filePath.split('/')`)
  assert.equal(scan('src/foo.mts', lines.join('\n')).length, 0)
})

// ── scan: comment lines and the inline normalize idiom ───────────

test('does NOT flag commented-out code or doc examples', () => {
  const src = [
    `// const parts = filePath.split('/')`,
    ` * like \`if (srcDir.test(/[/\\\\]node_modules/)) {}\``,
    `/* const abs = dirPath.startsWith('/') */`,
  ].join('\n')
  assert.equal(scan('src/foo.mts', src).length, 0)
})

test('does NOT flag the hand-rolled backslash-to-slash normalize idiom', () => {
  const src = `const normalized = filePath.replace(/\\\\/g, '/')`
  assert.equal(scan('src/foo.mts', src).length, 0)
})

test('does NOT flag the dual-separator replace normalize idiom', () => {
  const src = `const normalized = relPath.replace(/[/\\\\]/g, '/')`
  assert.equal(scan('src/foo.mts', src).length, 0)
})
