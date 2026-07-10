// vitest spec for check-hook-main-is-entrypoint-guarded. The pure exported
// functions (unguardedInvocation, aTestImportsModule, scanHookMains) are
// exercised with temp fixtures; no real git/gh/network calls are made.
// Importing the check is side-effect-free (main() is entrypoint-guarded).

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, test } from 'vitest'

import {
  aTestImportsModule,
  scanHookMains,
  unguardedInvocation,
} from '../../../scripts/fleet/check/hook-main-is-entrypoint-guarded.mts'
import { HOOK_TEST_DIRS } from '../../../scripts/fleet/paths.mts'

// ---------------------------------------------------------------------------
// unguardedInvocation — pure function, no I/O
// ---------------------------------------------------------------------------

describe('unguardedInvocation', () => {
  test('returns undefined for a properly guarded main()', () => {
    const guarded = [
      'if (process.argv[1] === fileURLToPath(import.meta.url)) {',
      '  void main()',
      '}',
    ].join('\n')
    assert.equal(unguardedInvocation(guarded), undefined)
  })

  test('returns undefined when no main() invocation exists at all', () => {
    assert.equal(unguardedInvocation('export function main() {}'), undefined)
    assert.equal(unguardedInvocation(''), undefined)
  })

  test('detects bare main() at column 0', () => {
    const text = 'export function main() {}\nmain()'
    assert.equal(unguardedInvocation(text), 'main()')
  })

  test('detects void main() at column 0', () => {
    const text = 'export function main() {}\nvoid main()'
    assert.equal(unguardedInvocation(text), 'void main()')
  })

  test('detects await main( at column 0', () => {
    // The regex anchors on `await\s+main\(` — the match is the open-paren form.
    const text = 'export async function main() {}\nawait main()'
    assert.equal(unguardedInvocation(text), 'await main(')
  })

  test('detects main().catch( at column 0', () => {
    const text = 'export function main() {}\nmain().catch(console.error)'
    assert.equal(unguardedInvocation(text), 'main().catch(')
  })

  test('does NOT flag void main() that is indented (guarded)', () => {
    const indented = 'if (guard) {\n  void main()\n}'
    assert.equal(unguardedInvocation(indented), undefined)
  })

  test('detects await withEditGuard( at column 0', () => {
    const text = 'await withEditGuard(main)'
    assert.equal(unguardedInvocation(text), 'await withEditGuard(')
  })

  test('detects await withBashGuard( at column 0', () => {
    const text = 'await withBashGuard(main)'
    assert.equal(unguardedInvocation(text), 'await withBashGuard(')
  })

  test('does NOT flag indented await withEditGuard(', () => {
    const text = 'if (guard) {\n  await withEditGuard(main)\n}'
    assert.equal(unguardedInvocation(text), undefined)
  })
})

// ---------------------------------------------------------------------------
// aTestImportsModule — reads from HOOK_TEST_DIRS; write temp files + cleanup
// ---------------------------------------------------------------------------

describe('aTestImportsModule', () => {
  // We pick the first real HOOK_TEST_DIRS entry for temp test files.
  const hookTestDir = HOOK_TEST_DIRS[0]!

  function withTempTestFile(
    name: string,
    content: string,
    fn: () => void,
  ): void {
    const filePath = path.join(hookTestDir, `${name}.test.mts`)
    try {
      // Members don't ship the relocated hook-test tree (wheelhouse-only);
      // create it so the fixture write works everywhere.
      mkdirSync(hookTestDir, { recursive: true })
      writeFileSync(filePath, content)
      fn()
    } finally {
      try {
        rmSync(filePath)
      } catch {
        // best-effort cleanup
      }
    }
  }

  test('returns false when no test file exists for the hook', () => {
    assert.equal(aTestImportsModule('__nonexistent_hook_xyz__'), false)
  })

  test('detects a single-string import ending in /<name>/index.mts', () => {
    withTempTestFile(
      '__test-hook-single-import__',
      "import foo from '../../../.claude/hooks/fleet/__test-hook-single-import__/index.mts'",
      () => {
        assert.equal(aTestImportsModule('__test-hook-single-import__'), true)
      },
    )
  })

  test('detects a single-string import ending in /<name>/index (no .mts)', () => {
    withTempTestFile(
      '__test-hook-no-ext__',
      "import foo from '../../../.claude/hooks/fleet/__test-hook-no-ext__/index'",
      () => {
        assert.equal(aTestImportsModule('__test-hook-no-ext__'), true)
      },
    )
  })

  test('detects split-form await import( with separate index.mts segment', () => {
    withTempTestFile(
      '__test-hook-split__',
      [
        'const mod = await import(',
        "  path.join(hooksDir, '__test-hook-split__', 'index.mts')",
        ')',
      ].join('\n'),
      () => {
        assert.equal(aTestImportsModule('__test-hook-split__'), true)
      },
    )
  })

  test('returns false for a hook name that is not in any test file', () => {
    assert.equal(aTestImportsModule('__another-nonexistent__'), false)
  })

  test('returns false when the test file has no hook import (spawn-only style)', () => {
    // A test that only references the hook by name in a comment, with no import.
    withTempTestFile(
      '__test-hook-no-import__',
      [
        '// This test spawns the hook as a subprocess.',
        '// Hook: __test-hook-no-import__',
        "import { describe, test } from 'vitest'",
      ].join('\n'),
      () => {
        assert.equal(aTestImportsModule('__test-hook-no-import__'), false)
      },
    )
  })
})

// ---------------------------------------------------------------------------
// scanHookMains — exercises the full scan with a temp repo root
// ---------------------------------------------------------------------------

describe('scanHookMains', () => {
  test('returns scanned=0 and no hits when the repo has no .claude/hooks dirs', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'hook-guard-check-'))
    try {
      const result = scanHookMains(root, { ownsRelocatedTests: true })
      assert.equal(result.scanned, 0)
      assert.equal(result.hits.length, 0)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test('skips _shared/ directories (NON_HOOK_DIRS exemption)', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'hook-guard-check-'))
    try {
      const sharedDir = path.join(root, '.claude', 'hooks', 'fleet', '_shared')
      mkdirSync(sharedDir, { recursive: true })
      writeFileSync(
        path.join(sharedDir, 'index.mts'),
        'export function helper() {}\nmain()\n',
      )
      const result = scanHookMains(root, { ownsRelocatedTests: true })
      assert.equal(result.scanned, 0)
      assert.equal(result.hits.length, 0)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test('skips a hook with no index.mts (install-only hook)', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'hook-guard-check-'))
    try {
      const hookDir = path.join(root, '.claude', 'hooks', 'fleet', 'some-nudge')
      mkdirSync(hookDir, { recursive: true })
      // No index.mts — hook directory exists but has no source file.
      const result = scanHookMains(root, { ownsRelocatedTests: true })
      assert.equal(result.scanned, 0)
      assert.equal(result.hits.length, 0)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test('skips a hook whose test does not import the module', () => {
    // An unguarded main() with no importing test in HOOK_TEST_DIRS → not flagged.
    const root = mkdtempSync(path.join(os.tmpdir(), 'hook-guard-check-'))
    try {
      const hookName = '__fleet-check-no-test-hook__'
      const hookDir = path.join(root, '.claude', 'hooks', 'fleet', hookName)
      mkdirSync(hookDir, { recursive: true })
      writeFileSync(
        path.join(hookDir, 'index.mts'),
        ['export function main() {}', 'main()'].join('\n'),
      )
      // No test file in HOOK_TEST_DIRS → aTestImportsModule returns false → exempt.
      const result = scanHookMains(root, { ownsRelocatedTests: true })
      assert.equal(result.scanned, 0)
      assert.equal(result.hits.length, 0)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test('flags an unguarded main() when an importing test exists', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'hook-guard-check-'))
    const hookName = '__fleet-check-unguarded-test-hook__'
    const hookTestDir = HOOK_TEST_DIRS[0]!
    const testFilePath = path.join(hookTestDir, `${hookName}.test.mts`)
    try {
      mkdirSync(hookTestDir, { recursive: true })
      const hookDir = path.join(root, '.claude', 'hooks', 'fleet', hookName)
      mkdirSync(hookDir, { recursive: true })
      writeFileSync(
        path.join(hookDir, 'index.mts'),
        ['export function main() { /* does something */ }', 'void main()'].join(
          '\n',
        ),
      )
      writeFileSync(
        testFilePath,
        `import { main } from '.claude/hooks/fleet/${hookName}/index.mts'`,
      )
      const result = scanHookMains(root, { ownsRelocatedTests: true })
      assert.equal(result.scanned, 1)
      assert.equal(result.hits.length, 1)
      assert.match(result.hits[0]!.file, new RegExp(hookName))
      assert.equal(result.hits[0]!.invocation, 'void main()')
    } finally {
      rmSync(root, { recursive: true, force: true })
      try {
        rmSync(testFilePath)
      } catch {
        /* best-effort */
      }
    }
  })

  test('reports scanned=1 and no hits when the hook is properly guarded', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'hook-guard-check-'))
    const hookName = '__fleet-check-guarded-test-hook__'
    const hookTestDir = HOOK_TEST_DIRS[0]!
    const testFilePath = path.join(hookTestDir, `${hookName}.test.mts`)
    try {
      mkdirSync(hookTestDir, { recursive: true })
      const hookDir = path.join(root, '.claude', 'hooks', 'fleet', hookName)
      mkdirSync(hookDir, { recursive: true })
      writeFileSync(
        path.join(hookDir, 'index.mts'),
        [
          'import { fileURLToPath } from "node:url"',
          'export function main() { /* does something */ }',
          'if (process.argv[1] === fileURLToPath(import.meta.url)) {',
          '  void main()',
          '}',
        ].join('\n'),
      )
      writeFileSync(
        testFilePath,
        `import { main } from '.claude/hooks/fleet/${hookName}/index.mts'`,
      )
      const result = scanHookMains(root, { ownsRelocatedTests: true })
      assert.equal(result.scanned, 1)
      assert.equal(result.hits.length, 0)
    } finally {
      rmSync(root, { recursive: true, force: true })
      try {
        rmSync(testFilePath)
      } catch {
        /* best-effort */
      }
    }
  })
})
