// vitest specs for trimming-bundle/measure-bundle — the measurement-only pure
// parts (specifier survey at full-subpath granularity, precondition checks).
// The candidate discovery + confidence grading are deliberately NOT here (they
// stay model judgment).

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  checkPreconditions,
  extractSpecifiers,
  measureBundle,
} from '../../../scripts/fleet/trimming-bundle/measure-bundle.mts'

describe('extractSpecifiers', () => {
  test('captures import / require / dynamic-import specifiers at full subpath', () => {
    const s = extractSpecifiers(
      `import {x} from '@socketsecurity/lib/globs'\n` +
        `const y = require('@socketsecurity/lib/sorts')\n` +
        `import('./dyn.mjs')\n` +
        `export * from 'node:fs'`,
    )
    assert.ok(s.includes('@socketsecurity/lib/globs'))
    assert.ok(s.includes('@socketsecurity/lib/sorts'))
    assert.ok(s.includes('./dyn.mjs'))
    assert.ok(s.includes('node:fs'))
  })
  test('keeps the subpath, never collapses to the package name', () => {
    const s = extractSpecifiers(`import 'a/b/c'`)
    assert.deepEqual(s, ['a/b/c'])
  })
})

describe('checkPreconditions', () => {
  test('detects dist, the stub import, and the lib-stub file', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'mb-'))
    mkdirSync(path.join(dir, 'dist'), { recursive: true })
    mkdirSync(path.join(dir, '.config', 'repo', 'rolldown'), {
      recursive: true,
    })
    writeFileSync(
      path.join(dir, '.config', 'repo', 'rolldown.config.mts'),
      "import { createLibStubPlugin } from './rolldown/lib-stub.mts'",
    )
    writeFileSync(
      path.join(dir, '.config', 'repo', 'rolldown', 'lib-stub.mts'),
      'export function createLibStubPlugin() {}',
    )
    assert.deepEqual(checkPreconditions(dir), {
      distExists: true,
      libStubPresent: true,
      rolldownConfigImportsStub: true,
    })
  })
  test('all false in a bare dir', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'mb-bare-'))
    assert.deepEqual(checkPreconditions(dir), {
      distExists: false,
      libStubPresent: false,
      rolldownConfigImportsStub: false,
    })
  })
})

describe('measureBundle', () => {
  test('sums dist file sizes + surveys their specifiers, heaviest-first', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'mb-dist-'))
    mkdirSync(path.join(dir, 'dist'), { recursive: true })
    writeFileSync(
      path.join(dir, 'dist', 'index.js'),
      `import 'a/sub'\n${'x'.repeat(100)}`,
    )
    writeFileSync(path.join(dir, 'dist', 'small.js'), `require('b/sub')`)
    const m = await measureBundle(dir)
    assert.ok(m.bundleSizeBytes > 100)
    assert.equal(m.perFileSizes.length, 2)
    // heaviest-first
    assert.ok(m.perFileSizes[0]!.bytes >= m.perFileSizes[1]!.bytes)
    assert.ok(m.rawDistImportSurvey.includes('a/sub'))
    assert.ok(m.rawDistImportSurvey.includes('b/sub'))
  })
})
