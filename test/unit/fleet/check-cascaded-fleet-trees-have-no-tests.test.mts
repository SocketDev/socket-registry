// vitest specs for cascaded-fleet-trees-have-no-tests. The exported pure
// function findCascadedTreeTests is exercised against temp fixture dirs — no
// real repo or network needed. Importing the module has a side effect (main()
// is not entrypoint-guarded) but the real repo contains no offending files so
// main() exits cleanly (logs OK, sets no exitCode).

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, test } from 'vitest'

import { findCascadedTreeTests } from '../../../scripts/fleet/check/cascaded-fleet-trees-have-no-tests.mts'

function tmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'cascaded-tree-tests-'))
}

describe('findCascadedTreeTests', () => {
  test('returns empty array for a repo with no test files in cascaded trees', () => {
    const root = tmpDir()
    mkdirSync(path.join(root, '.claude/hooks/fleet/my-guard'), {
      recursive: true,
    })
    writeFileSync(path.join(root, '.claude/hooks/fleet/my-guard/index.mts'), '')
    assert.deepEqual(findCascadedTreeTests(root), [])
  })

  test('detects a *.test.mts file under .claude/hooks/fleet', () => {
    const root = tmpDir()
    mkdirSync(path.join(root, '.claude/hooks/fleet/my-guard'), {
      recursive: true,
    })
    writeFileSync(
      path.join(root, '.claude/hooks/fleet/my-guard/my-guard.test.mts'),
      '',
    )
    const found = findCascadedTreeTests(root)
    assert.equal(found.length, 1)
    assert.match(
      found[0]!,
      /\.claude\/hooks\/fleet\/my-guard\/my-guard\.test\.mts/,
    )
  })

  test('detects a *.test.ts file under .config/fleet/oxlint-plugin', () => {
    const root = tmpDir()
    mkdirSync(path.join(root, '.config/fleet/oxlint-plugin/fleet/some-rule'), {
      recursive: true,
    })
    writeFileSync(
      path.join(
        root,
        '.config/fleet/oxlint-plugin/fleet/some-rule/some-rule.test.ts',
      ),
      '',
    )
    const found = findCascadedTreeTests(root)
    assert.equal(found.length, 1)
    assert.match(found[0]!, /some-rule\.test\.ts/)
  })

  test('detects a *.test.js file under .git-hooks', () => {
    const root = tmpDir()
    mkdirSync(path.join(root, '.git-hooks'), { recursive: true })
    writeFileSync(path.join(root, '.git-hooks/pre-commit.test.js'), '')
    const found = findCascadedTreeTests(root)
    assert.equal(found.length, 1)
    assert.match(found[0]!, /\.git-hooks\/pre-commit\.test\.js/)
  })

  test('detects test files in the template/base seed trees', () => {
    const root = tmpDir()
    mkdirSync(path.join(root, 'template/base/.claude/hooks/fleet/some-guard'), {
      recursive: true,
    })
    writeFileSync(
      path.join(
        root,
        'template/base/.claude/hooks/fleet/some-guard/some-guard.test.mts',
      ),
      '',
    )
    const found = findCascadedTreeTests(root)
    assert.equal(found.length, 1)
    assert.match(found[0]!, /some-guard\.test\.mts/)
  })

  test('returns paths relative to repoRoot with forward slashes, sorted', () => {
    const root = tmpDir()
    mkdirSync(path.join(root, '.git-hooks'), { recursive: true })
    mkdirSync(path.join(root, '.claude/hooks/fleet/b-guard'), {
      recursive: true,
    })
    mkdirSync(path.join(root, '.claude/hooks/fleet/a-guard'), {
      recursive: true,
    })
    writeFileSync(path.join(root, '.git-hooks/z.test.mts'), '')
    writeFileSync(path.join(root, '.claude/hooks/fleet/b-guard/b.test.mts'), '')
    writeFileSync(path.join(root, '.claude/hooks/fleet/a-guard/a.test.mts'), '')
    const found = findCascadedTreeTests(root)
    assert.equal(found.length, 3)
    // All paths use forward slashes (normalizePath).
    for (const f of found) {
      assert.equal(f.includes('\\'), false)
    }
    // Result is sorted.
    assert.deepEqual(
      found,
      [...found].toSorted((a, b) => a.localeCompare(b)),
    )
  })

  test('ignores non-test files alongside test files', () => {
    const root = tmpDir()
    mkdirSync(path.join(root, '.claude/hooks/fleet/my-guard'), {
      recursive: true,
    })
    writeFileSync(path.join(root, '.claude/hooks/fleet/my-guard/index.mts'), '')
    writeFileSync(
      path.join(root, '.claude/hooks/fleet/my-guard/my-guard.test.mts'),
      '',
    )
    const found = findCascadedTreeTests(root)
    // Only the .test.mts file is flagged.
    assert.equal(found.length, 1)
    for (const f of found) {
      assert.match(f, /\.test\./)
    }
  })

  test('returns empty array when none of the cascaded tree directories exist', () => {
    const root = tmpDir()
    // No subdirectories created — all three tree paths are absent.
    assert.deepEqual(findCascadedTreeTests(root), [])
  })

  test('aggregates findings across all three cascaded trees', () => {
    const root = tmpDir()
    mkdirSync(path.join(root, '.claude/hooks/fleet/a-guard'), {
      recursive: true,
    })
    mkdirSync(path.join(root, '.config/fleet/oxlint-plugin/fleet/r'), {
      recursive: true,
    })
    mkdirSync(path.join(root, '.git-hooks'), { recursive: true })
    writeFileSync(path.join(root, '.claude/hooks/fleet/a-guard/a.test.mts'), '')
    writeFileSync(
      path.join(root, '.config/fleet/oxlint-plugin/fleet/r/r.test.mts'),
      '',
    )
    writeFileSync(path.join(root, '.git-hooks/hook.test.mts'), '')
    const found = findCascadedTreeTests(root)
    assert.equal(found.length, 3)
  })
})
